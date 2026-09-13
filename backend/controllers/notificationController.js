const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

exports.getUnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { isRead: false },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.update({ isRead: true }, { where: { id: id } });
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

exports.triggerExpiryEmails = async (req, res) => {
    try {
        const { medicines } = req.body;
        if (!medicines || medicines.length === 0) return res.status(200).json({ message: 'No medicines to check' });

        res.status(202).json({ message: 'Expiry alerts processing started in the background.' });

        (async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const thresholds = [180, 90, 60, 30, 0];

                const existingNotifs = await Notification.findAll({
                    where: { title: 'Medicine Expiry Alert ⚠️' }
                });

                let transporter = null;
                let emailsSentCount = 0;

                for (let m of medicines) {
                    if (!m.expiryDate) continue;

                    const exp = new Date(m.expiryDate);
                    exp.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

                    let activeThreshold = null;
                    for (let t of thresholds) {
                        if (diffDays <= t) { activeThreshold = t; } else { break; }
                    }

                    if (activeThreshold !== null) {
                        const identifier = `[${activeThreshold}-DAY ALERT] Batch ${m.batchNumber || 'N/A'} of ${m.name}`;
                        const alreadyAlerted = existingNotifs.some(n => n.message.startsWith(identifier));

                        if (!alreadyAlerted) {
                            let alertTag = ''; let alertEmoji = '';
                            if (activeThreshold === 180) { alertTag = 'Early Warning'; alertEmoji = '🟡'; }
                            else if (activeThreshold === 90) { alertTag = 'Action Required'; alertEmoji = '🟠'; }
                            else if (activeThreshold === 60 || activeThreshold === 30) { alertTag = 'Critical Warning'; alertEmoji = '🔴'; }
                            else if (activeThreshold === 0) { alertTag = 'Expired'; alertEmoji = '☠️'; }

                            const exactMessage = `${identifier} - ${alertTag} ${alertEmoji}. Current days left: ${diffDays}. Qty in stock: ${m.quantity}.`;
                            let title = `Expiry Alert: ${m.name} is in the ${activeThreshold}-day window!`;
                            if (activeThreshold === 0) title = `URGENT: ${m.name} has EXPIRED! ☠️`;

                            const newNotification = await Notification.create({
                                title: 'Medicine Expiry Alert ⚠️',
                                message: exactMessage,
                                isRead: false
                            });

                            const io = req.app.get('io');
                            if (io) {
                                io.emit('receive_notification', { ...newNotification.toJSON(), target: 'admin' });
                            }

                            if (!transporter) {
                                transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
                                });
                            }

                            const mailOptions = {
                                from: process.env.EMAIL_USER,
                                to: 'kegallepharmacy@gmail.com',
                                subject: title,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                                        <h2 style="color: #e11d48;">Medicine Expiry Warning (Ph4Life)</h2>
                                        <p>Dear Admin,</p>
                                        <p>The following medicine has entered the <b>${activeThreshold}-day</b> expiry window.</p>
                                        <div style="padding: 10px; background-color: #f8fafc; border-left: 4px solid #f43f5e; margin: 15px 0;">
                                            <strong>Status:</strong> ${alertTag} ${alertEmoji}
                                        </div>
                                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Medicine:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.name}</td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Batch No:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.batchNumber || 'N/A'}</td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Quantity:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e11d48;"><b>${m.quantity}</b></td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Expiry Date:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>${m.expiryDate}</b></td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Actual Days Left:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 16px;"><b>${diffDays} Days</b></td></tr>
                                        </table>
                                        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please take necessary actions to prevent loss or safety risks.</p>
                                    </div>
                                `
                            };
                            await transporter.sendMail(mailOptions);
                            emailsSentCount++;
                        }
                    }
                }
                console.log(`[Background Job] Expiry alerts processed successfully. Emails sent: ${emailsSentCount}`);
            } catch (backgroundError) {
                console.error("[Background Job] Email Sending Error: ", backgroundError);
            }
        })();

    } catch (error) {
        console.error("Controller Route Error: ", error);
        res.status(500).json({ error: 'Failed to initiate expiry emails check' });
    }
};

exports.triggerLowStockEmails = async (req, res) => {
    try {
        const { medicines } = req.body;
        if (!medicines || medicines.length === 0) return res.status(200).json({ message: 'No medicines to check' });

        res.status(202).json({ message: 'Low stock alerts processing started in the background.' });

        (async () => {
            try {
                const existingNotifs = await Notification.findAll({
                    where: { title: 'Low Stock Alert 📉' }
                });

                let transporter = null;
                let emailsSentCount = 0;

                for (let m of medicines) {
                    if (Number(m.quantity) <= Number(m.minStockLevel)) {
                        const identifier = `[LOW STOCK] ${m.name} (Batch: ${m.batchNumber || 'N/A'})`;
                        const alreadyAlerted = existingNotifs.some(n => n.message.includes(identifier));

                        if (!alreadyAlerted) {
                            const exactMessage = `${identifier} is running low! Only ${m.quantity} units left. (Min required: ${m.minStockLevel})`;

                            const newNotification = await Notification.create({
                                title: 'Low Stock Alert 📉',
                                message: exactMessage,
                                isRead: false
                            });

                            const io = req.app.get('io');
                            if (io) {
                                io.emit('receive_notification', { ...newNotification.toJSON(), target: 'admin' });

                                if (m.supplier) {
                                    io.emit('receive_notification', {
                                        id: `sup_low_${Date.now()}`,
                                        title: 'Low Stock Auto-Order Request 📉',
                                        message: `Kegalle Ph4Life is running low on ${m.name}. Please prepare for a new purchase order.`,
                                        type: 'warning',
                                        target: 'supplier',
                                        supplierId: m.supplier.id,
                                        time: new Date()
                                    });
                                }
                            }

                            if (!transporter) {
                                transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
                                });
                            }

                            const targetEmail = m.supplier?.email || m.supplier?.supplierEmail || 'kegallepharmacy@gmail.com';

                            const mailOptions = {
                                from: process.env.EMAIL_USER,
                                to: targetEmail,
                                subject: `Low Stock Request: New Stock Required for ${m.name}`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                                        <h2 style="color: #ea580c;">Low Stock Auto-Order Request (Ph4Life)</h2>
                                        <p>Dear ${m.supplier?.companyName || 'Supplier'},</p>
                                        <p>Our pharmacy is running low on the following medicine provided by you. Please prepare for a new stock request.</p>
                                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Medicine:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.name}</td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Current Quantity Left:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #ea580c; font-size: 16px;"><b>${m.quantity}</b></td></tr>
                                            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Minimum Threshold:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>${m.minStockLevel}</b></td></tr>
                                        </table>
                                        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">We will contact you shortly to finalize the purchase order.</p>
                                    </div>
                                `
                            };
                            await transporter.sendMail(mailOptions);
                            emailsSentCount++;
                        }
                    }
                }
                console.log(`[Background Job] Low stock alerts processed. Emails sent: ${emailsSentCount}`);
            } catch (backgroundError) {
                console.error("[Background Job] Low Stock Email Error: ", backgroundError);
            }
        })();

    } catch (error) {
        console.error("Controller Route Error: ", error);
        res.status(500).json({ error: 'Failed to initiate low stock emails check' });
    }
};

exports.triggerReturnEmails = async (req, res) => {
    try {
        const { medicine, supplier } = req.body;
        if (!medicine) return res.status(400).json({ error: "Missing medicine data" });

        res.status(202).json({ message: 'Return alerts processing in background.' });

        (async () => {
            try {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
                });

                const adminNotif = await Notification.create({
                    title: 'Stock Returned 🔄',
                    message: `Returned ${medicine.quantity} units of ${medicine.name} to ${supplier ? supplier.companyName : 'Supplier'}.`,
                    isRead: false
                });

                const io = req.app.get('io');
                if (io) {
                    io.emit('receive_notification', { ...adminNotif.toJSON(), target: 'admin' });

                    if (supplier) {
                        io.emit('receive_notification', {
                            id: `sup_ret_${Date.now()}`,
                            title: 'Debit Note & Return Notification 📦',
                            message: `Kegalle Ph4Life has returned ${medicine.quantity} units of ${medicine.name}. A Debit Note has been applied.`,
                            type: 'warning',
                            target: 'supplier',
                            supplierId: supplier.id,
                            time: new Date()
                        });
                    }
                }

                const targetEmail = supplier?.email || supplier?.supplierEmail;
                if (targetEmail) {
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: targetEmail,
                        subject: `Debit Note & Stock Return: ${medicine.name}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                                <h2 style="color: #4f46e5;">Stock Return & Debit Note (Ph4Life)</h2>
                                <p>Dear ${supplier.companyName},</p>
                                <p>We are notifying you of a stock return. A corresponding Debit Note will be applied to our account balance.</p>
                                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Medicine:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${medicine.name}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Batch No:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${medicine.batchNumber || 'N/A'}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Returned Quantity:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #4f46e5; font-size: 16px;"><b>${medicine.quantity}</b></td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Unit Cost:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">LKR ${medicine.costPrice}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Total Debit Value:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e11d48; font-size: 16px;"><b>LKR ${(medicine.quantity * medicine.costPrice).toFixed(2)}</b></td></tr>
                                </table>
                                <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please update your ledgers accordingly. Thank you for your partnership.</p>
                            </div>
                        `
                    };
                    await transporter.sendMail(mailOptions);
                }
            } catch (err) {
                console.error("[Background Job] Return Email Error: ", err);
            }
        })();
    } catch (error) {
        res.status(500).json({ error: 'Failed to process return notification' });
    }
};
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const medsToAlert = medicines.filter(m => {
            if (!m.expiryDate) return false;
            const exp = new Date(m.expiryDate);
            exp.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

            return diffDays === 90 || diffDays === 60 || diffDays === 30 || diffDays === 0;
        });

        if (medsToAlert.length > 0) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            for (let m of medsToAlert) {
                const exp = new Date(m.expiryDate);
                exp.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

                let title = `Expiry Alert: ${m.name} expiring in ${diffDays} days!`;
                if (diffDays === 0) title = `URGENT: ${m.name} expires TODAY!`;

                const newNotification = await Notification.create({
                    title: 'Medicine Expiry Alert ⚠️',
                    message: `Batch ${m.batchNumber || 'N/A'} of ${m.name} is expiring in ${diffDays} days. Qty in stock: ${m.quantity}.`,
                    isRead: false
                });

                const io = req.app.get('io');
                if (io) {
                    io.emit('receive_notification', newNotification);
                }

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: 'kegallepharmacy@gmail.com',
                    subject: title,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                            <h2 style="color: #e11d48;">Medicine Expiry Warning (Ph4Life)</h2>
                            <p>Dear Admin,</p>
                            <p>The following medicine is approaching its expiry date.</p>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Medicine:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.name}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Batch No:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.batchNumber || 'N/A'}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Quantity:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e11d48;"><b>${m.quantity}</b></td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Expiry Date:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>${m.expiryDate}</b></td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Days Left:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 16px;"><b>${diffDays} Days</b></td></tr>
                            </table>
                            <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please take necessary actions (e.g., Return to supplier or adjust stock).</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
            }
        }
        res.status(200).json({ message: 'Expiry alerts processed successfully' });
    } catch (error) {
        console.error("Email Sending Error: ", error);
        res.status(500).json({ error: 'Failed to process expiry emails' });
    }
};
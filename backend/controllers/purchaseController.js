const sequelize = require('../config/db');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseItem = require('../models/PurchaseItem');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const { enrichPurchases } = require('../services/returnAccounting');

exports.createPurchase = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            invoiceNumber, grnNumber, supplierId,
            invoiceDate, dueDate, totalAmount, paidAmount, paymentStatus, notes, items
        } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Items array is required");
        }

        const supplier = await Supplier.findByPk(supplierId, { transaction: t, lock: t.LOCK.UPDATE });

        const finalSupplierName = req.body.supplierName || (supplier ? supplier.companyName : null);
        const finalNmraLicense = req.body.nmraLicense || (supplier ? (supplier.nmraLicense || supplier.brNumber) : null);

        let processedItems = [];

        for (let item of items) {
            let actualMedicineId = item.medicineId;
            let medName = item.name || 'Unknown';
            let genName = item.genericName || '';

            if (!actualMedicineId || isNaN(actualMedicineId)) {
                const newMedicine = await Medicine.create({
                    name: item.name || item.medicineId,
                    genericName: item.genericName || '',
                    category: item.unit || 'Tablets',
                    barcode: item.barcode || '',
                    batchNumber: item.batchNumber,
                    quantity: item.quantity,
                    costPrice: item.costPrice,
                    sellingPrice: item.sellingPrice,
                    expiryDate: item.expiryDate,
                    minStockLevel: 10,
                    supplierId: supplierId,
                    isControlled: false
                }, { transaction: t });

                actualMedicineId = newMedicine.id;
                medName = newMedicine.name;
                genName = newMedicine.genericName;
            } else {
                const medicine = await Medicine.findByPk(actualMedicineId, { transaction: t });
                if (medicine) {
                    medName = medicine.name;
                    genName = medicine.genericName;
                    await medicine.update({
                        quantity: Number(medicine.quantity) + Number(item.quantity),
                        costPrice: item.costPrice,
                        sellingPrice: item.sellingPrice
                    }, { transaction: t });
                }
            }

            processedItems.push({
                ...item,
                actualMedicineId,
                medName,
                genName
            });
        }

        const primaryItem = processedItems[0];

        const invoice = await PurchaseInvoice.create({
            invoiceNumber,
            grnNumber,
            supplierId,
            supplierName: finalSupplierName,
            nmraLicense: finalNmraLicense,
            medicineId: primaryItem.actualMedicineId,
            name: primaryItem.medName,
            genericName: primaryItem.genName,
            batchNumber: primaryItem.batchNumber,
            expiryDate: primaryItem.expiryDate,
            quantity: primaryItem.quantity,
            unit: primaryItem.unit || 'Tablets',
            costPrice: primaryItem.costPrice,
            invoiceDate,
            dueDate,
            totalAmount,
            paidAmount: paidAmount || 0.00,
            paymentStatus: paymentStatus || 'Unpaid',
            notes
        }, { transaction: t });

        for (let pItem of processedItems) {
            await PurchaseItem.create({
                purchaseInvoiceId: invoice.id,
                medicineId: pItem.actualMedicineId,
                batchNumber: pItem.batchNumber,
                expiryDate: pItem.expiryDate,
                quantity: pItem.quantity,
                unit: pItem.unit || 'Tablets',
                costPrice: pItem.costPrice,
                sellingPrice: pItem.sellingPrice,
                subtotal: pItem.subtotal
            }, { transaction: t });
        }

        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) + Number(totalAmount)
            }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({ message: 'Purchase Invoice and Stock updated successfully!', invoice });

        try {
            const today = new Date();
            const due = new Date(dueDate);
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 5) {
                const dueAmount = Number(totalAmount);

                const newNotification = await Notification.create({
                    title: 'Urgent Payment Alert ⏳',
                    message: `Payment of LKR ${dueAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} is due for ${supplier ? supplier.companyName : 'Supplier'} (Invoice: ${invoiceNumber}) ${diffDays <= 0 ? 'Immediately/Overdue' : 'in ' + diffDays + ' Days'}.`,
                    isRead: false
                });

                const io = req.app.get('io');
                if (io) {
                    io.emit('receive_notification', newNotification);
                }

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: 'kegallepharmacy@gmail.com',
                    subject: `Urgent Payment Alert: LKR ${dueAmount.toLocaleString()} due for ${supplier ? supplier.companyName : 'Supplier'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                            <h2 style="color: #e11d48;">Instant Payment Alert (Kegalle Ph4Life)</h2>
                            <p>Dear Admin,</p>
                            <p>A new GRN has been recorded, and the payment for this invoice is due <strong>${diffDays <= 0 ? 'immediately (Overdue)' : 'within ' + diffDays + ' days'}</strong>.</p>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Supplier:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${supplier ? supplier.companyName : 'N/A'}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Invoice No:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoiceNumber}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Due Date:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e11d48;"><b>${dueDate}</b></td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Amount Due:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 16px;"><b>LKR ${dueAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td></tr>
                            </table>
                            <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please track this payment closely.</p>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);

                await PurchaseInvoice.update({ reminderSent: true }, { where: { id: invoice.id } });
            }

        } catch (postError) {
            console.error("Error sending instant notification/email:", postError);
        }

    } catch (error) {
        await t.rollback();
        console.error("Error creating purchase GRN:", error);

        res.status(500).json({ error: 'Failed to process purchase invoice' });
    }
};

exports.getAllPurchases = async (req, res) => {
    try {
        const purchases = await PurchaseInvoice.findAll({
            include: [
                { model: Supplier, as: 'supplier', attributes: ['id', 'companyName', 'brNumber'] },
                { model: PurchaseItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(await enrichPurchases(purchases));
    } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};

exports.getSupplierPurchases = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'Supplier' || !req.user.supplierId) {
            return res.status(403).json({ error: 'Supplier account required. Please sign in to the supplier portal again.' });
        }
        const supplierId = req.user.supplierId;

        const purchases = await PurchaseInvoice.findAll({
            where: { supplierId: supplierId },
            include: [
                { model: Supplier, as: 'supplier', attributes: ['id', 'companyName', 'brNumber'] },
                { model: PurchaseItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(await enrichPurchases(purchases));
    } catch (err) {
        console.error('Error fetching supplier purchases:', err);
        res.status(500).json({ error: 'Failed to fetch your purchase orders' });
    }
};
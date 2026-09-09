const sequelize = require('../config/db');
const { Op } = require('sequelize');
const SupplierPayment = require('../models/SupplierPayment');
const Supplier = require('../models/Supplier');
const PurchaseInvoice = require('../models/PurchaseInvoice');

exports.createPayment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { paymentNumber, supplierId, amount, paymentDate, paymentMethod, chequeNumber, chequeDate, notes, receiptImage, status } = req.body;

        const payment = await SupplierPayment.create({
            paymentNumber, supplierId, amount, paymentDate, paymentMethod, chequeNumber, chequeDate, notes, receiptImage,
            status: status || 'Pending'
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Payment recorded and sent for Supplier review!', payment });

    } catch (error) {
        await t.rollback();
        console.error("Error recording payment:", error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await SupplierPayment.findAll({
            include: [{ model: Supplier, as: 'supplier', attributes: ['companyName'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

exports.acceptPayment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const paymentId = req.params.id;
        const payment = await SupplierPayment.findByPk(paymentId, { transaction: t });

        if (!payment) {
            await t.rollback();
            return res.status(404).json({ error: 'Payment not found' });
        }
        if (payment.status === 'Accepted' || payment.status === 'Rejected') {
            await t.rollback();
            return res.status(400).json({ error: `Payment is already ${payment.status}` });
        }

        await payment.update({ status: 'Accepted' }, { transaction: t });

        const supplier = await Supplier.findByPk(payment.supplierId, { transaction: t });
        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding || 0) - Number(payment.amount)
            }, { transaction: t });
        }

        let remainingPaymentAmount = Number(payment.amount);

        const unpaidInvoices = await PurchaseInvoice.findAll({
            where: {
                supplierId: payment.supplierId,
                paymentStatus: { [Op.ne]: 'Paid' }
            },
            order: [['invoiceDate', 'ASC']],
            transaction: t
        });

        for (let invoice of unpaidInvoices) {
            if (remainingPaymentAmount <= 0) break;

            const invTotal = Number(invoice.totalAmount);
            const invPaid = Number(invoice.paidAmount || 0);
            const amountNeededForThisInvoice = invTotal - invPaid;

            let amountToApply = 0;

            if (remainingPaymentAmount >= amountNeededForThisInvoice) {
                amountToApply = amountNeededForThisInvoice;
                invoice.paymentStatus = 'Paid';
            } else {
                amountToApply = remainingPaymentAmount;
                invoice.paymentStatus = 'Partial';
            }

            invoice.paidAmount = invPaid + amountToApply;
            remainingPaymentAmount -= amountToApply;
            await invoice.save({ transaction: t });
        }

        await t.commit();
        res.status(200).json({ message: 'Payment accepted, Outstanding reduced, and Invoices auto-settled successfully!' });

    } catch (error) {
        await t.rollback();
        console.error("Error accepting payment:", error);
        res.status(500).json({ error: 'Failed to accept payment' });
    }
};

exports.rejectPayment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const paymentId = req.params.id;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            await t.rollback();
            return res.status(400).json({ error: 'Rejection reason is absolutely required.' });
        }

        const payment = await SupplierPayment.findByPk(paymentId, { transaction: t });

        if (!payment) {
            await t.rollback();
            return res.status(404).json({ error: 'Payment not found' });
        }
        if (payment.status === 'Accepted' || payment.status === 'Rejected') {
            await t.rollback();
            return res.status(400).json({ error: `Payment is already ${payment.status}` });
        }

        await payment.update({
            status: 'Rejected',
            rejectionReason: reason
        }, { transaction: t });

        await t.commit();
        res.status(200).json({ message: 'Payment rejected successfully.', payment });

    } catch (error) {
        await t.rollback();
        console.error("Error rejecting payment:", error);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
};
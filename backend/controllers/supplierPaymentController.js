const sequelize = require('../config/db');
const SupplierPayment = require('../models/SupplierPayment');
const Supplier = require('../models/Supplier');

exports.createPayment = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { paymentNumber, supplierId, amount, paymentDate, paymentMethod, chequeNumber, chequeDate, notes } = req.body;

        const payment = await SupplierPayment.create({
            paymentNumber, supplierId, amount, paymentDate, paymentMethod, chequeNumber, chequeDate, notes
        }, { transaction: t });

        const supplier = await Supplier.findByPk(supplierId, { transaction: t });
        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) - Number(amount)
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ message: 'Payment recorded successfully!', payment });

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
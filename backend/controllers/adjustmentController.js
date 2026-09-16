const sequelize = require('../config/db');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const StockAdjustment = require('../models/StockAdjustment');

exports.processStockAdjustment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { medicineId, actionType, reason } = req.body;

        const medicine = await Medicine.findByPk(medicineId, { transaction: t });
        if (!medicine) {
            await t.rollback();
            return res.status(404).json({ error: "Medicine not found" });
        }

        const qty = Number(medicine.quantity);
        const cost = Number(medicine.costPrice);
        const totalValue = qty * cost;

        const supplier = await Supplier.findByPk(medicine.supplierId, { transaction: t });

        const adjustmentStatus = actionType === 'return' ? 'Pending' : 'Completed';

        await StockAdjustment.create({
            medicineId: medicine.id,
            medicineName: medicine.name,
            batchNumber: medicine.batchNumber,
            category: medicine.category,
            supplierId: supplier ? supplier.id : null,
            supplierName: supplier ? supplier.companyName : 'Unknown',
            actionType: actionType === 'return' ? 'Return to Supplier' : 'Dispose/Write-off',
            quantity: qty,
            unitPrice: cost,
            totalValue: totalValue,
            reason: reason || (actionType === 'return' ? 'Expired/Damaged Return' : 'Expired Disposal'),
            status: adjustmentStatus
        }, { transaction: t });

        if (actionType === 'return' && supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) - totalValue
            }, { transaction: t });
        }

        await medicine.destroy({ transaction: t });

        await t.commit();
        res.status(200).json({ message: actionType === 'return' ? 'Debit Note Created!' : 'Disposed Successfully!', totalValue });
    } catch (error) {
        await t.rollback();
        console.error("Adjustment Error:", error);
        res.status(500).json({ error: "Failed to process stock adjustment" });
    }
};

exports.getAdjustmentHistory = async (req, res) => {
    try {
        const history = await StockAdjustment.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch adjustment history" });
    }
};

exports.processReplacement = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const adjustment = await StockAdjustment.findByPk(id, { transaction: t });

        if (!adjustment || adjustment.status !== 'Pending') {
            await t.rollback();
            return res.status(400).json({ error: "Invalid adjustment or already processed." });
        }

        const supplier = await Supplier.findByPk(adjustment.supplierId, { transaction: t });
        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) + Number(adjustment.totalValue)
            }, { transaction: t });
        }

        await Medicine.create({
            name: adjustment.medicineName,
            genericName: 'Replaced Stock',
            category: adjustment.category || 'Tablets',
            barcode: 'REP-' + Date.now().toString().slice(-6),
            batchNumber: adjustment.batchNumber + '-REP',
            quantity: adjustment.quantity,
            costPrice: adjustment.unitPrice,
            sellingPrice: adjustment.unitPrice,
            minStockLevel: 10,
            supplierId: adjustment.supplierId,
            isControlled: false
        }, { transaction: t });

        await adjustment.update({ status: 'Replaced' }, { transaction: t });
        await t.commit();
        res.status(200).json({ message: "Replacement GRN generated & Stock Updated!" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: "Failed to process replacement" });
    }
};

exports.processRefund = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const adjustment = await StockAdjustment.findByPk(id, { transaction: t });

        if (!adjustment || adjustment.status !== 'Pending') {
            await t.rollback();
            return res.status(400).json({ error: "Invalid adjustment or already processed." });
        }

        const supplier = await Supplier.findByPk(adjustment.supplierId, { transaction: t });
        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) + Number(adjustment.totalValue)
            }, { transaction: t });
        }

        await adjustment.update({ status: 'Refunded' }, { transaction: t });
        await t.commit();
        res.status(200).json({ message: "Cash Refund recorded! Supplier balance adjusted." });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: "Failed to process cash refund" });
    }
};
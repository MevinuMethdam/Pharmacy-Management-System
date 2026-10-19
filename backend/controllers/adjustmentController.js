const sequelize = require('../config/db');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const StockAdjustment = require('../models/StockAdjustment');
const settlement = require('./returnSettlementController');
const ReturnAccounting = require('../models/ReturnAccounting');

exports.processStockAdjustment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { medicineId, actionType, reason } = req.body;
        if (!['return', 'dispose'].includes(actionType)) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid stock adjustment action.' });
        }

        const medicine = await Medicine.findByPk(medicineId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!medicine) {
            await t.rollback();
            return res.status(404).json({ error: "Medicine not found" });
        }

        const qty = Number(medicine.quantity);
        if (!Number.isSafeInteger(qty) || qty <= 0) {
            await t.rollback();
            return res.status(409).json({ error: 'This batch has no valid stock to return or dispose.' });
        }
        const cost = Number(medicine.costPrice);
        const totalValue = qty * cost;

        const supplier = await Supplier.findByPk(medicine.supplierId, { transaction: t, lock: t.LOCK.UPDATE });

        const adjustmentStatus = actionType === 'return' ? 'Pending' : 'Completed';

        const adjustment = await StockAdjustment.create({
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

        if (actionType === 'return') {
            await ReturnAccounting.create({ adjustmentId: adjustment.id, allocations: [], applied: false }, { transaction: t });
        }

        await medicine.update({ quantity: 0 }, { transaction: t });

        await t.commit();
        res.status(200).json({
            message: actionType === 'return' ? 'Debit Note Created!' : 'Disposed Successfully!',
            totalValue
        });
    } catch (error) {
        await t.rollback();
        console.error("Adjustment Error:", error);
        res.status(500).json({ error: "Failed to process stock adjustment" });
    }
};

exports.getAdjustmentHistory = settlement.history;
exports.processReplacement = (req, res) => settlement.submit(req, res, 'replace');
exports.processRefund = (req, res) => settlement.submit(req, res, 'refund');
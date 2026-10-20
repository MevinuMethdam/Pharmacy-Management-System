const { randomUUID } = require('crypto');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const StockAdjustment = require('../models/StockAdjustment');
const ReturnSettlement = require('../models/ReturnSettlement');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const accountingService = require('../services/returnAccounting');

function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function idOf(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) fail(400, 'Invalid return ID.');
    return id;
}
function reasonOf(value) {
    const reason = typeof value === 'string' ? value.trim() : '';
    if (!reason || reason.length > 2000) fail(400, 'Enter a reason between 1 and 2000 characters.');
    return reason;
}
function imageOf(value) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.length > 7000000) fail(400, 'Image must be 5 MB or smaller.');
    const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) fail(400, 'Use a JPG, PNG or WebP image.');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 5 * 1024 * 1024 || bytes.length < 12 || bytes.toString('base64') !== match[2]) fail(400, 'Invalid image or image exceeds 5 MB.');
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) fail(400, 'Image content does not match its format.');
    return value;
}
function supplierAllowed(req, row) {
    if (!req.user?.supplierId || Number(req.user.supplierId) !== Number(row.supplierId)) fail(403, 'This return belongs to another supplier.');
}
function emitChange(req, supplierId, medicineId, stockChanged = false) {
    const io = req.app.get('io');
    if (!io) return;
    io.emit('returns_updated', { supplierId, medicineId });
    io.emit('restock_updated', { supplierId });
    io.emit('purchase_updated', { supplierId });
    if (stockChanged) io.emit('receive_notification', {
        id: `return-stock-${medicineId}-${Date.now()}`, title: 'Medicine Updated',
        message: 'Return settlement updated inventory.', target: 'admin', type: 'info', medicineId
    });
}

exports.submit = async (req, res, type) => {
    try {
        if (!['Admin', 'Pharmacist'].includes(req.user?.role)) fail(403, 'Pharmacy staff access required.');
        const adjustmentId = idOf(req.params.id);
        const reason = reasonOf(req.body.reason);
        const evidenceImage = imageOf(req.body.evidenceImage);
        const result = await sequelize.transaction(async transaction => {
            const options = { transaction, lock: transaction.LOCK.UPDATE };
            const adjustment = await StockAdjustment.findByPk(adjustmentId, options);
            if (!adjustment || adjustment.actionType !== 'Return to Supplier') fail(404, 'Supplier return not found.');
            if (adjustment.status !== 'Pending') fail(409, 'This debit note has already been settled.');
            const quantity = Number(adjustment.quantity);
            if (!Number.isSafeInteger(quantity) || quantity <= 0) fail(409, 'This return has no valid stock quantity.');
            const supplier = await Supplier.findByPk(adjustment.supplierId, options);
            if (!supplier || supplier.status === 'Inactive') fail(409, 'Supplier is unavailable or inactive.');
            let review = await ReturnSettlement.findOne({ where: { adjustmentId }, ...options });
            if (review?.status === 'Reviewing') {
                if (review.type !== type || review.reason !== reason || (review.evidenceImage || null) !== evidenceImage) fail(409, 'A request is already under supplier review.');
                return { review, medicineId: adjustment.medicineId, alreadySubmitted: true };
            }
            if (review && review.status !== 'Rejected') fail(409, 'This request has already been processed.');
            const accounting = await accountingService.ensureDeferred(adjustment, supplier, transaction);
            if (type === 'refund') {
                const plan = await accountingService.planRefund(adjustment, req.body.refundAllocations, transaction);
                await accounting.update({ allocations: plan.allocations }, { transaction });
            } else await accounting.update({ allocations: [] }, { transaction });
            const data = { adjustmentId, supplierId: supplier.id, type, reason, evidenceImage, requestToken: randomUUID(), status: 'Reviewing', rejectReason: null, reviewedAt: null };
            if (review) await review.update(data, { transaction });
            else review = await ReturnSettlement.create(data, { transaction });
            await Notification.create({
                title: `[SUP:${supplier.id}] ${type === 'replace' ? 'Returned Stock Replacement' : 'Cash Refund Review'}`,
                message: `Debit note #${adjustment.id} for ${adjustment.medicineName} is ready for review in ${type === 'replace' ? 'Stock Requests' : 'Returns (Debit Notes)'}.`,
                isRead: false
            }, { transaction });
            return { review, medicineId: adjustment.medicineId };
        });
        if (!result.alreadySubmitted) emitChange(req, result.review.supplierId, result.medicineId);
        res.status(200).json({ message: 'Submitted for supplier review.', reviewStatus: 'Reviewing', settlementId: result.review.id });
    } catch (error) {
        console.error('Return submission failed:', error.message);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to submit return request.' });
    }
};

exports.decide = async (req, res) => {
    try {
        if (req.user?.role !== 'Supplier' || !req.user?.supplierId) fail(403, 'Supplier account required.');
        const adjustmentId = idOf(req.params.id);
        const action = req.params.action;
        if (!['accept', 'reject'].includes(action)) fail(400, 'Invalid review action.');
        const status = action === 'accept' ? 'Accepted' : 'Rejected';
        const rejectReason = action === 'reject' ? reasonOf(req.body.reason) : null;
        const result = await sequelize.transaction(async transaction => {
            const options = { transaction, lock: transaction.LOCK.UPDATE };

            const adjustment = await StockAdjustment.findByPk(adjustmentId, options);
            if (!adjustment || adjustment.actionType !== 'Return to Supplier') fail(404, 'Supplier return not found.');
            supplierAllowed(req, adjustment);
            const supplier = await Supplier.findByPk(adjustment.supplierId, options);
            if (!supplier || supplier.status === 'Inactive') fail(403, 'Supplier account is unavailable or inactive.');
            const review = await ReturnSettlement.findOne({ where: { adjustmentId }, ...options });
            if (!review) fail(409, 'The admin has not submitted a settlement request.');
            supplierAllowed(req, review);

            if (String(req.body.reviewVersion || '') !== review.requestToken) fail(409, 'This request changed. Refresh and review the latest details.');
            if (review.status === status) return { alreadyProcessed: true, medicineId: adjustment.medicineId, supplierId: supplier.id, status };
            if (review.status !== 'Reviewing' || adjustment.status !== 'Pending') fail(409, 'This request has already been processed.');
            const accounting = await accountingService.ensureDeferred(adjustment, supplier, transaction);
            if (action === 'accept') {
                if (review.type === 'replace') {
                    const medicine = await Medicine.findByPk(adjustment.medicineId, options);
                    if (!medicine || Number(medicine.supplierId) !== Number(supplier.id) || medicine.batchNumber !== adjustment.batchNumber) fail(409, 'The original medicine batch is unavailable or has changed.');
                    const returned = Number(adjustment.quantity);
                    const current = Number(medicine.quantity);
                    const quantity = current + returned;
                    if (!Number.isSafeInteger(returned) || returned <= 0 || !Number.isFinite(current) || current < 0 || !Number.isFinite(quantity) || quantity > 99999999.99) fail(409, 'Invalid stock quantity.');
                    await medicine.update({ quantity, rejectionReason: null }, { transaction });
                } else if (review.type !== 'refund') fail(409, 'Invalid settlement type.');

                if (review.type === 'refund') await accountingService.applyRefund(adjustment, supplier, accounting, transaction);
                await adjustment.update({ status: review.type === 'replace' ? 'Replaced' : 'Refunded' }, { transaction });
            }
            await review.update({ status, rejectReason, reviewedAt: new Date() }, { transaction });
            return { medicineId: adjustment.medicineId, supplierId: supplier.id, status, stockChanged: action === 'accept' };
        });
        if (!result.alreadyProcessed) emitChange(req, result.supplierId, result.medicineId, result.stockChanged);
        res.json({ message: result.alreadyProcessed ? 'Already processed.' : `Return ${status.toLowerCase()}.`, ...result });
    } catch (error) {
        console.error('Return review failed:', error.message);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to process return review.' });
    }
};

exports.history = async (req, res) => {
    try {
        if (req.user?.role === 'Supplier' && !req.user.supplierId) fail(403, 'Supplier account required.');
        const where = req.user?.supplierId ? { supplierId: req.user.supplierId, actionType: 'Return to Supplier' } : {};
        const rows = await StockAdjustment.findAll({ where, order: [['createdAt', 'DESC']] });
        const reviews = rows.length ? await ReturnSettlement.findAll({
            where: { adjustmentId: { [Op.in]: rows.map(row => row.id) } },
            attributes: { exclude: ['evidenceImage'] }
        }) : [];
        const byId = new Map(reviews.map(row => [Number(row.adjustmentId), row]));

        const evidenceIds = rows.length ? await ReturnSettlement.findAll({
            where: { adjustmentId: { [Op.in]: rows.map(row => row.id) }, evidenceImage: { [Op.ne]: null } },
            attributes: ['adjustmentId']
        }) : [];
        const withEvidence = new Set(evidenceIds.map(row => Number(row.adjustmentId)));
        res.json(rows.map(row => {
            const review = byId.get(Number(row.id));
            return { ...row.toJSON(), ...(review ? {
                    settlementId: review.id, settlementType: review.type, reviewStatus: review.status,
                    settlementReason: review.reason, rejectionReason: review.rejectReason,
                    reviewVersion: review.requestToken,
                    hasEvidence: withEvidence.has(Number(row.id))
                } : {}) };
        }));
    } catch (error) {
        console.error('Return history failed:', error.message);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to fetch adjustment history.' });
    }
};

exports.evidence = async (req, res) => {
    try {
        const review = await ReturnSettlement.findOne({ where: { adjustmentId: idOf(req.params.id) } });
        if (!review) fail(404, 'Review not found.');
        if (!['Admin', 'Pharmacist'].includes(req.user?.role)) supplierAllowed(req, review);
        if (!review.evidenceImage) fail(404, 'No image attached.');
        res.set('Cache-Control', 'no-store');
        res.json({ image: review.evidenceImage });
    } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to load image.' }); }
};
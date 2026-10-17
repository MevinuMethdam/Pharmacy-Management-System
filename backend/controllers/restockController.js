const sequelize = require('../config/db');
const { Op } = require('sequelize');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseItem = require('../models/PurchaseItem');
const Notification = require('../models/Notification');
const RestockRequest = require('../models/RestockRequest');

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function positiveInteger(value, label) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) fail(400, `${label} must be a positive whole number.`);
    return number;
}

function cents(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) fail(409, 'Invalid amount in database.');
    const result = Math.round((number + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(result)) fail(409, 'Amount is too large.');
    return result;
}

function notificationData(notification, request) {
    return {
        ...notification.toJSON(),
        title: notification.title.replace(/^\[SUP:\d+\]\s*/, ''),
        target: 'supplier', type: 'info', supplierId: request.supplierId,
        restockId: request.id, medicineId: request.medicineId,
        purchaseInvoiceId: request.purchaseInvoiceId, purchaseItemId: request.purchaseItemId,
        requestedQuantity: request.requestedQuantity,
        status: request.status, rejectReason: request.rejectReason
    };
}

exports.prepareRequest = async (body) => sequelize.transaction(async (transaction) => {
    const medicineId = positiveInteger(body.medicine?.id, 'Medicine ID');
    const itemId = positiveInteger(body.purchaseItemId, 'Purchase item ID');
    const quantity = positiveInteger(body.medicine?.quantity, 'Requested quantity');
    const options = { transaction };
    const medicine = await Medicine.findByPk(medicineId, options);
    const item = await PurchaseItem.findByPk(itemId, options);
    if (!medicine || !item) fail(404, 'Medicine or purchase item not found.');
    const invoice = await PurchaseInvoice.findByPk(item.purchaseInvoiceId, options);
    if (!invoice || Number(item.medicineId) !== medicineId || item.batchNumber !== medicine.batchNumber) {
        fail(400, 'Selected invoice item does not belong to this medicine and batch.');
    }
    if (medicine.supplierId && Number(invoice.supplierId) !== Number(medicine.supplierId)) {
        fail(400, 'Selected invoice belongs to a different supplier.');
    }
    const supplier = await Supplier.findByPk(invoice.supplierId, options);
    if (!supplier || supplier.status === 'Inactive') fail(400, 'Supplier is unavailable or inactive.');
    const notification = await Notification.create({
        title: `[SUP:${supplier.id}] Stock Refill Request 📦`,
        message: `Kegalle Ph4Life has requested a stock refill for ${medicine.name} (Batch: ${medicine.batchNumber}). Quantity Needed: ${quantity}. Invoice: ${invoice.invoiceNumber}`,
        isRead: false
    }, { transaction });
    const request = await RestockRequest.create({
        notificationId: notification.id, medicineId, supplierId: supplier.id,
        purchaseInvoiceId: invoice.id, purchaseItemId: item.id, requestedQuantity: quantity
    }, { transaction });
    return {
        medicine: { ...medicine.toJSON(), quantity }, supplier: supplier.toJSON(),
        supplierNotification: notificationData(notification, request)
    };
});

exports.listRequests = async (req, res) => {
    try {
        if (!req.user?.supplierId) fail(403, 'Supplier account required.');
        const requests = await RestockRequest.findAll({
            where: { supplierId: req.user.supplierId }, order: [['createdAt', 'DESC']]
        });
        if (!requests.length) return res.json([]);
        const notifications = await Notification.findAll({
            where: { id: { [Op.in]: requests.map(request => request.notificationId) } }
        });
        const byId = new Map(notifications.map(notification => [Number(notification.id), notification]));
        res.json(requests.flatMap(request => {
            const notification = byId.get(Number(request.notificationId));
            return notification ? [notificationData(notification, request)] : [];
        }));
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

async function decide(req, res, status) {
    try {
        if (!req.user?.supplierId) fail(403, 'Supplier account required.');
        const requestId = positiveInteger(req.params.id, 'Request ID');
        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
        if (status === 'Rejected' && !reason) fail(400, 'Please enter a rejection reason.');
        const result = await sequelize.transaction(async (transaction) => {
            const options = { transaction, lock: transaction.LOCK.UPDATE };
            const request = await RestockRequest.findByPk(requestId, options);
            if (!request) fail(404, 'Restock request not found.');
            if (Number(request.supplierId) !== Number(req.user.supplierId)) fail(403, 'This request belongs to another supplier.');
            if (request.status === status) return { alreadyProcessed: true, status };
            if (request.status !== 'Pending') fail(409, `Request is already ${request.status.toLowerCase()}.`);
            const supplier = await Supplier.findByPk(request.supplierId, options);
            if (!supplier || supplier.status === 'Inactive') fail(403, 'Supplier account is unavailable or inactive.');
            const medicine = await Medicine.findByPk(request.medicineId, options);
            if (!medicine) fail(404, 'Medicine not found.');
            if (medicine.supplierId && Number(medicine.supplierId) !== Number(request.supplierId)) fail(409, 'Medicine supplier has changed. Create a new request.');

            let invoiceId = null;
            if (status === 'Accepted') {
                const invoice = await PurchaseInvoice.findByPk(request.purchaseInvoiceId, options);
                const item = await PurchaseItem.findByPk(request.purchaseItemId, options);
                if (!invoice || !item || Number(invoice.supplierId) !== Number(request.supplierId) ||
                    Number(item.purchaseInvoiceId) !== Number(invoice.id) ||
                    Number(item.medicineId) !== Number(medicine.id) || item.batchNumber !== medicine.batchNumber) {
                    fail(409, 'The selected invoice item has changed. Create a new request.');
                }
                const quantity = Number(medicine.quantity) + positiveInteger(request.requestedQuantity, 'Requested quantity');
                if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 99999999) {
                    fail(409, 'Updated quantity must fit the whole-number purchase item quantity.');
                }
                const cost = cents(medicine.costPrice);
                if (cost > 9999999999) fail(409, 'Cost price is outside the supported range.');
                const subtotal = quantity * cost;
                const oldTotal = cents(invoice.totalAmount);
                const delta = subtotal - cents(item.subtotal);
                const total = oldTotal + delta;
                if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total) ||
                    subtotal > 999999999999 || total < 0 || total > 999999999999) {
                    fail(409, 'Calculated invoice amount is outside the supported range.');
                }
                await medicine.update({ quantity, rejectionReason: null }, { transaction });
                await item.update({ quantity, costPrice: (cost / 100).toFixed(2), subtotal: (subtotal / 100).toFixed(2) }, { transaction });
                const paid = cents(invoice.paidAmount);
                const invoiceChanges = {
                    totalAmount: (total / 100).toFixed(2),
                    paymentStatus: paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid'
                };
                const primaryItem = await PurchaseItem.findOne({
                    where: { purchaseInvoiceId: invoice.id }, order: [['id', 'ASC']], transaction
                });
                if (primaryItem && Number(primaryItem.id) === Number(item.id) && Number(invoice.medicineId) === Number(medicine.id)) {
                    invoiceChanges.quantity = quantity;
                    invoiceChanges.costPrice = (cost / 100).toFixed(2);
                }
                await invoice.update(invoiceChanges, { transaction });
                const outstanding = Number(supplier.totalOutstanding);
                if (!Number.isFinite(outstanding)) fail(409, 'Invalid supplier outstanding balance.');
                await supplier.update({ totalOutstanding: ((Math.round(outstanding * 100) + delta) / 100).toFixed(2) }, { transaction });
                invoiceId = invoice.id;
            } else {
                await medicine.update({ rejectionReason: reason }, { transaction });
            }
            await request.update({ status, rejectReason: status === 'Rejected' ? reason : null }, { transaction });
            await Notification.update({ isRead: true }, { where: { id: request.notificationId }, transaction });
            return { status, medicineId: medicine.id, invoiceId };
        });
        if (!result.alreadyProcessed) {
            const io = req.app.get('io');
            if (io) {
                io.emit('receive_notification', {
                    id: `restock-${requestId}-${status}`, title: 'Medicine Updated', type: 'info',
                    message: `Restock request ${status.toLowerCase()}.`, target: 'admin', time: new Date()
                });
                if (result.invoiceId) io.emit('purchase_updated', { invoiceId: result.invoiceId });
                io.emit('restock_updated', { supplierId: req.user.supplierId });
            }
        }
        res.json({ message: result.alreadyProcessed ? 'Request already processed.' : `Request ${status.toLowerCase()}.`, ...result });
    } catch (error) {
        console.error('Restock decision failed:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
}

exports.acceptRequest = (req, res) => decide(req, res, 'Accepted');
exports.rejectRequest = (req, res) => decide(req, res, 'Rejected');

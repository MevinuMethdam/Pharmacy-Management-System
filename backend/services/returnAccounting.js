const { Op } = require('sequelize');
const ReturnAccounting = require('../models/ReturnAccounting');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseItem = require('../models/PurchaseItem');

function fail(message) { const error = new Error(message); error.status = 409; throw error; }
function cents(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) fail('Invalid accounting amount.');
    const result = Math.round(number * 100);
    if (!Number.isSafeInteger(result)) fail('Accounting amount is outside the supported range.');
    return result;
}
const money = value => (value / 100).toFixed(2);

async function ensureDeferred(adjustment, supplier, transaction) {
    let record = await ReturnAccounting.findByPk(adjustment.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!record) {
        if (adjustment.status !== 'Pending') fail('Only pending debit notes can be converted.');
        await supplier.update({ totalOutstanding: money(cents(supplier.totalOutstanding) + cents(adjustment.totalValue)) }, { transaction });
        record = await ReturnAccounting.create({ adjustmentId: adjustment.id, allocations: [], applied: false }, { transaction });
    }
    return record;
}

async function planRefund(adjustment, supplied, transaction) {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const invoices = await PurchaseInvoice.findAll({
        where: { supplierId: adjustment.supplierId, createdAt: { [Op.lte]: adjustment.createdAt } },
        order: [['id', 'ASC']], ...options
    });
    const byId = new Map(invoices.map(invoice => [Number(invoice.id), invoice]));
    const items = invoices.length ? await PurchaseItem.findAll({
        where: { purchaseInvoiceId: { [Op.in]: invoices.map(invoice => invoice.id) },
            medicineId: adjustment.medicineId, batchNumber: adjustment.batchNumber },
        order: [['id', 'ASC']], ...options
    }) : [];
    const candidates = items.filter(item => Number(item.quantity) > 0 && cents(item.costPrice) === cents(adjustment.unitPrice));
    let requested = supplied;
    if (!Array.isArray(requested) || !requested.length) {
        if (candidates.length !== 1) fail('Select the invoice quantities in the refund request. Multiple or missing matching GRN items cannot be guessed.');
        requested = [{ purchaseItemId: candidates[0].id, quantity: Number(adjustment.quantity) }];
    }
    const seen = new Set();
    const totals = new Map();
    const allocations = requested.map(selection => {
        const item = candidates.find(candidate => Number(candidate.id) === Number(selection.purchaseItemId));
        const quantity = Number(selection.quantity);
        if (!item || seen.has(Number(item.id)) || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > Number(item.quantity)) {
            fail('Refund quantities no longer match the selected medicine batch. Refresh and submit again.');
        }
        seen.add(Number(item.id));
        const amount = quantity * cents(adjustment.unitPrice);
        if (!Number.isSafeInteger(amount) || amount > cents(item.subtotal)) fail('Refund exceeds the selected GRN item value.');
        const invoiceId = Number(item.purchaseInvoiceId);
        totals.set(invoiceId, (totals.get(invoiceId) || 0) + amount);
        return { purchaseItemId: Number(item.id), purchaseInvoiceId: invoiceId, quantity, amount: money(amount),
            medicineName: adjustment.medicineName, batchNumber: adjustment.batchNumber };
    });
    if (allocations.reduce((sum, row) => sum + row.quantity, 0) !== Number(adjustment.quantity) ||
        allocations.reduce((sum, row) => sum + cents(row.amount), 0) !== cents(adjustment.totalValue)) {
        fail('Selected invoice quantities must equal the full debit note quantity and value.');
    }
    for (const [invoiceId, amount] of totals) {
        if (amount > cents(byId.get(invoiceId).totalAmount)) fail('Refund exceeds the remaining invoice value.');
    }
    return { allocations, items, byId, totals };
}

async function applyRefund(adjustment, supplier, accounting, transaction) {
    if (accounting.applied) fail('Refund accounting has already been applied.');
    const plan = await planRefund(adjustment, accounting.allocations, transaction);
    for (const allocation of plan.allocations) {
        const item = plan.items.find(candidate => Number(candidate.id) === allocation.purchaseItemId);
        await item.update({ quantity: Number(item.quantity) - allocation.quantity,
            subtotal: money(cents(item.subtotal) - cents(allocation.amount)) }, { transaction });
    }
    for (const [invoiceId, amount] of plan.totals) {
        const invoice = plan.byId.get(invoiceId);
        const total = cents(invoice.totalAmount) - amount;
        const paid = cents(invoice.paidAmount);
        const changes = { totalAmount: money(total), paymentStatus: paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid' };
        const first = await PurchaseItem.findOne({ where: { purchaseInvoiceId: invoiceId }, order: [['id', 'ASC']], transaction });
        if (first && Number(first.medicineId) === Number(invoice.medicineId)) changes.quantity = Number(first.quantity);
        await invoice.update(changes, { transaction });
    }
    await supplier.update({ totalOutstanding: money(cents(supplier.totalOutstanding) - cents(adjustment.totalValue)) }, { transaction });
    await accounting.update({ allocations: plan.allocations, applied: true }, { transaction });
}

async function enrichPurchases(purchases) {
    if (!purchases.length) return [];
    const records = await ReturnAccounting.findAll({ where: { applied: true }, attributes: ['allocations'] });
    const refunds = new Map();
    for (const record of records) for (const allocation of record.allocations || []) {
        const key = Number(allocation.purchaseItemId);
        const entry = refunds.get(key) || { quantity: 0, amount: 0 };
        entry.quantity += Number(allocation.quantity);
        entry.amount += cents(allocation.amount);
        refunds.set(key, entry);
    }
    return purchases.map(purchase => {
        const row = purchase.toJSON();
        row.items = (row.items || []).map(item => {
            const refund = refunds.get(Number(item.id));
            return { ...item, refundedQuantity: refund?.quantity || 0, refundedAmount: money(refund?.amount || 0),
                ...(refund ? { refundStatus: 'Refunded' } : {}) };
        });
        row.refundedAmount = money(row.items.reduce((sum, item) => sum + cents(item.refundedAmount), 0));
        row.hasRefund = row.items.some(item => item.refundedQuantity > 0);
        return row;
    });
}

module.exports = { ensureDeferred, planRefund, applyRefund, enrichPurchases };

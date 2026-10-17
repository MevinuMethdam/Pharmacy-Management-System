const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/db');
const SaleItem = require('../models/SaleItem');
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Medicine = require('../models/Medicine');
const StockAdjustment = require('../models/StockAdjustment');
const Setup = require('../models/ReportCashSetup');
const Entry = require('../models/ReportCashEntry');
const { CATEGORIES, cents, decimal, validDate, today, localDate, cashStatement } = require('../utils/reportMath');
const plain = row => row?.get ? row.get({ plain: true }) : row;
const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
function handleError(res, error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'That reference, request, opening balance or reversal already exists. Refresh before retrying.' });
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Reports operation failed:', error.name);
    return res.status(500).json({ error: 'Report data could not be verified or loaded. No estimated totals are shown.' });
}
function notify(req) {

    req.app.get('io')?.emit('reports_updated', { changed: true });
}
function requireEntry(body) {
    if (!validDate(body.entryDate) || body.entryDate > today()) fail('Enter a valid settlement date, no later than today.');
    if (!Object.prototype.hasOwnProperty.call(CATEGORIES, body.category)) fail('Select a valid cash-flow category.');
    if (typeof body.amount !== 'string' || !/^\d{1,12}(\.\d{1,2})?$/.test(body.amount) || cents(body.amount) <= 0n) fail('Amount must be positive, with up to two decimal places.');
    if (!text(body.reference, 120) || !text(body.description, 500) || !text(body.requestId, 80)) fail('Reference, description and request ID are required.');
    if (body.confirmed !== true) fail('Confirm the actual settled cash amount first.');
}
exports.setOpening = async (req, res) => {
    try {
        const b = req.body || {};
        if (!validDate(b.openingDate) || b.openingDate > today()) fail('Select a valid opening date, no later than today.');
        if (typeof b.openingAmount !== 'string' || !/^\d{1,12}(\.\d{1,2})?$/.test(b.openingAmount)) fail('Enter a non-negative opening balance with up to two decimal places.');
        if (!text(b.evidence, 500) || b.confirmed !== true) fail('Confirm the reconciled opening balance and add its evidence/reference.');
        const row = await Setup.create({ id: 1, openingDate: b.openingDate, openingAmount: decimal(cents(b.openingAmount)), evidence: b.evidence.trim(), createdBy: req.user.userId });
        notify(req); return res.status(201).json(plain(row));
    } catch (e) { return handleError(res, e); }
};
exports.createEntry = async (req, res) => {
    try {
        const b = req.body || {}; requireEntry(b);
        const row = await sequelize.transaction(async transaction => {
            const setup = await Setup.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
            if (!setup) fail('Record the reconciled opening balance first.');
            if (b.entryDate < setup.openingDate) fail('Settlement date cannot precede the opening balance date.');
            return Entry.create({ requestId: b.requestId.trim(), entryDate: b.entryDate, category: b.category,
                amount: decimal(cents(b.amount)), reference: b.reference.trim(), description: b.description.trim(), createdBy: req.user.userId }, { transaction });
        });
        notify(req); return res.status(201).json(plain(row));
    } catch (e) { return handleError(res, e); }
};
exports.reverseEntry = async (req, res) => {
    try {
        if (!/^\d+$/.test(req.params.id) || !text(req.body?.reason, 350) || req.body?.confirmed !== true) fail('Confirm the correction and enter a reason.');
        const row = await sequelize.transaction(async transaction => {
            await Setup.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
            const original = await Entry.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!original || original.reversalOf) fail('Only an original entry can be reversed.', 404);
            if (await Entry.findOne({ where: { reversalOf: original.id }, transaction })) fail('This entry is already reversed.', 409);

            return Entry.create({ requestId: `reversal:${original.id}`, entryDate: original.entryDate,
                category: original.category, amount: original.amount, reference: `REV-${original.id}`,
                description: `Correction of ${original.reference}: ${req.body.reason.trim()}`,
                createdBy: req.user.userId, reversalOf: original.id }, { transaction });
        });
        notify(req); return res.status(201).json(plain(row));
    } catch (e) { return handleError(res, e); }
};
exports.snapshot = async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!validDate(start) || !validDate(end) || start > end || end > today()) fail('Choose a valid date range ending no later than today.');
        if ((Date.parse(end) - Date.parse(start)) / 86400000 > 731) fail('Select a period of at most two years.');
        const result = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
            const setup = plain(await Setup.findByPk(1, { transaction }));
            const entries = (await Entry.findAll({ where: { entryDate: { [Op.lte]: end } }, order: [['entryDate', 'ASC'], ['id', 'ASC']], transaction })).map(plain);
            const from = new Date(`${start}T00:00:00+05:30`);
            const until = new Date(new Date(`${end}T00:00:00+05:30`).getTime() + 86400000);
            const items = await SaleItem.findAll({ where: { createdAt: { [Op.gte]: from, [Op.lt]: until } }, raw: true, transaction });
            const payments = await SupplierPayment.findAll({ attributes: ['id', 'paymentNumber', 'supplierId', 'amount', 'paymentDate', 'paymentMethod', 'status'], where: { paymentDate: { [Op.between]: [start, end] } }, raw: true, transaction });

            const invoices = await PurchaseInvoice.findAll({ attributes: ['id', 'invoiceNumber', 'supplierId', 'supplierName', 'invoiceDate', 'dueDate', 'totalAmount', 'paidAmount', 'paymentStatus'], raw: true, transaction });
            const suppliers = await Supplier.findAll({ attributes: ['id', 'companyName', 'totalOutstanding'], raw: true, transaction });
            const medicines = await Medicine.findAll({ attributes: ['id', 'name', 'batchNumber', 'quantity', 'costPrice', 'expiryDate'], raw: true, transaction });
            const adjustments = await StockAdjustment.findAll({
                attributes: ['id', 'medicineName', 'batchNumber', 'supplierName', 'actionType', 'quantity', 'unitPrice', 'totalValue', 'status', 'reason', 'createdAt', 'updatedAt'],
                where: { createdAt: { [Op.gte]: from, [Op.lt]: until } },
                order: [['createdAt', 'ASC'], ['id', 'ASC']], raw: true, transaction
            });
            const issues = [];
            const grouped = new Map();
            let completed = 0n, voided = 0n, otherSales = 0n;
            for (const item of items) {
                const amount = cents(item.lineTotal);
                const key = String(item.saleId);
                const row = grouped.get(key) || { saleId: item.saleId, date: localDate(item.createdAt), status: item.status, paymentMethod: item.paymentMethod, amount: 0n, inconsistent: false };
                if (row.status !== item.status || row.paymentMethod !== item.paymentMethod || row.date !== localDate(item.createdAt)) row.inconsistent = true;
                row.amount += amount; grouped.set(key, row);
                if (item.status === 'Completed') completed += amount;
                else if (item.status === 'Voided') voided += amount;
                else otherSales += amount;
            }
            const sales = [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date) || Number(a.saleId) - Number(b.saleId)).map(row => ({ ...row, amount: decimal(row.amount) }));
            if (sales.some(row => row.inconsistent)) issues.push('Some sales have inconsistent line statuses, dates or payment methods. Inspect those references before using totals.');
            let invoiceTotal = 0n, applied = 0n, outstanding = 0n, credits = 0n;
            const balances = new Map();
            const payableRows = invoices.map(i => {
                const total = cents(i.totalAmount), paid = cents(i.paidAmount), balance = total - paid;
                invoiceTotal += total; applied += paid;
                if (balance > 0n) outstanding += balance; else credits -= balance;
                balances.set(String(i.supplierId), (balances.get(String(i.supplierId)) || 0n) + balance);
                const days = validDate(i.dueDate) ? Math.max(0, Math.floor((Date.parse(today()) - Date.parse(i.dueDate)) / 86400000)) : null;
                return { ...i, totalAmount: decimal(total), paidAmount: decimal(paid), balance: decimal(balance), overdueDays: days,
                    bucket: days === null ? 'Unknown due date' : days === 0 ? 'Current / due today' : days <= 30 ? '1–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : 'Over 90 days' };
            });
            const supplierIds = new Set(suppliers.map(s => String(s.id)));
            if ([...balances.keys()].some(id => !supplierIds.has(id))) issues.push('Some invoices refer to missing suppliers. Review those invoices before relying on supplier reconciliation.');
            const reconciliation = suppliers.map(s => {
                const recorded = cents(s.totalOutstanding), invoiceBalance = balances.get(String(s.id)) || 0n;
                return { supplierId: s.id, supplier: s.companyName, supplierBalance: decimal(recorded), invoiceBalance: decimal(invoiceBalance), difference: decimal(recorded - invoiceBalance) };
            });
            if (reconciliation.some(r => r.difference !== '0.00')) issues.push('Supplier master balances differ from invoice balances. Returns, credits or allocations require reconciliation; neither is presented as a verified liability.');
            let stockTotal = 0n;
            const stockRows = medicines.map(m => {
                const quantity = Number(m.quantity), cost = Number(m.costPrice);
                if (m.quantity == null || m.costPrice == null || !Number.isFinite(quantity) || !Number.isFinite(cost) || quantity < 0 || cost < 0) throw new Error('Invalid stock data');

                const extension = quantity * cost;
                if (!Number.isFinite(extension) || extension > 1e12) throw new Error('Stock value out of range');
                const value = cents(extension.toFixed(2)); stockTotal += value;
                return { ...m, value: decimal(value), expired: validDate(m.expiryDate) && m.expiryDate < today() };
            });
            const cash = cashStatement(setup, entries, start, end);
            if (!cash.available) issues.push('Cash-flow opening/closing balances are unavailable: set an opening balance on or before the selected start date.');
            if (cash.closing && cents(cash.closing) < 0n) issues.push('The recorded cash ledger closes below zero. Reconcile missing receipts/payments and overdraft classification.');
            const paymentRows = payments.map(p => ({ ...p, amount: decimal(cents(p.amount)) }));
            const reversedIds = new Set(entries.filter(e => e.reversalOf).map(e => e.reversalOf));
            cash.entries = cash.entries.map(e => ({ ...e, reversed: reversedIds.has(e.id) }));
            return { company: 'Kegalle Ph4Life', preparedBy: req.reportUser?.name || 'Administrator', generatedAt: new Date().toISOString(), timezone: 'Asia/Colombo', currency: 'LKR', start, end, asOf: today(),
                categories: CATEGORIES, setup, cash, issues,
                sales: { rows: sales, completed: decimal(completed), voided: decimal(voided), other: decimal(otherSales) },
                payments: paymentRows.sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)) || a.id - b.id),
                adjustments: adjustments.map(a => ({ ...a, unitPrice: decimal(cents(a.unitPrice)), totalValue: decimal(cents(a.totalValue)) })),
                payables: { rows: payableRows, reconciliation, invoiceTotal: decimal(invoiceTotal), applied: decimal(applied), outstanding: decimal(outstanding), credits: decimal(credits) },
                inventory: { rows: stockRows, total: decimal(stockTotal) },
                basis: [
                    'Management reports — not a complete set of IFRS/SLFRS financial statements and not audited.',
                    'Cash flow uses only administrator-confirmed, settled cash/bank movements in the report cashbook. Sales and supplier-payment records are NOT automatically treated as cash.',
                    'Opening balance is the reconciled cash and qualifying cash equivalents at the START of the opening date. Do not include movements on that date in the opening amount.',
                    'Exclude transfers within the included cash/bank pool. Record actual card proceeds only on settlement, and cheques only when cleared. Record gross receipts and related fees separately where supported by evidence.',
                    'Record all expenses, taxes, asset purchases/disposals, financing and other cash movements. A zero cashbook category means no recorded entries, not proof of no business activity. Bank/cash reconciliation is required.',
                    'Cash-flow layout follows operating, investing and financing sections of IAS 7 (direct method). Comparative periods, cash-component disclosures, foreign-exchange effects, non-cash disclosures and completeness review are not implemented.',
                    'Sales totals are stored line totals at current status, not verified receipts, net revenue or profit. Loyalty reductions, VAT breakdown and historical cost of goods sold are not reliably stored.',
                    'Supplier outstanding and inventory are CURRENT snapshots, regardless of the selected sales/cash-flow period. Historical balances cannot be reconstructed from current mutable records.',
                    'Inventory value is quantity × current recorded cost, rounded per medicine. It is not an IAS 2 carrying value: historical costing and net realisable value write-downs are unavailable.',
                    'Stock adjustment dates are creation dates; statuses are current. Refund settlement dates and invoice-level credit allocations are not stored by the supplied adjustment workflow.',
                    'Cashbook corrections retain the original entry and add a reversal on its original effective date. Previously exported periods may therefore be restated; generation timestamps identify snapshots.'
                ] };
        });
        res.set('Cache-Control', 'no-store'); return res.json(result);
    } catch (e) { return handleError(res, e); }
};

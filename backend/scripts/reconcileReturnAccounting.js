require('dotenv').config();
const sequelize = require('../config/db');
const StockAdjustment = require('../models/StockAdjustment');
const Supplier = require('../models/Supplier');
const ReturnAccounting = require('../models/ReturnAccounting');
const service = require('../services/returnAccounting');

async function main() {
    const apply = process.argv.includes('--apply');
    const repair = process.argv.includes('--repair-legacy-refunds');
    const mappingArg = process.argv.find(arg => arg.startsWith('--allocations='));
    const mappings = mappingArg ? JSON.parse(require('fs').readFileSync(mappingArg.slice('--allocations='.length), 'utf8')) : {};
    await ReturnAccounting.sync();
    const rows = await StockAdjustment.findAll({ where: { actionType: 'Return to Supplier' }, order: [['id', 'ASC']] });
    let blocked = 0;
    for (const snapshot of rows) {
        if (!['Pending', 'Refunded'].includes(snapshot.status)) continue;
        try {
            await sequelize.transaction(async transaction => {
                const options = { transaction, lock: transaction.LOCK.UPDATE };
                const adjustment = await StockAdjustment.findByPk(snapshot.id, options);
                const supplier = await Supplier.findByPk(adjustment.supplierId, options);
                const existing = await ReturnAccounting.findByPk(adjustment.id, options);
                if (existing) return;
                if (!supplier) throw new Error('Supplier missing.');
                if (adjustment.status === 'Pending') {
                    console.log(`${apply ? 'APPLY' : 'PREVIEW'} #${adjustment.id}: restore early balance debit ${adjustment.totalValue}; defer deduction until refund acceptance.`);
                    if (apply) await service.ensureDeferred(adjustment, supplier, transaction);
                } else if (adjustment.status === 'Refunded') {
                    if (!repair) { console.log(`LEGACY REFUND #${adjustment.id}: not changed; use the documented historical repair option if appropriate.`); return; }
                    const plan = await service.planRefund(adjustment, mappings[String(adjustment.id)], transaction);
                    console.log(`${apply ? 'APPLY' : 'PREVIEW'} #${adjustment.id}: reduce invoice(s) ${[...plan.totals.keys()].join(', ')} and supplier balance by ${adjustment.totalValue}.`);
                    if (apply) {
                        const accounting = await ReturnAccounting.create({ adjustmentId: adjustment.id, allocations: plan.allocations, applied: false }, { transaction });
                        await service.applyRefund(adjustment, supplier, accounting, transaction);
                    }
                }
            });
        } catch (error) {
            blocked++;
            console.error(`NOT CHANGED #${snapshot.id}: ${error.message}`);
        }
    }
    if (blocked) process.exitCode = 1;
    console.log(apply ? 'Reconciliation finished. Review any NOT CHANGED lines.' : 'Preview finished; no business records changed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
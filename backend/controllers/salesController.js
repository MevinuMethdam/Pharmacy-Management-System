const sequelize = require('../config/db');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Prescription = require('../models/Prescription');
const NmraLog = require('../models/NmraLog');

exports.createSale = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { customerName, paymentMethod, doctorName, items, remarks, prescriptionId } = req.body;

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'Cart is empty!' });
        }

        let hasControlledDrug = false;
        for (const cartItem of items) {
            const medCheck = await Medicine.findByPk(cartItem.medicineId, { transaction: t });
            if (medCheck && medCheck.isControlled) {
                hasControlledDrug = true;
                break;
            }
        }

        if (hasControlledDrug && (!doctorName || !customerName || !prescriptionId)) {
            await t.rollback();
            return res.status(400).json({
                error: 'Regulatory Compliance Error: Controlled substances strictly require Patient Name, Doctor Name, and Prescription Reference (RX)!'
            });
        }

        let totalAmount = 0;
        const processedItems = [];

        for (const cartItem of items) {
            const medicine = await Medicine.findByPk(cartItem.medicineId, { transaction: t });

            if (!medicine) {
                await t.rollback();
                return res.status(404).json({ error: `Medicine ID ${cartItem.medicineId} not found` });
            }

            if (medicine.quantity < cartItem.quantity) {
                await t.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}` });
            }

            const lineTotal = Number(medicine.sellingPrice) * Number(cartItem.quantity);
            totalAmount += lineTotal;

            processedItems.push({
                medicineId: medicine.id,
                medicineName: medicine.name,
                quantity: cartItem.quantity,
                unitPrice: medicine.sellingPrice,
                lineTotal: lineTotal
            });

            await medicine.update({
                quantity: medicine.quantity - cartItem.quantity
            }, { transaction: t });
        }

        const newSale = await Sale.create({
            customerName: customerName || 'Walk-in Customer',
            paymentMethod: paymentMethod || 'Cash',
            doctorName: doctorName || '',
            totalAmount: totalAmount,
            status: 'Completed',
            remarks: remarks || ''
        }, { transaction: t });

        for (const item of processedItems) {
            await SaleItem.create({
                saleId: newSale.saleId || newSale.id,
                ...item
            }, { transaction: t });
        }

        if (prescriptionId) {
            const prescription = await Prescription.findByPk(prescriptionId, { transaction: t });
            if (prescription) {
                await prescription.update({ status: 'Dispensed' }, { transaction: t });
            }
        }

        for (const item of processedItems) {
            const medicineRef = await Medicine.findByPk(item.medicineId, { transaction: t });

            if (medicineRef && medicineRef.isControlled) {
                await NmraLog.create({
                    saleId: String(newSale.saleId || newSale.id),
                    medicineName: item.medicineName,
                    quantity: item.quantity,
                    patientName: customerName || 'Walk-in Customer',
                    doctorName: doctorName || 'N/A',
                    dispensedBy: 'System Cashier',
                    status: 'Completed',
                    remarks: prescriptionId ? `Ref RX ID: ${prescriptionId}` : 'Over-the-counter Controlled Sale'
                }, { transaction: t });
            }
        }

        await t.commit();

        const io = req.app.get('io');
        if (io) {
            const saleIdStr = String(newSale.saleId || newSale.id);
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'success',
                title: 'New Sale Completed',
                message: `Invoice #${saleIdStr.slice(0, 8).toUpperCase()} - LKR ${totalAmount.toFixed(2)}`,
                time: new Date()
            });
        }

        res.status(201).json({ message: 'Sale completed successfully!', sale: newSale });

    } catch (err) {
        await t.rollback();
        console.error("Checkout Error:", err);
        res.status(500).json({ error: err.message || 'Checkout failed' });
    }
};

exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.findAll({
            include: [{ model: SaleItem, as: 'items' }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(sales);
    } catch (err) {
        console.error("Error fetching sales:", err);
        res.status(500).json({ error: 'Failed to fetch sales history' });
    }
};

exports.updateSale = async (req, res) => {
    try {
        const saleId = req.params.id;
        const { customerName, paymentMethod, doctorName, remarks } = req.body;

        const sale = await Sale.findByPk(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        await sale.update({
            customerName,
            paymentMethod,
            doctorName,
            remarks
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'info',
                title: 'Invoice Updated',
                message: `Invoice #${String(saleId).slice(0, 8).toUpperCase()} was updated.`,
                time: new Date()
            });
        }

        res.status(200).json({ message: 'Sale updated successfully', sale });
    } catch (err) {
        console.error("Update Sale Error:", err);
        res.status(500).json({ error: 'Failed to update sale' });
    }
};

exports.voidSale = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const saleId = req.params.id;

        const sale = await Sale.findByPk(saleId, {
            include: [{ model: SaleItem, as: 'items' }],
            transaction: t
        });

        if (!sale) {
            await t.rollback();
            return res.status(404).json({ error: 'Sale not found' });
        }

        if (sale.status === 'Voided') {
            await t.rollback();
            return res.status(400).json({ error: 'Sale is already voided' });
        }

        if (sale.items && sale.items.length > 0) {
            for (const item of sale.items) {
                const medicine = await Medicine.findByPk(item.medicineId, { transaction: t });
                if (medicine) {
                    await medicine.update({
                        quantity: medicine.quantity + item.quantity
                    }, { transaction: t });
                }
            }
        }

        await sale.update({ status: 'Voided' }, { transaction: t });

        await NmraLog.update(
            { status: 'Voided', remarks: 'Invoice Voided by Admin' },
            { where: { saleId: String(saleId) }, transaction: t }
        );

        await t.commit();

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'warning',
                title: 'Invoice Voided',
                message: `Invoice #${String(saleId).slice(0, 8).toUpperCase()} was voided.`,
                time: new Date()
            });
        }

        res.status(200).json({ message: 'Sale voided successfully' });
    } catch (err) {
        await t.rollback();
        console.error("Void Sale Error:", err);
        res.status(500).json({ error: 'Failed to void sale' });
    }
};
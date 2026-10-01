const sequelize = require('../config/db');
const Medicine = require('../models/Medicine');
// const Sale = require('../models/Sale');
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

        const currentMaxSaleId = await SaleItem.max('saleId', { transaction: t });
        const newSaleId = (currentMaxSaleId || 0) + 1;

        for (const item of processedItems) {
            await SaleItem.create({
                saleId: newSaleId,
                customerName: customerName || 'Walk-in Customer',
                paymentMethod: paymentMethod || 'Cash',
                doctorName: doctorName || '',
                status: 'Completed',
                remarks: remarks || '',
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
                    saleId: String(newSaleId),
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
            const saleIdStr = String(newSaleId);
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'success',
                title: 'New Sale Completed',
                message: `Invoice #${saleIdStr.slice(0, 8).padStart(4, '0')} - LKR ${totalAmount.toFixed(2)}`,
                time: new Date()
            });
        }

        const mockNewSale = {
            saleId: newSaleId,
            customerName: customerName || 'Walk-in Customer',
            paymentMethod: paymentMethod || 'Cash',
            doctorName: doctorName || '',
            totalAmount: totalAmount,
            status: 'Completed',
            remarks: remarks || '',
            items: processedItems
        };

        res.status(201).json({ message: 'Sale completed successfully!', sale: mockNewSale });

    } catch (err) {
        await t.rollback();
        console.error("Checkout Error:", err);
        res.status(500).json({ error: err.message || 'Checkout failed' });
    }
};

exports.getSales = async (req, res) => {
    try {
        const saleItems = await SaleItem.findAll({
            order: [['createdAt', 'DESC']]
        });

        const salesMap = {};
        for (const item of saleItems) {
            if (!salesMap[item.saleId]) {
                salesMap[item.saleId] = {
                    saleId: item.saleId,
                    customerName: item.customerName,
                    paymentMethod: item.paymentMethod,
                    doctorName: item.doctorName,
                    totalAmount: 0,
                    status: item.status,
                    remarks: item.remarks,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    items: []
                };
            }
            salesMap[item.saleId].totalAmount += Number(item.lineTotal);
            salesMap[item.saleId].items.push(item);
        }

        const sales = Object.values(salesMap);
        sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

        const items = await SaleItem.findAll({ where: { saleId: saleId } });
        if (!items || items.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        await SaleItem.update({
            customerName,
            paymentMethod,
            doctorName,
            remarks
        }, { where: { saleId: saleId } });

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'info',
                title: 'Invoice Updated',
                message: `Invoice #${String(saleId).slice(0, 8).padStart(4, '0')} was updated.`,
                time: new Date()
            });
        }

        const updatedSale = { saleId, customerName, paymentMethod, doctorName, remarks };
        res.status(200).json({ message: 'Sale updated successfully', sale: updatedSale });
    } catch (err) {
        console.error("Update Sale Error:", err);
        res.status(500).json({ error: 'Failed to update sale' });
    }
};

exports.voidSale = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const saleId = req.params.id;

        const items = await SaleItem.findAll({
            where: { saleId: saleId },
            transaction: t
        });

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(404).json({ error: 'Sale not found' });
        }

        if (items[0].status === 'Voided') {
            await t.rollback();
            return res.status(400).json({ error: 'Sale is already voided' });
        }

        for (const item of items) {
            const medicine = await Medicine.findByPk(item.medicineId, { transaction: t });
            if (medicine) {
                await medicine.update({
                    quantity: medicine.quantity + item.quantity
                }, { transaction: t });
            }
        }

        await SaleItem.update({ status: 'Voided' }, {
            where: { saleId: saleId },
            transaction: t
        });

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
                message: `Invoice #${String(saleId).slice(0, 8).padStart(4, '0')} was voided.`,
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
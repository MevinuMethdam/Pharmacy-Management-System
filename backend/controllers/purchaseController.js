const sequelize = require('../config/db');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseItem = require('../models/PurchaseItem');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');

exports.createPurchase = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { invoiceNumber, grnNumber, supplierId, invoiceDate, dueDate, totalAmount, notes, items } = req.body;

        const invoice = await PurchaseInvoice.create({
            invoiceNumber, grnNumber, supplierId, invoiceDate, dueDate, totalAmount, notes
        }, { transaction: t });

        for (let item of items) {
            let actualMedicineId = item.medicineId;

            if (!actualMedicineId || isNaN(actualMedicineId)) {
                const newMedicine = await Medicine.create({
                    name: item.name || item.medicineId,
                    genericName: item.genericName || '',
                    category: item.unit || 'Tablets',
                    barcode: item.barcode || '',
                    batchNumber: item.batchNumber,
                    quantity: item.quantity,
                    costPrice: item.costPrice,
                    sellingPrice: item.sellingPrice,
                    expiryDate: item.expiryDate,
                    minStockLevel: 10,
                    supplierId: supplierId,
                    isControlled: false
                }, { transaction: t });
                actualMedicineId = newMedicine.id;
            } else {
                const medicine = await Medicine.findByPk(actualMedicineId, { transaction: t });
                if (medicine) {
                    await medicine.update({
                        quantity: Number(medicine.quantity) + Number(item.quantity),
                        costPrice: item.costPrice,
                        sellingPrice: item.sellingPrice
                    }, { transaction: t });
                }
            }

            await PurchaseItem.create({
                purchaseInvoiceId: invoice.id,
                medicineId: actualMedicineId,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                unit: item.unit || 'Tablets',
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                subtotal: item.subtotal
            }, { transaction: t });
        }

        const supplier = await Supplier.findByPk(supplierId, { transaction: t });
        if (supplier) {
            await supplier.update({
                totalOutstanding: Number(supplier.totalOutstanding) + Number(totalAmount)
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ message: 'Purchase Invoice and Stock updated successfully!', invoice });

    } catch (error) {
        await t.rollback();
        console.error("Error creating purchase GRN:", error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: `Invoice Number '${req.body.invoiceNumber}' already exists! Please use a unique Invoice Number.` });
        }

        res.status(500).json({ error: 'Failed to process purchase invoice' });
    }
};

exports.getAllPurchases = async (req, res) => {
    try {
        const purchases = await PurchaseInvoice.findAll({
            include: [
                { model: Supplier, as: 'supplier', attributes: ['companyName'] },
                { model: PurchaseItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(purchases);
    } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};
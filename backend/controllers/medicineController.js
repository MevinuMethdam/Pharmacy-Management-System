const Medicine = require('../models/Medicine');

exports.addMedicine = async (req, res) => {
    try {
        console.log("Received Medicine Data:", req.body);

        const { name, genericName, category, batchNumber, quantity, costPrice, sellingPrice, expiryDate, minStockLevel, manufacturer, isControlled } = req.body;

        if (!name || !batchNumber || !quantity || !sellingPrice || !expiryDate) {
            return res.status(400).json({ error: 'Please fill all required fields!' });
        }

        const newMedicine = await Medicine.create({
            name,
            genericName,
            category,
            batchNumber,
            quantity: Number(quantity),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            expiryDate: new Date(expiryDate),
            minStockLevel: minStockLevel ? Number(minStockLevel) : 10,
            manufacturer,
            isControlled: isControlled !== undefined ? isControlled : false
        });

        res.status(201).json({ message: 'Medicine added successfully!', medicine: newMedicine });

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'success',
                title: 'New Medicine Added',
                message: `${name} (${batchNumber}) has been added to the inventory.`,
                time: new Date()
            });
        }
    } catch (err) {
        console.error("Error saving medicine:", err);
        res.status(500).json({ error: err.message || 'Failed to add medicine' });
    }
};

exports.getMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(medicines);
    } catch (err) {
        console.error("Error fetching medicines:", err);
        res.status(500).json({ error: err.message || 'Failed to fetch medicines' });
    }
};

exports.updateMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, genericName, category, batchNumber, quantity, costPrice, sellingPrice, expiryDate, minStockLevel, manufacturer, isControlled } = req.body;

        const medicine = await Medicine.findByPk(id);
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

        await medicine.update({
            name,
            genericName,
            category,
            batchNumber,
            quantity: Number(quantity),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            expiryDate: new Date(expiryDate),
            minStockLevel: minStockLevel ? Number(minStockLevel) : 10,
            manufacturer,
            isControlled: isControlled !== undefined ? isControlled : false
        });

        res.status(200).json({ message: 'Medicine updated successfully!', medicine });

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'info',
                title: 'Medicine Updated',
                message: `${name || medicine.name} has been updated.`,
                time: new Date()
            });
        }
    } catch (err) {
        console.error("Error updating medicine:", err);
        res.status(500).json({ error: err.message || 'Failed to update medicine' });
    }
};

exports.deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;

        const medicine = await Medicine.findByPk(id);
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

        await medicine.destroy();
        res.status(200).json({ message: 'Medicine deleted successfully!' });

        const io = req.app.get('io');
        if (io) {
            io.emit('receive_notification', {
                id: Date.now(),
                type: 'warning',
                title: 'Medicine Deleted',
                message: `${medicine.name} was removed from the inventory.`,
                time: new Date()
            });
        }
    } catch (err) {
        console.error("Error deleting medicine:", err);
        res.status(500).json({ error: err.message || 'Failed to delete medicine' });
    }
};
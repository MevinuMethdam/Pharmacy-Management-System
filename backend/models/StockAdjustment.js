const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockAdjustment = sequelize.define('StockAdjustment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    medicineId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    medicineName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    batchNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    supplierName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    actionType: {
        type: DataTypes.ENUM('Return to Supplier', 'Dispose/Write-off'),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    totalValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Replaced', 'Refunded', 'Completed'),
        defaultValue: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = StockAdjustment;
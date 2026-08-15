const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseItem = sequelize.define('PurchaseItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    purchaseInvoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'purchase_invoices',
            key: 'id'
        }
    },
    medicineId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'medicines',
            key: 'id'
        }
    },
    batchNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING,
        defaultValue: 'Tablets'
    },
    costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    sellingPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    }
}, {
    tableName: 'purchase_items',
    timestamps: true
});

module.exports = PurchaseItem;
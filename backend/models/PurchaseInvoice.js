const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Medicine = require('./Medicine');

const PurchaseInvoice = sequelize.define('PurchaseInvoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    grnNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    supplierName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nmraLicense: {
        type: DataTypes.STRING,
        allowNull: true
    },
    medicineId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Unknown'
    },
    genericName: {
        type: DataTypes.STRING,
        allowNull: true
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
    invoiceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    paidAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    paymentStatus: {
        type: DataTypes.ENUM('Unpaid', 'Partial', 'Paid'),
        defaultValue: 'Unpaid'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reminderSent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'purchase_invoices',
    timestamps: true,

indexes: [
    {
        unique: true,
        fields: ['invoiceNumber'],
        name: 'uq_purchase_invoice_number'
    },
    {
        unique: true,
        fields: ['grnNumber'],
        name: 'uq_purchase_grn_number'
    }
]
});

PurchaseInvoice.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

module.exports = PurchaseInvoice;
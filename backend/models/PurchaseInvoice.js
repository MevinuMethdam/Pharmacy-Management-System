const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseInvoice = sequelize.define('PurchaseInvoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'idx_unique_invoice_number'
    },
    grnNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'idx_unique_grn_number'
    },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'suppliers',
            key: 'id'
        }
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
    }
}, {
    tableName: 'purchase_invoices',
    timestamps: true
});

module.exports = PurchaseInvoice;
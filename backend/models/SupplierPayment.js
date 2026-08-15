const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SupplierPayment = sequelize.define('SupplierPayment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    paymentNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'suppliers',
            key: 'id'
        }
    },
    purchaseInvoiceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'purchase_invoices',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.ENUM('Cash', 'Cheque', 'Bank Transfer', 'Online'),
        defaultValue: 'Cash'
    },
    chequeNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    chequeDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'supplier_payments',
    timestamps: true
});

module.exports = SupplierPayment;
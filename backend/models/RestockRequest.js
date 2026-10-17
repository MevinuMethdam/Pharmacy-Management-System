const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define('RestockRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notificationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    medicineId: { type: DataTypes.INTEGER, allowNull: false },
    supplierId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseInvoiceId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseItemId: { type: DataTypes.INTEGER, allowNull: false },
    requestedQuantity: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'Pending' },
    rejectReason: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'restock_requests', timestamps: true });

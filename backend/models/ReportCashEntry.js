const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('ReportCashEntry', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestId: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    entryDate: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.STRING(40), allowNull: false },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    reference: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    reversalOf: { type: DataTypes.INTEGER, allowNull: true, unique: true }
}, { tableName: 'report_cash_entries', timestamps: true, indexes: [{ fields: ['entryDate'] }] });
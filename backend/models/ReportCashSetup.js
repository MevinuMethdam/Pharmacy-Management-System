const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('ReportCashSetup', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    openingDate: { type: DataTypes.DATEONLY, allowNull: false },
    openingAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    evidence: { type: DataTypes.STRING(500), allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'report_cash_setup', timestamps: true });
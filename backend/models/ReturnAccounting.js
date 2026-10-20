const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define('ReturnAccounting', {
    adjustmentId: { type: DataTypes.INTEGER, primaryKey: true },
    allocations: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    applied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'return_accounting', timestamps: true });
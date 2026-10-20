const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = sequelize.define('ReturnSettlement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adjustmentId: { type: DataTypes.INTEGER, allowNull: false },
    supplierId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(16), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'Reviewing' },
    requestToken: { type: DataTypes.STRING(36), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    evidenceImage: { type: DataTypes.TEXT('long'), allowNull: true },
    rejectReason: { type: DataTypes.TEXT, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'return_settlements', timestamps: true,
    indexes: [{ name: 'uq_return_settlement_adjustment', unique: true, fields: ['adjustmentId'] }]
});

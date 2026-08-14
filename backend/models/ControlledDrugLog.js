const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Prescription = require('./Prescription');
const Medicine = require('./Medicine');

const ControlledDrugLog = sequelize.define('ControlledDrugLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantityDispensed: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dispensedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    dispensedBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'controlled_drugs_logs',
    timestamps: true
});

Prescription.hasMany(ControlledDrugLog, { foreignKey: 'prescriptionId', as: 'drugLogs' });
ControlledDrugLog.belongsTo(Prescription, { foreignKey: 'prescriptionId', as: 'prescription' });

Medicine.hasMany(ControlledDrugLog, { foreignKey: 'medicineId', as: 'dispenseLogs' });
ControlledDrugLog.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

module.exports = ControlledDrugLog;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Prescription = require('./Prescription');
const Medicine = require('./Medicine');

const PrescriptionItem = sequelize.define('PrescriptionItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    dosageInstructions: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'prescription_items',
    timestamps: true
});

Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescriptionId', as: 'items', onDelete: 'CASCADE' });
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescriptionId', as: 'prescription' });

Medicine.hasMany(PrescriptionItem, { foreignKey: 'medicineId', as: 'prescriptionItems' });
PrescriptionItem.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

module.exports = PrescriptionItem;
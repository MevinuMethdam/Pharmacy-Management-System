const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('./Customer');

const Prescription = sequelize.define('Prescription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    patientName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    patientNic: {
        type: DataTypes.STRING,
        allowNull: true
    },
    patientAge: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    patientGender: {
        type: DataTypes.STRING,
        allowNull: true
    },
    patientContactNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },

    doctorName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    doctorSpecialization: {
        type: DataTypes.STRING,
        allowNull: true
    },
    doctorContactNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },

    medicineIds: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    medicineNames: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    quantities: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    dosageInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending'
    },
    digitalCopyUrl: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    prescriptionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }

}, {
    tableName: 'prescriptions',
    timestamps: true
});

Customer.hasMany(Prescription, { foreignKey: 'patientId', as: 'prescriptions' });
Prescription.belongsTo(Customer, { foreignKey: 'patientId', as: 'patient' });

module.exports = Prescription;
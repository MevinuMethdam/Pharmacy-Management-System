const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const NmraLog = sequelize.define('NmraLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    saleId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    medicineName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    patientName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    doctorName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dispensedBy: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Completed'
    },
    remarks: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'nmra_logs',
    timestamps: true
});

module.exports = NmraLog;
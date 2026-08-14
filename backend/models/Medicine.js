const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Medicine = sequelize.define('Medicine', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    genericName: {
        type: DataTypes.STRING
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    batchNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0 }
    },
    costPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: 0 }
    },
    sellingPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: 0 }
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    minStockLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    manufacturer: {
        type: DataTypes.STRING
    },
    isControlled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true,
    tableName: 'medicines'
});

module.exports = Medicine;
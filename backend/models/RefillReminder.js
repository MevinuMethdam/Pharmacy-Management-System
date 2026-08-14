const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('./Customer');

const RefillReminder = sequelize.define('RefillReminder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    medicineName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastPurchasedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    nextRefillDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'refill_reminders',
    timestamps: true
});

Customer.hasMany(RefillReminder, { foreignKey: 'customerId', as: 'reminders' });
RefillReminder.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

module.exports = RefillReminder;
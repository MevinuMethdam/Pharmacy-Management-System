const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AIOutbreakLog = sequelize.define('AIOutbreakLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    riskLevel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    summaryMessage: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    identifiedTrends: {
        type: DataTypes.JSON,
        allowNull: true
    },
    stockRecommendations: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'ai_outbreak_logs',
    timestamps: true
});

module.exports = AIOutbreakLog;
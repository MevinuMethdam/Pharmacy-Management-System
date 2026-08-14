const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'kegalle_pharmacy',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // SQL queries ටර්මිනල් එකේ පේන එක නවත්වයි
    }
);

// Database එකට හරියට Connect වුණාද කියලා බැලීම පමණක් සිදු කරයි (Tables auto-create කරන්නේ නැත)
sequelize.authenticate()
    .then(() => {
        console.log('✅ MySQL Database Connected Successfully! (Manual Mode)');
    })
    .catch((err) => {
        console.error('❌ Unable to connect to the database:', err);
    });

module.exports = sequelize;
const db = require('../config/db');

const getUserByEmail = async (email) => {
    const [rows] = await db.execute(
        `SELECT u.*, r.role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.email = ?`,
        [email]
    );
    return rows[0];
};

const createUser = async (userData) => {
    const { firstName, lastName, email, passwordHash, roleId } = userData;
    const [result] = await db.execute(
        `INSERT INTO users (first_name, last_name, email, password_hash, role_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [firstName, lastName, email, passwordHash, roleId]
    );
    return result;
};

module.exports = { getUserByEmail, createUser };
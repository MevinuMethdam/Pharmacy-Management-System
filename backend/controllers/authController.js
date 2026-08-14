const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', {
            replacements: [email]
        });
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.status && user.status !== 'Active') {
            return res.status(403).json({ message: 'Your account is deactivated. Contact Admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

const setupAdmin = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', {
            replacements: [email]
        });
        if (existingUsers.length > 0) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const fullName = `${firstName} ${lastName}`;
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            {
                replacements: [fullName, email, passwordHash, 'Admin']
            }
        );

        res.status(201).json({ message: 'Admin setup successful! You can now login.' });
    } catch (error) {
        console.error('Setup Admin Error:', error);
        res.status(500).json({ message: 'Error setting up admin', error: error.message });
    }
};

module.exports = { login, setupAdmin };
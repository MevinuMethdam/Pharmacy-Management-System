const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const Supplier = require('../models/Supplier');

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

const cashierLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'Cashier'", {
            replacements: [email]
        });
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid Cashier email or password' });
        }

        if (user.status && user.status !== 'Active') {
            return res.status(403).json({ message: 'Your cashier account is deactivated. Contact Admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Cashier email or password' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.status(200).json({
            message: 'Cashier Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Cashier Login Error:', error);
        res.status(500).json({ message: 'Server error during cashier login' });
    }
};

const supplierLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const supplier = await Supplier.findOne({ where: { email } });

        if (!supplier) {
            return res.status(401).json({ message: 'Invalid Supplier email or password' });
        }

        if (supplier.portalStatus && supplier.portalStatus !== 'Active') {
            return res.status(403).json({ message: 'Portal access is not active. Please complete setup via invite email.' });
        }

        if (!supplier.password) {
            return res.status(401).json({ message: 'Password not set. Please use the invite link sent to your email.' });
        }

        const isMatch = await bcrypt.compare(password, supplier.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Supplier email or password' });
        }

        const token = jwt.sign(
            { supplierId: supplier.id, role: 'Supplier' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Supplier Login successful',
            token,
            user: {
                id: supplier.id,
                name: supplier.companyName,
                email: supplier.email,
                role: 'Supplier'
            }
        });

    } catch (error) {
        console.error('Supplier Login Error:', error);
        res.status(500).json({ message: 'Server error during supplier login' });
    }
};

const setupCashier = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', {
            replacements: [email]
        });
        if (existingUsers.length > 0) return res.status(400).json({ message: 'Cashier already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'Cashier')",
            {
                replacements: [name, email, passwordHash]
            }
        );

        res.status(201).json({ message: 'Cashier account created successfully!' });
    } catch (error) {
        console.error('Setup Cashier Error:', error);
        res.status(500).json({ message: 'Error setting up cashier', error: error.message });
    }
};

module.exports = { login, setupAdmin, cashierLogin, supplierLogin, setupCashier };
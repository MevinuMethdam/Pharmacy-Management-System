const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const Supplier = require('../models/Supplier');
const nodemailer = require('nodemailer');

const otpStore = {};

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

        if (user.role === 'Admin') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            otpStore[user.id] = {
                email: user.email,
                otp: otpCode,
                expires: Date.now() + 10 * 60 * 1000
            };

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'kegallepharmacy@gmail.com',
                subject: 'Admin Login Security Code (OTP) - Ph4Life',
                html: `
                    <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
                        <h2 style="color: #0369a1; text-align: center;">Kegalle Ph4Life Admin Authentication</h2>
                        <p style="text-align: center; color: #475569;">A login attempt was made with your Admin credentials. Use the 6-digit code below to securely sign in.</p>
                        
                        <div style="margin: 30px auto; padding: 15px; background-color: #ffffff; text-align: center; border: 2px dashed #bae6fd; border-radius: 8px;">
                            <h1 style="color: #0284c7; letter-spacing: 0.5em; font-size: 32px; margin: 0;">${otpCode}</h1>
                        </div>
                        
                        <p style="text-align: center; color: #94a3b8; font-size: 12px;">This code will expire in 10 minutes. If you did not attempt to sign in, please secure your account immediately.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            return res.status(200).json({ requiresOtp: true, message: 'OTP sent to pharmacy email' });
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

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', {
            replacements: [email]
        });
        const user = users[0];

        if (!user) return res.status(401).json({ error: 'Invalid user' });

        const storedData = otpStore[user.id];

        if (!storedData || storedData.otp !== otp || Date.now() > storedData.expires) {
            return res.status(401).json({ error: 'Invalid or expired OTP code.' });
        }

        delete otpStore[user.id];

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'OTP Verification successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ error: 'Server error during verification' });
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

module.exports = { login, verifyOtp, setupAdmin, cashierLogin, supplierLogin, setupCashier };
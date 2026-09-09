const Supplier = require('../models/Supplier');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const { Op } = require('sequelize');

exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({ order: [['companyName', 'ASC']] });

        const enhancedSuppliers = await Promise.all(suppliers.map(async (supplier) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 5);
            const targetDateString = targetDate.toISOString().split('T')[0];

            const dueInvoices = await PurchaseInvoice.findAll({
                where: {
                    supplierId: supplier.id,
                    dueDate: { [Op.lte]: targetDateString },
                    paymentStatus: { [Op.ne]: 'Paid' }

                }
            });

            return {
                ...supplier.toJSON(),
                isPaymentDueIn5Days: dueInvoices.length > 0
            };
        }));

        res.status(200).json(enhancedSuppliers);
    } catch (err) {
        console.error("Error fetching suppliers:", err);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

exports.createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json(supplier);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create supplier' });
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        await supplier.update(req.body);
        res.status(200).json(supplier);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update supplier' });
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        await supplier.destroy();
        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
};

exports.sendInvite = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier.findByPk(id);

        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        if (!supplier.email) return res.status(400).json({ error: 'Supplier email is missing. Please update email first.' });

        const inviteToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await supplier.update({
            inviteToken: inviteToken,
            tokenExpiry: tokenExpiry,
            portalStatus: 'Pending'
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/supplier-setup?token=${inviteToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: supplier.email,
            subject: 'Secure Invitation to Kegalle Ph4Life Supplier Portal',
            html: `
                <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #0f172a;">Welcome to Kegalle Ph4Life</h2>
                    <p style="color: #475569;">Dear <strong>${supplier.companyName}</strong>,</p>
                    <p style="color: #475569;">You have been invited to join our secure Supplier Portal to manage your Purchase Orders and Payments.</p>
                    <p style="color: #475569;">Please click the button below to set up your password securely and access your dashboard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Setup Secure Password</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;"><i>Security Notice: This link will automatically expire in 24 hours. Do not share this email.</i></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Invitation email sent successfully!' });
    } catch (err) {
        console.error('Invite Error:', err);
        res.status(500).json({ error: 'Failed to send invite email. Check server configuration.' });
    }
};

exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.params;
        const supplier = await Supplier.findOne({ where: { inviteToken: token } });

        if (!supplier) {
            return res.status(400).json({ error: 'Security Alert: Invalid invitation link.' });
        }

        if (supplier.portalStatus === 'Active') {
            return res.json({ alreadySetup: true });
        }

        if (supplier.tokenExpiry < new Date()) {
            return res.status(400).json({ error: 'This invite link has expired. Please request a new invite.' });
        }

        return res.json({ alreadySetup: false });

    } catch (err) {
        console.error('Token Verification Error:', err);
        res.status(500).json({ error: 'Failed to verify token.' });
    }
};

exports.setupPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        const supplier = await Supplier.findOne({
            where: { inviteToken: token }
        });

        if (!supplier) {
            return res.status(400).json({ error: 'Security Alert: Invalid token.' });
        }

        if (supplier.portalStatus === 'Active') {
            return res.status(400).json({ error: 'Account is already configured. Please login.' });
        }

        if (supplier.tokenExpiry < new Date()) {
            return res.status(400).json({ error: 'This invite link has expired. Please request a new invite.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await supplier.update({
            password: hashedPassword,
            portalStatus: 'Active'
        });

        res.status(200).json({ message: 'Password configured successfully. Welcome aboard!' });
    } catch (err) {
        console.error('Password Setup Error:', err);
        res.status(500).json({ error: 'Failed to securely set up password.' });
    }
};
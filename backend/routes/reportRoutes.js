const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const sequelize = require('../config/db');
const controller = require('../controllers/reportController');
const router = express.Router();

async function requireReportAdmin(req, res, next) {
    try {
        const userId = Number(req.user?.userId);
        if (!Number.isSafeInteger(userId) || userId <= 0 || req.user?.supplierId != null) {
            return res.status(403).json({ error: 'Sign in with an Admin account to view reports.', code: 'REPORT_ADMIN_REQUIRED' });
        }
        const [users] = await sequelize.query('SELECT * FROM users WHERE id = ? LIMIT 1', { replacements: [userId] });
        const user = users[0];
        if (!user || user.role !== 'Admin' || (user.status && user.status !== 'Active')) {
            return res.status(403).json({ error: 'Your current account does not have active Admin access. Sign in with an active Admin account.', code: 'REPORT_ADMIN_REQUIRED' });
        }
        req.reportUser = { id: user.id, name: user.name };
        next();
    } catch (error) {
        console.error('Report account verification failed:', error.name);
        res.status(500).json({ error: 'Could not verify report access. Please retry.' });
    }
}
router.use(verifyToken, requireReportAdmin);
router.get('/snapshot', controller.snapshot);
router.post('/cash-opening', controller.setOpening);
router.post('/cash-entries', controller.createEntry);
router.post('/cash-entries/:id/reverse', controller.reverseEntry);
module.exports = router;
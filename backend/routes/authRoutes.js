const express = require('express');
const router = express.Router();

const { login, verifyOtp, setupAdmin, cashierLogin, supplierLogin, setupCashier } = require('../controllers/authController');

router.post('/login', login);
router.post('/verify-otp', verifyOtp);

router.post('/setup-admin', setupAdmin);
router.post('/cashier-login', cashierLogin);

router.post('/supplier-login', supplierLogin);
router.post('/setup-cashier', setupCashier);

module.exports = router;
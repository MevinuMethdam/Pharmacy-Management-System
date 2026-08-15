const express = require('express');
const router = express.Router();
const supplierPaymentController = require('../controllers/supplierPaymentController');

router.post('/', supplierPaymentController.createPayment);
router.get('/', supplierPaymentController.getAllPayments);

module.exports = router;
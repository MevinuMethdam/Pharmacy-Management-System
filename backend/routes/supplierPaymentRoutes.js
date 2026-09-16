const express = require('express');
const router = express.Router();
const supplierPaymentController = require('../controllers/supplierPaymentController');

router.post('/', supplierPaymentController.createPayment);
router.get('/', supplierPaymentController.getAllPayments);
router.put('/:id/accept', supplierPaymentController.acceptPayment);
router.put('/:id/reject', supplierPaymentController.rejectPayment);

module.exports = router;
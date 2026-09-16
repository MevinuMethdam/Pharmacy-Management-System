const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/adjustmentController');

router.post('/adjust', adjustmentController.processStockAdjustment);
router.get('/history', adjustmentController.getAdjustmentHistory);

router.post('/replace/:id', adjustmentController.processReplacement);
router.post('/refund/:id', adjustmentController.processRefund);

module.exports = router;
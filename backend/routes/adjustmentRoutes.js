const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/adjustmentController');
const settlementController = require('../controllers/returnSettlementController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/adjust', adjustmentController.processStockAdjustment);
router.get('/history', verifyToken, verifyRole('Admin', 'Pharmacist', 'Cashier', 'Supplier'), adjustmentController.getAdjustmentHistory);
router.post('/replace/:id', verifyToken, verifyRole('Admin', 'Pharmacist'), adjustmentController.processReplacement);
router.post('/refund/:id', verifyToken, verifyRole('Admin', 'Pharmacist'), adjustmentController.processRefund);
router.get('/:id/evidence', verifyToken, settlementController.evidence);
router.put('/:id/review/:action', verifyToken, settlementController.decide);

module.exports = router;
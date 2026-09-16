const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

const {verifyToken} = require('../middleware/authMiddleware');

router.get('/', purchaseController.getAllPurchases);
router.post('/', purchaseController.createPurchase);

router.get('/my-purchases', verifyToken, purchaseController.getSupplierPurchases);

module.exports = router;
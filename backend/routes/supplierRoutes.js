const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', supplierController.getSuppliers);
router.post('/', supplierController.createSupplier);
router.post('/:id/invite', supplierController.sendInvite);
router.post('/setup-password', supplierController.setupPassword);
router.put('/change-password', verifyToken, supplierController.changePassword);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);
router.get('/verify-token/:token', supplierController.verifyToken);

module.exports = router;
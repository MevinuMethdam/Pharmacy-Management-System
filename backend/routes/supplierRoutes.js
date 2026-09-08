const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

router.get('/', supplierController.getSuppliers);
router.post('/', supplierController.createSupplier);
router.post('/:id/invite', supplierController.sendInvite);
router.post('/setup-password', supplierController.setupPassword);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
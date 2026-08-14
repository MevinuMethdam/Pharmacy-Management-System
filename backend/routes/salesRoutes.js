const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.post('/checkout', salesController.createSale);
router.get('/', salesController.getSales);

router.put('/:id', salesController.updateSale);
router.delete('/:id', salesController.voidSale);

module.exports = router;
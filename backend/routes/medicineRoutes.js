const express = require('express');
const router = express.Router();
const { addMedicine, getMedicines, updateMedicine, deleteMedicine } = require('../controllers/medicineController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getMedicines);
router.post('/', verifyToken, addMedicine);

router.put('/:id', verifyToken, updateMedicine);
router.delete('/:id', verifyToken, deleteMedicine);

module.exports = router;
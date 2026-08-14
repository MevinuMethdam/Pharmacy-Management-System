const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', prescriptionController.getAllPrescriptions);
router.post('/', prescriptionController.createPrescription);
router.put('/:id', prescriptionController.updatePrescription);
router.delete('/:id', prescriptionController.deletePrescription);

router.post('/upload-ai', upload.single('image'), prescriptionController.scanPrescriptionAI);

module.exports = router;
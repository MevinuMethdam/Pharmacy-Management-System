const express = require('express');
const router = express.Router();
const directoryController = require('../controllers/directoryController');

router.get('/patients', directoryController.getPatients);
router.post('/patients', directoryController.createPatient);
router.put('/patients/:id', directoryController.updatePatient);
router.delete('/patients/:id', directoryController.deletePatient);

router.get('/doctors', directoryController.getDoctors);
router.post('/doctors', directoryController.createDoctor);
router.put('/doctors/:id', directoryController.updateDoctor);
router.delete('/doctors/:id', directoryController.deleteDoctor);

module.exports = router;
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

exports.getPatients = async (req, res) => {
    try {
        const patients = await Patient.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(patients);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
};

exports.createPatient = async (req, res) => {
    try {
        const patient = await Patient.create(req.body);
        res.status(201).json(patient);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create patient' });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        await patient.update(req.body);
        res.status(200).json(patient);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update patient' });
    }
};

exports.deletePatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        await patient.destroy();
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete patient' });
    }
};

// --- Doctor APIs ---
exports.getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(doctors);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

exports.createDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.create(req.body);
        res.status(201).json(doctor);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create doctor' });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        await doctor.update(req.body);
        res.status(200).json(doctor);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update doctor' });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        await doctor.destroy();
        res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
};
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const Customer = require('../models/Customer');
const Doctor = require('../models/Doctor');
const Medicine = require('../models/Medicine');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getAllPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.findAll({
            include: [
                { model: Customer, as: 'patient' },
                { model: Doctor, as: 'doctor' },
                {
                    model: PrescriptionItem,
                    as: 'items',
                    include: [{ model: Medicine, as: 'medicine' }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(prescriptions);
    } catch (err) {
        console.error('Error fetching prescriptions:', err);
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
};

exports.createPrescription = async (req, res) => {
    try {
        const { patientId, doctorId, prescriptionDate, status, digitalCopyUrl, notes, items } = req.body;

        const prescription = await Prescription.create({
            patientId,
            doctorId,
            prescriptionDate,
            status: status || 'Pending',
            digitalCopyUrl,
            notes
        });

        if (items && items.length > 0) {
            const itemsToCreate = items.map(item => ({
                prescriptionId: prescription.id,
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosageInstructions: item.dosageInstructions
            }));

            await PrescriptionItem.bulkCreate(itemsToCreate);
        }

        res.status(201).json(prescription);
    } catch (err) {
        console.error('Error creating prescription:', err);
        res.status(500).json({ error: 'Failed to create prescription' });
    }
};

exports.updatePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.id);
        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        await prescription.update(req.body);

        if (req.body.items && req.body.items.length > 0) {
            await PrescriptionItem.destroy({ where: { prescriptionId: prescription.id } });

            const itemsToCreate = req.body.items.map(item => ({
                prescriptionId: prescription.id,
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosageInstructions: item.dosageInstructions
            }));

            await PrescriptionItem.bulkCreate(itemsToCreate);
        }

        res.status(200).json(prescription);
    } catch (err) {
        console.error('Error updating prescription:', err);
        res.status(500).json({ error: 'Failed to update prescription' });
    }
};

exports.deletePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.id);
        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        await prescription.destroy();
        res.status(200).json({ message: 'Prescription deleted successfully' });
    } catch (err) {
        console.error('Error deleting prescription:', err);
        res.status(500).json({ error: 'Failed to delete prescription' });
    }
};

exports.scanPrescriptionAI = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a prescription image.' });
        }

        // 1. ෆොටෝ එක Base64 විදිහට හදාගැනීම
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype
            }
        };

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `
            Analyze this medical prescription image and extract the information carefully.
            Return ONLY a valid JSON object without any markdown code blocks, backticks, or extra text.
            Use exactly this format:
            {
                "patient": "Extracted Patient Name or Unknown",
                "doctor": "Extracted Doctor Name or Unknown",
                "medicines": [
                    {
                        "name": "Medicine Name",
                        "dosage": "Dosage instructions (e.g., 1 pill 3 times a day)",
                        "isControlled": false
                    }
                ]
            }
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        const extractedData = JSON.parse(responseText);

        res.status(200).json({
            message: 'AI Scan Successful',
            extractedData: extractedData
        });

    } catch (error) {
        console.error('AI Scanning Error:', error);
        res.status(500).json({ message: 'Failed to scan prescription with AI. Please try again.' });
    }
};
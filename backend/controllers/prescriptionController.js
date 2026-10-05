const Prescription = require('../models/Prescription');
const Customer = require('../models/Customer');
const Medicine = require('../models/Medicine');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getAllPrescriptions = async (req, res) => {
    try {
        const prescriptionsRaw = await Prescription.findAll({
            include: [
                { model: Customer, as: 'patient' }
            ],
            order: [['createdAt', 'DESC']]
        });

        const prescriptions = prescriptionsRaw.map(rx => {
            const rxData = rx.toJSON();

            if (rxData.medicineNames) {
                const ids = rxData.medicineIds ? rxData.medicineIds.split(',') : [];
                const names = rxData.medicineNames.split(',');
                const qts = rxData.quantities ? rxData.quantities.split(',') : [];
                const dosages = rxData.dosageInstructions ? rxData.dosageInstructions.split(' || ') : [];

                const items = [];
                for (let i = 0; i < names.length; i++) {
                    if (names[i].trim() !== '') {
                        items.push({
                            medicineId: ids[i] && ids[i] !== 'null' ? parseInt(ids[i]) : null,
                            medicineName: names[i].trim(),
                            quantity: qts[i] ? parseInt(qts[i]) : 1,
                            dosageInstructions: dosages[i] ? dosages[i].trim() : ''
                        });
                    }
                }
                rxData.prescribedMedicines = items;
            } else {
                rxData.prescribedMedicines = [];
            }

            return rxData;
        });

        res.status(200).json(prescriptions);
    } catch (err) {
        console.error('Error fetching prescriptions:', err);
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
};

exports.createPrescription = async (req, res) => {
    try {
        const {
            patientId,
            patientName,
            patientNic,
            patientAge,
            patientGender,
            patientContactNumber,
            doctorName,
            doctorSpecialization,
            doctorContactNumber,
            prescriptionDate,
            status,
            digitalCopyUrl,
            notes,
            items
        } = req.body;

        let medIds = [];
        let medNames = [];
        let medQts = [];
        let medDosages = [];

        if (items && items.length > 0) {
            items.forEach(item => {
                medIds.push(item.medicineId || 'null');
                medNames.push(item.medicineName || 'Unknown');
                medQts.push(item.quantity || 1);
                medDosages.push(item.dosageInstructions || '-');
            });
        }

        const prescription = await Prescription.create({
            patientId,
            patientName,
            patientNic,
            patientAge,
            patientGender,
            patientContactNumber,
            doctorName,
            doctorSpecialization,
            doctorContactNumber,

            medicineIds: medIds.join(','),
            medicineNames: medNames.join(','),
            quantities: medQts.join(','),
            dosageInstructions: medDosages.join(' || '),

            prescriptionDate,
            status: status || 'Pending',
            digitalCopyUrl,
            notes
        });

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

        const updateData = { ...req.body };

        if (req.body.items) {
            let medIds = [];
            let medNames = [];
            let medQts = [];
            let medDosages = [];

            req.body.items.forEach(item => {
                medIds.push(item.medicineId || 'null');
                medNames.push(item.medicineName || 'Unknown');
                medQts.push(item.quantity || 1);
                medDosages.push(item.dosageInstructions || '-');
            });

            updateData.medicineIds = medIds.join(',');
            updateData.medicineNames = medNames.join(',');
            updateData.quantities = medQts.join(',');
            updateData.dosageInstructions = medDosages.join(' || ');
        }

        await prescription.update(updateData);

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
const { Op } = require('sequelize');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const Medicine = require('../models/Medicine');
const AIOutbreakLog = require('../models/AIOutbreakLog');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.AI_ANALYSIS_GEMINI_API_KEY);

exports.analyzeOutbreakTrends = async (req, res) => {
    try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const recentItems = await PrescriptionItem.findAll({
            include: [
                {
                    model: Prescription,
                    as: 'prescription',
                    where: { createdAt: { [Op.gte]: fourteenDaysAgo } },
                    attributes: []
                },
                {
                    model: Medicine,
                    as: 'medicine',
                    attributes: ['name']
                }
            ]
        });

        if (!recentItems || recentItems.length === 0) {
            return res.status(200).json({
                riskLevel: "Low",
                summaryMessage: "(Not enough data in the last 14 days)",
                identifiedTrends: [],
                stockRecommendations: []
            });
        }

        const medicineCounts = {};
        recentItems.forEach(item => {
            const medName = item.medicine ? item.medicine.name : 'Unknown';
            if (medicineCounts[medName]) {
                medicineCounts[medName] += item.quantity;
            } else {
                medicineCounts[medName] = item.quantity;
            }
        });

        const trendDataString = Object.keys(medicineCounts)
            .map(med => `${med}: ${medicineCounts[med]} units`)
            .join('\n');

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `
            You are an expert Health-Tech AI and Epidemiologist working for a pharmacy system. 
            Analyze the following medicine consumption data from our pharmacy over the last 14 days:
            
            ${trendDataString}

            Based on these medicines and their quantities, predict any potential seasonal disease outbreaks (e.g., flu, asthma, viral fever, dengue).
            
            Return ONLY a valid JSON object without any markdown code blocks, backticks, or extra text.
            Use EXACTLY this JSON format:
            {
                "riskLevel": "Low" | "Medium" | "High" | "Critical",
                "summaryMessage": "A 2-3 sentence executive summary of the current health trend in the area.",
                "identifiedTrends": [
                    {
                        "disease": "Name of predicted disease",
                        "confidenceLevel": "Percentage (e.g., 85%)",
                        "affectedMedicines": "List of medicines driving this trend",
                        "trendDescription": "Why this is happening and what to expect."
                    }
                ],
                "stockRecommendations": [
                    {
                        "medicineType": "Category to restock (e.g., Antihistamines, Paracetamol)",
                        "reason": "Why we need to prepare this stock."
                    }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(responseText);

        await AIOutbreakLog.create({
            riskLevel: aiData.riskLevel,
            summaryMessage: aiData.summaryMessage,
            identifiedTrends: aiData.identifiedTrends,
            stockRecommendations: aiData.stockRecommendations
        });

        res.status(200).json(aiData);

    } catch (error) {
        console.error("AI Outbreak Analysis Error:", error);
        res.status(500).json({ error: 'Failed to generate Outbreak Analysis' });
    }
};

exports.getOutbreakHistory = async (req, res) => {
    try {
        const history = await AIOutbreakLog.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching AI Outbreak History:", error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};
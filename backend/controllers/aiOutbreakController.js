const { Op } = require('sequelize');
const Medicine = require('../models/Medicine');
const AIOutbreakLog = require('../models/AIOutbreakLog');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.AI_ANALYSIS_GEMINI_API_KEY);

exports.analyzeOutbreakTrends = async (req, res) => {
    try {
        let newsData = "";
        try {
            const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=(dengue OR fever OR flu OR virus OR outbreak OR disease OR infection) "Sri Lanka" when:14d&hl=en-US&gl=US&ceid=US:en');
            const newsRes = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);

            if (newsRes.data && newsRes.data.items) {
                const articles = newsRes.data.items.slice(0, 10); 
                newsData = articles.map(a => `- Headline: ${a.title} (Published: ${a.pubDate})`).join('\n');
            }
        } catch (newsErr) {
            console.error("News API Fetch Error:", newsErr);
            newsData = "Could not fetch recent news. Rely on historical Sri Lankan data.";
        }

        const medicines = await Medicine.findAll({ attributes: ['name', 'category', 'quantity'] });
        const inventoryData = medicines.map(m => `${m.name} [${m.category}] (Stock: ${m.quantity})`).join(', ');

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `
            You are an expert Health-Tech AI, Epidemiologist, and Pharmacologist working for a pharmacy in Sri Lanka.
            
            LATEST REAL-WORLD NEWS FROM SRI LANKA (Last 14 Days):
            ${newsData}

            CURRENT PHARMACY INVENTORY:
            [ ${inventoryData || 'No medicines in stock currently'} ]

            TASK:
            1. Analyze the news to identify what diseases/outbreaks are CURRENTLY spreading in Sri Lanka.
            2. Act as a Medical Database API: For each identified disease, determine the standard pharmacy medicines used for treatment/prevention.
            3. Cross-reference these required medicines with our CURRENT INVENTORY.

            Return ONLY a valid JSON object without any markdown code blocks, backticks, or extra text.
            Use EXACTLY this JSON format:
            {
                "riskLevel": "Low" | "Medium" | "High" | "Critical",
                "summaryMessage": "A 2-3 sentence executive summary of the current real-world health trends in Sri Lanka based on the news.",
                "identifiedTrends": [
                    {
                        "disease": "Name of disease currently spreading",
                        "confidenceLevel": "Percentage (e.g., 85%)",
                        "affectedMedicines": "Medicines used to treat this",
                        "trendDescription": "Why this is spreading based on news",
                        "newsSource": "Quote the exact news headline from the provided news data that proves this"
                    }
                ],
                "stockRecommendations": [
                    {
                        "medicineType": "Medicine Name (must match inventory or suggest new)",
                        "currentStock": "Current stock amount from inventory (e.g., 50 or '0')",
                        "requiredStock": "Estimated quantity needed to face the outbreak (e.g., 200)",
                        "reason": "Why we need this quantity based on the disease spread."
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
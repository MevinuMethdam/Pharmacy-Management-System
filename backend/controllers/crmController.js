const Customer = require('../models/Customer');
const RefillReminder = require('../models/RefillReminder');
const Sale = require('../models/Sale');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.CRM_GEMINI_API_KEY);

exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(customers);
    } catch (err) {
        console.error("Error fetching customers:", err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (err) {
        console.error("Error creating customer:", err);
        res.status(500).json({ error: 'Failed to create customer' });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        await customer.update(req.body);
        res.status(200).json(customer);
    } catch (err) {
        console.error("Error updating customer:", err);
        res.status(500).json({ error: 'Failed to update customer' });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        await customer.destroy();
        res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error("Error deleting customer:", err);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
};

exports.getReminders = async (req, res) => {
    try {
        const reminders = await RefillReminder.findAll({
            include: [{ model: Customer, as: 'customer' }],
            order: [['nextRefillDate', 'ASC']]
        });
        res.status(200).json(reminders);
    } catch (err) {
        console.error("Error fetching reminders:", err);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
};

exports.createReminder = async (req, res) => {
    try {
        const reminder = await RefillReminder.create(req.body);
        res.status(201).json(reminder);
    } catch (err) {
        console.error("Error creating reminder:", err);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
};

exports.updateReminder = async (req, res) => {
    try {
        const reminder = await RefillReminder.findByPk(req.params.id);
        if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

        await reminder.update(req.body);
        res.status(200).json(reminder);
    } catch (err) {
        console.error("Error updating reminder:", err);
        res.status(500).json({ error: 'Failed to update reminder' });
    }
};

exports.deleteReminder = async (req, res) => {
    try {
        const reminder = await RefillReminder.findByPk(req.params.id);
        if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

        await reminder.destroy();
        res.status(200).json({ message: 'Reminder deleted successfully' });
    } catch (err) {
        console.error("Error deleting reminder:", err);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
};

exports.getAIHealthInsights = async (req, res) => {
    try {
        const customerId = req.params.id;

        const customer = await Customer.findByPk(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found in Database' });
        }

        let transactionCount = 0;
        let totalSpent = 0;

        try {
            const sales = await Sale.findAll({ where: { customerId: customer.id } });
            transactionCount = sales.length;

            totalSpent = sales.reduce((sum, sale) => {
                const amount = parseFloat(sale.totalAmount || sale.netAmount || sale.netTotal || sale.total || 0);
                return sum + amount;
            }, 0);
        } catch (dbErr) {
            console.warn("Could not fetch transaction count, defaulting to 0", dbErr);
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `
            You are an expert Pharmacy CRM AI Advisor. Analyze this customer's REAL profile and transaction history from our database to provide personalized health insights and calculate an EXACT automated loyalty point bonus.
            
            Customer Database Record:
            - Name: ${customer.name}
            - Age: ${customer.age || 'Unknown'} Years
            - Gender: ${customer.gender || 'Unknown'}
            - Current Loyalty Points: ${customer.loyaltyPoints || 0}
            - Total Purchases Made: ${transactionCount} times
            - Total Amount Spent (Value): Rs. ${totalSpent.toFixed(2)}

            Based on these exact metrics, perform the following:
            1. Suggest a 'healthProfile' based on their age and gender (e.g., "Senior Male Wellness Care", "Young Adult Preventive Health").
            2. Suggest a 'recommendedPerk'.
            3. Calculate the 'autoBonus' loyalty points. Rule: Give 1 point for every Rs. 100 spent (Total Amount Spent / 100). Add a bonus of 10 points for every purchase made. If age > 60, add an extra 20 points. Provide the FINAL calculated integer value.

            Return ONLY a valid JSON object without any markdown code blocks, backticks, or extra text.
            Use EXACTLY this JSON format:
            {
                "healthProfile": "String",
                "recommendedPerk": "String",
                "autoBonus": Number
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(responseText);

        res.status(200).json(aiData);

    } catch (error) {
        console.error("AI Loyalty Insight Error:", error);
        res.status(500).json({ error: 'Failed to generate AI health insights' });
    }
};
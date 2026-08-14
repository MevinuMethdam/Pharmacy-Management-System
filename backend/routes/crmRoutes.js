const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');

router.get('/customers', crmController.getCustomers);
router.post('/customers', crmController.createCustomer);
router.put('/customers/:id', crmController.updateCustomer);
router.delete('/customers/:id', crmController.deleteCustomer);

router.get('/customers/:id/ai-insights', crmController.getAIHealthInsights);

router.get('/reminders', crmController.getReminders);
router.post('/reminders', crmController.createReminder);
router.put('/reminders/:id', crmController.updateReminder);
router.delete('/reminders/:id', crmController.deleteReminder);

module.exports = router;
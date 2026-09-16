const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/unread', notificationController.getUnreadNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.post('/trigger-expiry-emails', notificationController.triggerExpiryEmails);
router.post('/trigger-low-stock-emails', notificationController.triggerLowStockEmails);
router.post('/trigger-return-emails', notificationController.triggerReturnEmails);

module.exports = router;
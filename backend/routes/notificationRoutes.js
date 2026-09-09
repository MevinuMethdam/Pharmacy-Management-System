const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/unread', notificationController.getUnreadNotifications);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
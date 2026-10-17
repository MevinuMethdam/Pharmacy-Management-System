const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { triggerStockRequestEmails } = require('../controllers/notificationController');

const { verifyToken } = require('../middleware/authMiddleware');
const restockController = require('../controllers/restockController');

router.get('/restock-requests', verifyToken, restockController.listRequests);
router.put('/restock-requests/:id/accept', verifyToken, restockController.acceptRequest);
router.put('/restock-requests/:id/reject', verifyToken, restockController.rejectRequest);

router.get('/unread', notificationController.getUnreadNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.post('/trigger-expiry-emails', notificationController.triggerExpiryEmails);
router.post('/trigger-low-stock-emails', notificationController.triggerLowStockEmails);
router.post('/trigger-return-emails', notificationController.triggerReturnEmails);
router.post('/trigger-stock-request', triggerStockRequestEmails);

module.exports = router;

const Notification = require('../models/Notification');

exports.getUnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { isRead: false },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.update({ isRead: true }, { where: { id: id } });
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
};
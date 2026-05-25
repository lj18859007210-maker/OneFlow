const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const notificationController = require('../controllers/notificationController');

router.use(authMiddleware);
router.use(requirePermission('notification:view'));

router.get('/', notificationController.getList);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.remove);

module.exports = router;

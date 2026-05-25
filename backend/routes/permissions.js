const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permission');
const permissionController = require('../controllers/permissionController');

router.use(authMiddleware);

router.get('/', permissionController.getAll);
router.get('/modules', permissionController.getModules);
router.get('/role/:roleId', permissionController.getByRole);
router.put('/role/:roleId', requireRole('admin'), permissionController.assignPermissions);

module.exports = router;

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const permissionController = require('../controllers/permissionController');

router.use(authMiddleware);

router.get('/', requirePermission('permission:manage'), permissionController.getAll);
router.get('/modules', requirePermission('permission:manage'), permissionController.getModules);
router.get('/role/:roleId', requirePermission('permission:manage'), permissionController.getByRole);
router.put('/role/:roleId', requirePermission('permission:manage'), permissionController.assignPermissions);

module.exports = router;

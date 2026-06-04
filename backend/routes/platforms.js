const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const platformController = require('../controllers/platformController');

router.use(authMiddleware);

router.get('/', platformController.getPlatforms);
router.put('/', requirePermission('platform:manage'), platformController.updatePlatforms);

module.exports = router;

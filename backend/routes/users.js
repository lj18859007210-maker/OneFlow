const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const userController = require('../controllers/userController');

router.use(authMiddleware);
router.use(requirePermission('user:role:manage'));

router.get('/', userController.getAll);
router.put('/:id/role', userController.updateRole);

module.exports = router;

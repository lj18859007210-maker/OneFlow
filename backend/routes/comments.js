const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authMiddleware);

router.post('/', requirePermission('requirement:view'), commentController.create);
router.get('/:requirementId', requirePermission('requirement:view'), commentController.getList);

module.exports = router;

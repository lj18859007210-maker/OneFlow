const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const workflowController = require('../controllers/workflowController');

router.use(authMiddleware);

router.get('/requirement/statuses', requirePermission('requirement:view'), workflowController.getStatuses);
router.get('/requirement/transitions', requirePermission('requirement:view'), workflowController.getTransitions);
router.put('/requirement/statuses', requirePermission('workflow:manage'), workflowController.updateStatuses);
router.post('/requirement/transitions', requirePermission('workflow:manage'), workflowController.createTransition);
router.put('/requirement/transitions/:id', requirePermission('workflow:manage'), workflowController.updateTransition);
router.post('/requirement/reload', requirePermission('workflow:manage'), workflowController.reload);

module.exports = router;

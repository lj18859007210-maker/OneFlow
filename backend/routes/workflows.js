const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const workflowController = require('../controllers/workflowController');

router.use(authMiddleware);
router.use(requirePermission('workflow:manage'));

router.get('/requirement/statuses', workflowController.getStatuses);
router.put('/requirement/statuses', workflowController.updateStatuses);
router.get('/requirement/transitions', workflowController.getTransitions);
router.post('/requirement/transitions', workflowController.createTransition);
router.put('/requirement/transitions/:id', workflowController.updateTransition);
router.post('/requirement/reload', workflowController.reload);

module.exports = router;

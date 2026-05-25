const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { requirePermission } = require('../middleware/permission');
const developerController = require('../controllers/developerController');

router.use(authMiddleware);

router.get('/', requirePermission('developer:view'), developerController.getAll);
router.get('/load-stats', requirePermission('developer:view'), developerController.getLoadStats);
router.get('/departments', requirePermission('developer:view'), developerController.getDepartments);
router.get('/:id', requirePermission('developer:view'), developerController.getById);
router.post('/', requirePermission('developer:create'), auditMiddleware('create', 'developer'), developerController.create);
router.put('/:id', requirePermission('developer:update'), auditMiddleware('update', 'developer'), developerController.update);
router.delete('/:id', requirePermission('developer:delete'), auditMiddleware('delete', 'developer'), developerController.remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');
const authMiddleware = require('../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../middleware/permission');
const auditMiddleware = require('../middleware/audit');
const { clearCacheByPattern } = require('../middleware/cache');

router.use(authMiddleware);

router.get('/', requirePermission('requirement:view'), requirementController.getAll);
router.get('/approval-list', requirePermission('requirement:approve'), requirementController.getApprovalList);
router.get('/my', requirePermission('requirement:view'), requirementController.getBySubmitter);
router.get('/drafts', requirePermission('requirement:view'), requirementController.getDrafts);
router.get('/drafts/latest', requirePermission('requirement:view'), requirementController.getLatestDraft);
router.get('/gantt', requirePermission('project:timeline:view'), requirementController.getGanttData);
router.get('/dashboard', requirePermission('requirement:view'), requirementController.getDashboard);
router.get('/:id', requirePermission('requirement:view'), requirementController.getById);

// 写操作后清除缓存
const clearCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (body?.success) {
      clearCacheByPattern('/api/requirements');
    }
    return originalJson(body);
  };
  next();
};

router.post('/', requirePermission('requirement:create'), clearCache, auditMiddleware('create', 'requirement'), requirementController.create);
router.put('/:id', requireAnyPermission('requirement:update', 'requirement:create'), clearCache, auditMiddleware('update', 'requirement'), requirementController.update);
router.delete('/:id', clearCache, auditMiddleware('delete', 'requirement'), requirementController.remove);
router.put('/:id/status', requirePermission('requirement:update'), clearCache, auditMiddleware('update_status', 'requirement'), requirementController.updateStatus);
router.put('/:id/approve', requirePermission('requirement:approve'), clearCache, auditMiddleware('approve', 'requirement'), requirementController.approve);
router.put('/:id/score', requirePermission('requirement:score'), clearCache, auditMiddleware('score', 'requirement'), requirementController.score);

module.exports = router;

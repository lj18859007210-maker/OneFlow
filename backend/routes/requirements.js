const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { clearCacheByPattern } = require('../middleware/cache');

router.use(authMiddleware);

router.get('/', requirementController.getAll);
router.get('/approval-list', requirementController.getApprovalList);
router.get('/my', requirementController.getBySubmitter);
router.get('/drafts', requirementController.getDrafts);
router.get('/drafts/latest', requirementController.getLatestDraft);
router.get('/gantt', requirementController.getGanttData);
router.get('/:id', requirementController.getById);

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

router.post('/', clearCache, auditMiddleware('create', 'requirement'), requirementController.create);
router.put('/:id', clearCache, auditMiddleware('update', 'requirement'), requirementController.update);
router.delete('/:id', clearCache, auditMiddleware('delete', 'requirement'), requirementController.remove);
router.put('/:id/status', clearCache, auditMiddleware('update_status', 'requirement'), requirementController.updateStatus);
router.put('/:id/approve', clearCache, auditMiddleware('approve', 'requirement'), requirementController.approve);
router.put('/:id/score', clearCache, auditMiddleware('score', 'requirement'), requirementController.score);

module.exports = router;

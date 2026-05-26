const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { clearCacheByPattern } = require('../middleware/cache');

router.use(authMiddleware);

const clearCommentCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (body?.success) {
      clearCacheByPattern('/api/comments');
    }
    return originalJson(body);
  };
  next();
};

router.post('/', requirePermission('requirement:view'), clearCommentCache, commentController.create);
router.get('/:requirementId', requirePermission('requirement:view'), commentController.getList);

module.exports = router;

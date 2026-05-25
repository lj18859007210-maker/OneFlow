const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const developerController = require('../controllers/developerController');

router.use(authMiddleware);

router.get('/', developerController.getAll);
router.get('/load-stats', developerController.getLoadStats);
router.get('/departments', developerController.getDepartments);
router.get('/:id', developerController.getById);
router.post('/', auditMiddleware('create', 'developer'), developerController.create);
router.put('/:id', auditMiddleware('update', 'developer'), developerController.update);
router.delete('/:id', auditMiddleware('delete', 'developer'), developerController.remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const auditController = require('../controllers/auditLogController');

router.use(authMiddleware);

router.get('/', auditController.getList);
router.get('/actions', auditController.getActions);

module.exports = router;

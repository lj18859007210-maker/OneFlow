const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', commentController.create);
router.get('/:requirementId', commentController.getList);

module.exports = router;

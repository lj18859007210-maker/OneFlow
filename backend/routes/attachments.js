const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { requirePermission } = require('../middleware/permission');
const { createUploader } = require('../utils/attachmentStorage');

const formalUpload = createUploader('formal');
const commentUpload = createUploader('comment');

router.use(authMiddleware);

router.get('/requirements/:requirementId', requirePermission('attachment:view'), attachmentController.listByRequirement);
router.get('/files/:kind/:id', requirePermission('attachment:view'), attachmentController.downloadFile);
router.post(
  '/requirements/:requirementId/upload',
  requirePermission('attachment:upload'),
  formalUpload.single('file'),
  auditMiddleware('upload_attachment', 'attachment'),
  attachmentController.uploadFormal
);
router.post(
  '/comments/upload',
  requirePermission('attachment:upload'),
  commentUpload.array('files', 5),
  auditMiddleware('upload_comment_attachment', 'attachment'),
  attachmentController.uploadComment
);
router.post(
  '/:attachmentId/versions',
  requirePermission('attachment:version:manage'),
  formalUpload.single('file'),
  auditMiddleware('upload_attachment_version', 'attachment'),
  attachmentController.addVersion
);
router.post(
  '/comments/:commentAttachmentId/promote',
  requirePermission('attachment:promote'),
  auditMiddleware('promote_comment_attachment', 'attachment'),
  attachmentController.promoteCommentAttachment
);
router.delete(
  '/:attachmentId',
  requirePermission('attachment:delete'),
  auditMiddleware('delete_attachment', 'attachment'),
  attachmentController.remove
);

module.exports = router;

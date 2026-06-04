const fs = require('fs');
const attachmentModel = require('../models/attachment');
const { getAttachmentActions } = require('../utils/attachmentPolicy');
const { resolveStoragePath, toStoredFileInfo } = require('../utils/attachmentStorage');
const autoEmailService = require('../utils/autoEmailService');

function hasPermission(user, permission) {
  return user?.role === 'admin'
    || user?.role === 'role-admin'
    || (Array.isArray(user?.permissions) && user.permissions.includes(permission));
}

function serializeAttachmentForUser(attachment, permissions = []) {
  const actions = getAttachmentActions({
    permissions,
    attachment: {
      sourceType: attachment.sourceType,
      currentVersionId: attachment.currentVersionId,
      previewable: attachment.summary?.previewable === true
    }
  });

  return {
    id: attachment.id,
    requirementId: attachment.requirementId,
    category: attachment.category,
    originalName: attachment.originalName,
    sourceType: attachment.sourceType,
    sourceCommentId: attachment.sourceCommentId,
    linkedCommentAttachmentId: attachment.linkedCommentAttachmentId,
    status: attachment.status,
    createdBy: attachment.createdBy,
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
    summary: attachment.summary,
    currentVersion: attachment.currentVersion,
    versions: attachment.versions || [],
    linkedCommentAttachment: attachment.linkedCommentAttachment || null,
    actions
  };
}

function streamFile(res, fileRecord, mode = 'download', fileName = 'attachment') {
  if (!fileRecord?.storagePath) {
    return res.status(404).json({ success: false, message: 'file not found' });
  }

  const absolutePath = resolveStoragePath(fileRecord.storagePath);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ success: false, message: 'file not found' });
  }

  res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${mode === 'inline' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );
  return fs.createReadStream(absolutePath).pipe(res);
}

async function listByRequirement(req, res) {
  try {
    const attachments = await attachmentModel.listByRequirementId(req.params.requirementId);
    res.json({
      success: true,
      data: attachments.map(attachment => serializeAttachmentForUser(attachment, req.user?.permissions || []))
    });
  } catch (error) {
    console.error('list attachments error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function uploadFormal(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    if (!req.body.category) {
      return res.status(400).json({ success: false, message: 'category is required' });
    }

    const attachment = await attachmentModel.createFormalAttachment({
      requirementId: req.params.requirementId,
      category: req.body.category,
      remark: req.body.remark || null,
      createdBy: req.user?.id || req.user?.username || 'unknown',
      file: toStoredFileInfo('formal', req.file)
    });
    try {
      await autoEmailService.enqueueRequirementEvent({
        requirementId: req.params.requirementId,
        eventType: 'attachment_uploaded',
        actorName: req.user?.name || req.user?.username,
        summary: `上传附件：${attachment.originalName || req.file.originalname}`
      });
    } catch (emailError) {
      console.error('queue formal attachment email error:', emailError.message);
    }
    res.status(201).json({
      success: true,
      data: serializeAttachmentForUser(attachment, req.user?.permissions || [])
    });
  } catch (error) {
    console.error('upload formal attachment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function uploadComment(req, res) {
  try {
    if (!req.body.requirementId) {
      return res.status(400).json({ success: false, message: 'requirementId is required' });
    }
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'files are required' });
    }

    const attachments = await attachmentModel.createPendingCommentAttachments({
      requirementId: req.body.requirementId,
      createdBy: req.user?.id || req.user?.username || 'unknown',
      files: req.files.map(file => toStoredFileInfo('comment', file))
    });
    try {
      await autoEmailService.enqueueRequirementEvent({
        requirementId: req.body.requirementId,
        eventType: 'attachment_uploaded',
        actorName: req.user?.name || req.user?.username,
        summary: `上传评论附件：${attachments.map(item => item.originalName).join('、')}`
      });
    } catch (emailError) {
      console.error('queue comment attachment email error:', emailError.message);
    }
    res.status(201).json({ success: true, data: attachments });
  } catch (error) {
    console.error('upload comment attachment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function addVersion(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    const attachment = await attachmentModel.addAttachmentVersion({
      attachmentId: req.params.attachmentId,
      remark: req.body.remark || null,
      createdBy: req.user?.id || req.user?.username || 'unknown',
      file: toStoredFileInfo('formal', req.file)
    });
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'attachment not found' });
    }
    try {
      await autoEmailService.enqueueRequirementEvent({
        requirementId: attachment.requirementId,
        eventType: 'attachment_uploaded',
        actorName: req.user?.name || req.user?.username,
        summary: `上传附件新版本：${attachment.originalName || req.file.originalname}`
      });
    } catch (emailError) {
      console.error('queue attachment version email error:', emailError.message);
    }
    res.json({
      success: true,
      data: serializeAttachmentForUser(attachment, req.user?.permissions || [])
    });
  } catch (error) {
    console.error('add attachment version error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function promoteCommentAttachment(req, res) {
  try {
    const { requirementId, category } = req.body;
    if (!requirementId || !category) {
      return res.status(400).json({ success: false, message: 'requirementId and category are required' });
    }
    const attachment = await attachmentModel.promoteCommentAttachment({
      requirementId,
      commentAttachmentId: req.params.commentAttachmentId,
      category,
      createdBy: req.user?.id || req.user?.username || 'unknown'
    });
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'comment attachment not found' });
    }
    try {
      await autoEmailService.enqueueRequirementEvent({
        requirementId,
        eventType: 'attachment_uploaded',
        actorName: req.user?.name || req.user?.username,
        summary: `归档评论附件：${attachment.originalName}`
      });
    } catch (emailError) {
      console.error('queue promoted attachment email error:', emailError.message);
    }
    res.status(201).json({
      success: true,
      data: serializeAttachmentForUser(attachment, req.user?.permissions || [])
    });
  } catch (error) {
    console.error('promote comment attachment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function remove(req, res) {
  try {
    const removed = await attachmentModel.deleteRequirementAttachment(req.params.attachmentId);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'attachment not found' });
    }
    res.json({ success: true, message: 'attachment removed' });
  } catch (error) {
    console.error('delete attachment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function downloadFile(req, res) {
  try {
    const mode = req.query.mode === 'inline' ? 'inline' : 'download';
    if (mode === 'inline' && !hasPermission(req.user, 'attachment:preview')) {
      return res.status(403).json({ success: false, message: 'missing attachment:preview permission' });
    }
    if (mode === 'download' && !hasPermission(req.user, 'attachment:download')) {
      return res.status(403).json({ success: false, message: 'missing attachment:download permission' });
    }

    if (req.params.kind === 'version') {
      const version = await attachmentModel.getAttachmentVersionById(req.params.id);
      if (!version) {
        return res.status(404).json({ success: false, message: 'file not found' });
      }
      return streamFile(res, version, mode, `attachment-v${version.versionNo}`);
    }

    if (req.params.kind === 'comment') {
      const commentAttachment = await attachmentModel.getCommentAttachmentById(req.params.id);
      if (!commentAttachment) {
        return res.status(404).json({ success: false, message: 'file not found' });
      }
      return streamFile(res, commentAttachment, mode, commentAttachment.originalName);
    }

    return res.status(400).json({ success: false, message: 'invalid file kind' });
  } catch (error) {
    console.error('download attachment file error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  listByRequirement,
  uploadFormal,
  uploadComment,
  addVersion,
  promoteCommentAttachment,
  remove,
  downloadFile,
  serializeAttachmentForUser
};

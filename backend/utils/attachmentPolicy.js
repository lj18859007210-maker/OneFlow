const ATTACHMENT_CATEGORIES = ['requirement', 'design', 'test-report', 'acceptance'];

function canPreviewMimeType(mimeType) {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function createAttachmentSummary(attachment) {
  const currentVersion = attachment?.currentVersion || null;
  return {
    id: attachment?.id || null,
    category: attachment?.category || null,
    sourceType: attachment?.sourceType || 'formal',
    originalName: attachment?.originalName || null,
    currentVersionId: currentVersion?.id || null,
    versionNo: currentVersion?.versionNo || null,
    mimeType: currentVersion?.mimeType || null,
    fileSize: currentVersion?.fileSize || null,
    previewable: canPreviewMimeType(currentVersion?.mimeType || null)
  };
}

function getAttachmentActions({ permissions = [], attachment = {} } = {}) {
  const hasPermission = (permission) => permissions.includes(permission) || permissions.includes('*');

  return {
    canView: hasPermission('attachment:view'),
    canPreview: hasPermission('attachment:preview') && attachment.previewable === true,
    canDownload: hasPermission('attachment:download'),
    canDelete: hasPermission('attachment:delete'),
    canManageVersions: hasPermission('attachment:version:manage'),
    canPromote: hasPermission('attachment:promote') && attachment.sourceType === 'comment-link' && !attachment.currentVersionId
  };
}

module.exports = {
  ATTACHMENT_CATEGORIES,
  canPreviewMimeType,
  createAttachmentSummary,
  getAttachmentActions
};

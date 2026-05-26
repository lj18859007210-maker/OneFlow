const assert = require('assert');

const {
  ATTACHMENT_CATEGORIES,
  canPreviewMimeType,
  getAttachmentActions,
  createAttachmentSummary
} = require('./utils/attachmentPolicy');

function run() {
  assert.deepStrictEqual(
    ATTACHMENT_CATEGORIES,
    ['requirement', 'design', 'test-report', 'acceptance'],
    'attachment categories should match the approved fixed slots'
  );

  assert.strictEqual(canPreviewMimeType('image/png'), true, 'images should be previewable');
  assert.strictEqual(canPreviewMimeType('application/pdf'), true, 'pdf should be previewable');
  assert.strictEqual(
    canPreviewMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    false,
    'office documents should not be previewable in v1'
  );

  const formalSummary = createAttachmentSummary({
    id: 'att-1',
    sourceType: 'formal',
    category: 'design',
    originalName: 'api-design.pdf',
    currentVersion: {
      id: 'ver-3',
      versionNo: 3,
      mimeType: 'application/pdf',
      fileSize: 1024
    }
  });

  assert.deepStrictEqual(
    formalSummary,
    {
      id: 'att-1',
      category: 'design',
      sourceType: 'formal',
      originalName: 'api-design.pdf',
      currentVersionId: 'ver-3',
      versionNo: 3,
      mimeType: 'application/pdf',
      fileSize: 1024,
      previewable: true
    },
    'formal attachment summary should surface the current version and preview capability'
  );

  const actions = getAttachmentActions({
    permissions: [
      'attachment:view',
      'attachment:preview',
      'attachment:download',
      'attachment:version:manage',
      'attachment:promote'
    ],
    attachment: {
      sourceType: 'comment-link',
      currentVersionId: null,
      previewable: true
    }
  });

  assert.deepStrictEqual(
    actions,
    {
      canView: true,
      canPreview: true,
      canDownload: true,
      canDelete: false,
      canManageVersions: true,
      canPromote: true
    },
    'attachment actions should reflect permissions and source-type-specific promotion behavior'
  );

  console.log('attachment policy tests passed');
}

run();

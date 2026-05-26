const assert = require('assert');

const { PERMISSIONS, ROLE_DEFAULT_PERMISSION_CODES } = require('./utils/permissionCatalog');

function run() {
  const attachmentPermissions = PERMISSIONS.filter(permission => permission.module === 'attachment');
  const attachmentCodes = attachmentPermissions.map(permission => permission.code);

  assert.deepStrictEqual(
    attachmentCodes,
    [
      'attachment:view',
      'attachment:preview',
      'attachment:upload',
      'attachment:download',
      'attachment:delete',
      'attachment:version:manage',
      'attachment:promote'
    ],
    'attachment permission catalog should expose the 7 planned permissions in order'
  );

  assert.deepStrictEqual(
    ROLE_DEFAULT_PERMISSION_CODES.admin.filter(code => code.startsWith('attachment:')),
    attachmentCodes,
    'admin defaults should include all attachment permissions'
  );

  assert.deepStrictEqual(
    ROLE_DEFAULT_PERMISSION_CODES.user.filter(code => code.startsWith('attachment:')),
    ['attachment:view', 'attachment:preview', 'attachment:upload', 'attachment:download', 'attachment:promote'],
    'user defaults should allow viewing, previewing, uploading, downloading, and promoting attachments'
  );

  assert.deepStrictEqual(
    ROLE_DEFAULT_PERMISSION_CODES.developer.filter(code => code.startsWith('attachment:')),
    ['attachment:view', 'attachment:preview', 'attachment:upload', 'attachment:download', 'attachment:version:manage'],
    'developer defaults should allow formal attachment work including version management'
  );

  console.log('attachment permission catalog tests passed');
}

run();

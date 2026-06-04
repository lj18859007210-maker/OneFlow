const assert = require('assert');
const { PERMISSIONS, ROLE_DEFAULT_PERMISSION_CODES } = require('./utils/permissionCatalog');

const platformPermission = PERMISSIONS.find(permission => permission.code === 'platform:manage');

assert.ok(platformPermission, 'platform:manage should be registered in permission catalog');
assert.strictEqual(platformPermission.module, 'platform');
assert.strictEqual(platformPermission.name, '平台配置');
assert.ok(
  ROLE_DEFAULT_PERMISSION_CODES.admin.includes('platform:manage'),
  'admin role defaults should include platform:manage'
);
assert.ok(
  !ROLE_DEFAULT_PERMISSION_CODES.user.includes('platform:manage'),
  'user role defaults should not include platform:manage'
);
assert.ok(
  !ROLE_DEFAULT_PERMISSION_CODES.developer.includes('platform:manage'),
  'developer role defaults should not include platform:manage'
);

console.log('platform permission catalog tests passed');

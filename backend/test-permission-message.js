const assert = require('assert');

async function run() {
  const message = await import('../frontend/src/utils/permissionMessages.js');
  assert.strictEqual(
    message.getPermissionSaveSuccessMessage(),
    '权限保存成功，当前登录态已自动刷新。'
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

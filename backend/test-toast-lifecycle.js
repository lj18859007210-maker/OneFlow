const assert = require('assert');

async function run() {
  const toast = await import('../frontend/src/utils/toastLifecycle.js');
  const snapshots = [];

  const controller = toast.createToastLifecycle((state) => {
    snapshots.push({ ...state });
  }, 20);

  controller.show('权限保存成功，当前登录态已自动刷新。', { type: 'success' });

  assert.strictEqual(controller.state.visible, true);
  assert.strictEqual(controller.state.message, '权限保存成功，当前登录态已自动刷新。');
  assert.strictEqual(controller.state.type, 'success');

  await new Promise(resolve => setTimeout(resolve, 40));

  assert.strictEqual(controller.state.visible, false);
  assert.ok(snapshots.some(s => s.visible === true));
  assert.ok(snapshots.some(s => s.visible === false));
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

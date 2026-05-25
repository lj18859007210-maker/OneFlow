const assert = require('assert');

async function run() {
  const toast = await import('../frontend/src/utils/toastService.js');

  toast.hideToast();
  toast.showToast('保存成功', { type: 'success', duration: 20, title: '提示' });

  assert.strictEqual(toast.toastState.visible.value, true);
  assert.strictEqual(toast.toastState.message.value, '保存成功');
  assert.strictEqual(toast.toastState.type.value, 'success');
  assert.strictEqual(toast.toastState.title.value, '提示');

  await new Promise(resolve => setTimeout(resolve, 40));

  assert.strictEqual(toast.toastState.visible.value, false);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

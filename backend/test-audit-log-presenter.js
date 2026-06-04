const assert = require('assert');
const auditLogPresenter = require('./utils/auditLogPresenter');

function run() {
  assert.strictEqual(typeof auditLogPresenter.enrichAuditLog, 'function');

  const statusLog = auditLogPresenter.enrichAuditLog({
    userName: '刘洋',
    action: 'update_status',
    resource: 'requirement',
    resourceId: 'demo-dashboard-073',
    details: {
      method: 'PUT',
      url: '/api/requirements/demo-dashboard-073/status',
      body: { status: '测试中' }
    },
    status: 'success'
  });

  assert.strictEqual(statusLog.actionLabel, '变更需求状态');
  assert.strictEqual(statusLog.resourceLabel, '需求');
  assert.strictEqual(statusLog.summary, '刘洋 将需求 demo-dashboard-073 的状态变更为「测试中」');
  assert.strictEqual(statusLog.resultLabel, '成功');
  assert.deepStrictEqual(statusLog.raw, {
    action: 'update_status',
    resource: 'requirement',
    resourceId: 'demo-dashboard-073'
  });

  const approvalLog = auditLogPresenter.enrichAuditLog({
    userName: '王敏',
    action: 'approve',
    resource: 'requirement',
    resourceId: 'req-100',
    details: { body: { approved: false, reason: '信息不完整' } },
    status: 'failed'
  });

  assert.strictEqual(approvalLog.actionLabel, '审批需求');
  assert.strictEqual(approvalLog.summary, '王敏 驳回了需求 req-100，原因：信息不完整');
  assert.strictEqual(approvalLog.resultLabel, '失败');

  const unknownLog = auditLogPresenter.enrichAuditLog({
    userName: 'system',
    action: 'archive_x',
    resource: 'unknown_resource',
    resourceId: 'abc-1',
    details: {},
    status: 'success'
  });

  assert.strictEqual(unknownLog.actionLabel, 'archive_x');
  assert.strictEqual(unknownLog.resourceLabel, 'unknown_resource');
  assert.strictEqual(unknownLog.summary, 'system 对 unknown_resource abc-1 执行 archive_x');

  console.log('audit log presenter tests passed');
}

run();

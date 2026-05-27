const assert = require('assert');

const workflowModel = require('./models/workflow');

function run() {
  const approvalFlow = workflowModel.normalizeTransitionPayload({
    fromStatus: '待审批',
    toStatus: '待评审',
    allowedRoles: ['admin'],
    requireApproval: true,
    approvalOutcome: 'none'
  });

  assert.strictEqual(approvalFlow.requireApproval, true);
  assert.strictEqual(
    approvalFlow.approvalOutcome,
    'none',
    'validation should still see the originally invalid approval outcome'
  );
  assert.throws(
    () => workflowModel.validateTransitionPayload(approvalFlow),
    /approved|rejected/,
    'approval flows should reject "none" as approvalOutcome'
  );

  const directFlow = workflowModel.normalizeTransitionPayload({
    fromStatus: '待评审',
    toStatus: '待开发',
    allowedRoles: ['developer'],
    requireApproval: false,
    approvalOutcome: 'approved'
  });

  assert.strictEqual(directFlow.requireApproval, false);
  assert.strictEqual(
    directFlow.approvalOutcome,
    'none',
    'non-approval flows should always normalize approvalOutcome to none'
  );
  assert.doesNotThrow(
    () => workflowModel.validateTransitionPayload(directFlow),
    'normalized direct transitions should pass validation'
  );
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

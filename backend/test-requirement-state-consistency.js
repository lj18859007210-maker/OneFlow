const assert = require('assert');

const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(
    typeof requirementModel.getConsistentRequirementState,
    'function',
    'requirement model should expose getConsistentRequirementState'
  );

  assert.deepStrictEqual(
    requirementModel.getConsistentRequirementState({
      status: '开发中',
      approvalStatus: 'pending'
    }),
    {
      status: '待审批',
      approvalStatus: 'pending',
      repaired: true
    }
  );

  assert.deepStrictEqual(
    requirementModel.getConsistentRequirementState({
      status: '测试中',
      approvalStatus: 'rejected'
    }),
    {
      status: '待审批',
      approvalStatus: 'rejected',
      repaired: true
    }
  );

  assert.deepStrictEqual(
    requirementModel.getConsistentRequirementState({
      status: '待审批',
      approvalStatus: 'approved'
    }),
    {
      status: '待评审',
      approvalStatus: 'approved',
      repaired: true
    }
  );

  assert.deepStrictEqual(
    requirementModel.getConsistentRequirementState({
      status: '待开发',
      approvalStatus: 'approved'
    }),
    {
      status: '待开发',
      approvalStatus: 'approved',
      repaired: false
    }
  );
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

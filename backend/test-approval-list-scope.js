const assert = require('assert');

const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(
    typeof requirementModel.resolveApprovalListScope,
    'function',
    'requirement model should expose resolveApprovalListScope'
  );

  assert.deepStrictEqual(
    requirementModel.resolveApprovalListScope({ role: 'admin', permissions: ['requirement:approve'] }),
    { type: 'all' }
  );

  assert.deepStrictEqual(
    requirementModel.resolveApprovalListScope({ role: 'developer', permissions: ['requirement:approve'] }),
    { type: 'assigned' }
  );

  assert.deepStrictEqual(
    requirementModel.resolveApprovalListScope({ role: 'user', permissions: ['requirement:approve'] }),
    { type: 'all' }
  );

  assert.deepStrictEqual(
    requirementModel.resolveApprovalListScope({ role: 'user', permissions: [] }),
    { type: 'none' }
  );
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

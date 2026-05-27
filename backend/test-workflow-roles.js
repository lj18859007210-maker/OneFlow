const assert = require('assert');

const workflowModel = require('./models/workflow');

function run() {
  assert.strictEqual(
    typeof workflowModel.normalizeRoles,
    'function',
    'workflow model should expose normalizeRoles'
  );

  assert.deepStrictEqual(
    workflowModel.normalizeRoles(['developer', '[object Object]', 'developer']),
    ['developer']
  );

  assert.deepStrictEqual(
    workflowModel.normalizeRoles([{ value: 'developer' }, { value: 'admin' }]),
    ['developer', 'admin']
  );

  assert.deepStrictEqual(
    workflowModel.normalizeRoles('["[object Object]","developer","admin"]'),
    ['developer', 'admin']
  );
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

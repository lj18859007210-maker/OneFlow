const assert = require('assert');
const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(
    typeof requirementModel.canUserDeleteRequirement,
    'function',
    'requirement model should expose canUserDeleteRequirement'
  );

  const requirement = {
    submitterId: 'submitter-1',
    submitter: '提交人',
    developerIds: 'developer-1, developer-2',
    developer: '张伟, 王磊'
  };

  assert.strictEqual(
    requirementModel.canUserDeleteRequirement({ role: 'admin', id: 'other' }, requirement),
    true,
    'admin should delete any requirement'
  );
  assert.strictEqual(
    requirementModel.canUserDeleteRequirement({ role: 'developer', id: 'developer-1', name: '张伟' }, requirement),
    true,
    'assigned developer should delete assigned requirement by id'
  );
  assert.strictEqual(
    requirementModel.canUserDeleteRequirement({ role: 'role-developer', id: 'developer-9', name: '王磊' }, requirement),
    true,
    'assigned developer should delete assigned requirement by name'
  );
  assert.strictEqual(
    requirementModel.canUserDeleteRequirement({ role: 'developer', id: 'developer-9', name: '赵六' }, requirement),
    false,
    'unassigned developer should not delete requirement'
  );
  assert.strictEqual(
    requirementModel.canUserDeleteRequirement({ role: 'user', id: 'submitter-1', name: '提交人' }, requirement),
    false,
    'plain submitter should not delete submitted requirement without delete permission'
  );

  console.log('requirement delete access tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

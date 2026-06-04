const assert = require('assert');
const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(
    typeof requirementModel.normalizeDeveloperNames,
    'function',
    'requirement model should expose normalizeDeveloperNames'
  );
  assert.strictEqual(
    typeof requirementModel.serializeDeveloperNames,
    'function',
    'requirement model should expose serializeDeveloperNames'
  );

  assert.deepStrictEqual(
    requirementModel.normalizeDeveloperNames([' 张三 ', '李四', '张三', '', null]),
    ['张三', '李四']
  );
  assert.deepStrictEqual(
    requirementModel.normalizeDeveloperNames('张三, 李四，王五；赵六'),
    ['张三', '李四', '王五', '赵六']
  );
  assert.strictEqual(
    requirementModel.serializeDeveloperNames(['张三', '李四']),
    '张三, 李四'
  );

  const listFilters = requirementModel.buildRequirementListFilters({ developer: '李四' });
  assert.match(listFilters.whereClause, /REPLACE\(developer, ' ', ''\)/);
  assert.match(listFilters.whereClause, /LIKE :developerPattern/);
  assert.strictEqual(listFilters.params.developerPattern, '%,李四,%');
  assert.strictEqual(listFilters.params.developer, undefined);

  const approvalFilters = requirementModel.buildApprovalListFilters({ developer: '王五' });
  assert.match(approvalFilters.whereClause, /REPLACE\(developer, ' ', ''\)/);
  assert.match(approvalFilters.whereClause, /LIKE :developerPattern/);
  assert.strictEqual(approvalFilters.params.developerPattern, '%,王五,%');
  assert.strictEqual(approvalFilters.params.developer, undefined);

  console.log('requirement multiple developer tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

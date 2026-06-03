const assert = require('assert');

const db = require('./db/oracle');
const requirementController = require('./controllers/requirementController');

async function run() {
  assert.strictEqual(
    typeof requirementController.resolveAssignableDeveloper,
    'function',
    'requirement controller should expose resolveAssignableDeveloper'
  );

  const originalGetConnection = db.getConnection;
  const queries = [];

  db.getConnection = async () => ({
    async execute(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
    async close() {}
  });

  try {
    await assert.rejects(
      requirementController.resolveAssignableDeveloper('非开发人员'),
      /请选择用户角色管理中的启用开发人员或管理员/
    );

    assert.strictEqual(queries.length, 1);
    assert.match(queries[0].sql, /FROM users/);
    assert.match(queries[0].sql, /name = :devName/);
    assert.match(queries[0].sql, /role IN \('developer', 'role-developer', 'admin', 'role-admin'\)/);
    assert.match(queries[0].sql, /status = 1/);
    assert.deepStrictEqual(queries[0].params, { devName: '非开发人员' });
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('requirement developer assignment tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

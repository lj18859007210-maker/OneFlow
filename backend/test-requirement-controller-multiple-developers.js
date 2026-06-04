const assert = require('assert');

const db = require('./db/oracle');
const requirementController = require('./controllers/requirementController');

async function run() {
  assert.strictEqual(
    typeof requirementController.resolveAssignableDevelopers,
    'function',
    'requirement controller should expose resolveAssignableDevelopers'
  );

  const originalGetConnection = db.getConnection;
  const queries = [];

  db.getConnection = async () => ({
    async execute(sql, params) {
      queries.push({ sql, params });
      return {
        rows: [
          { ID: 'dev-1', NAME: '张三' },
          { ID: 'dev-2', NAME: '李四' }
        ]
      };
    },
    async close() {}
  });

  try {
    const developers = await requirementController.resolveAssignableDevelopers([' 张三 ', '李四', '张三']);
    assert.deepStrictEqual(developers, [
      { id: 'dev-1', name: '张三' },
      { id: 'dev-2', name: '李四' }
    ]);

    assert.strictEqual(queries.length, 1);
    assert.match(queries[0].sql, /name IN \(:devName0, :devName1\)/);
    assert.match(queries[0].sql, /role IN \('developer', 'role-developer', 'admin', 'role-admin'\)/);
    assert.match(queries[0].sql, /status = 1/);
    assert.deepStrictEqual(queries[0].params, { devName0: '张三', devName1: '李四' });
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('requirement controller multiple developer tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

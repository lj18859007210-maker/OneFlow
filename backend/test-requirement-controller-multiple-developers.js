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
          { ID: 'dev-1', USERNAME: 'zhangsan', NAME: '张三' },
          { ID: 'dev-2', USERNAME: 'lisi', NAME: '李四' }
        ]
      };
    },
    async close() {}
  });

  try {
    const developers = await requirementController.resolveAssignableDevelopers([
      { userId: 'dev-1', username: 'zhangsan', name: '张三' },
      { userId: 'dev-2', username: 'lisi', name: '李四' },
      { userId: 'dev-1', username: 'zhangsan', name: '张三' }
    ]);
    assert.deepStrictEqual(developers, [
      { id: 'dev-1', username: 'zhangsan', name: '张三' },
      { id: 'dev-2', username: 'lisi', name: '李四' }
    ]);

    assert.strictEqual(queries.length, 1);
    assert.match(queries[0].sql, /id = :devId0/);
    assert.match(queries[0].sql, /username = :devUsername0/);
    assert.match(queries[0].sql, /name = :devName0/);
    assert.match(queries[0].sql, /role IN \('developer', 'role-developer', 'admin', 'role-admin'\)/);
    assert.match(queries[0].sql, /status = 1/);
    assert.deepStrictEqual(queries[0].params, {
      devId0: 'dev-1',
      devUsername0: 'zhangsan',
      devName0: '张三',
      devId1: 'dev-2',
      devUsername1: 'lisi',
      devName1: '李四'
    });
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('requirement controller multiple developer tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

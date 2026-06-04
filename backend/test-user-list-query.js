const assert = require('assert');
const db = require('./db/oracle');
const userModel = require('./models/userModel');

async function run() {
  const executed = [];
  const originalGetConnection = db.getConnection;

  db.getConnection = async () => ({
    async execute(sql, params) {
      executed.push({ sql, params });
      if (/COUNT\(\*\)/i.test(sql)) {
        return { rows: [[42]] };
      }
      return {
        rows: [{
          ID: 'user-1',
          USERNAME: 'dev01',
          NAME: '张三',
          EMAIL: 'zhangsan@example.com',
          ROLE: 'developer',
          STATUS: 1,
          CREATEDAT: new Date('2026-06-01T00:00:00.000Z'),
          UPDATEDAT: new Date('2026-06-02T00:00:00.000Z')
        }]
      };
    },
    async close() {}
  });

  try {
    const result = await userModel.getAll({
      page: 2,
      pageSize: 20,
      role: 'developer',
      keyword: '张三'
    });

    assert.strictEqual(result.total, 42);
    assert.strictEqual(result.page, 2);
    assert.strictEqual(result.pageSize, 20);
    assert.strictEqual(result.data[0].USERNAME, 'dev01');
    assert.match(executed[0].sql, /ROW_NUMBER\(\) OVER \(ORDER BY createdAt DESC\)/i);
    assert.match(executed[0].sql, /role IN \(:role0, :role1\)/i);
    assert.match(executed[0].sql, /LOWER\(name\) LIKE :keyword/i);
    assert.match(executed[0].sql, /LOWER\(username\) LIKE :keyword/i);
    assert.match(executed[0].sql, /LOWER\(email\) LIKE :keyword/i);
    assert.strictEqual(executed[0].params.role0, 'developer');
    assert.strictEqual(executed[0].params.role1, 'role-developer');
    assert.strictEqual(executed[0].params.keyword, '%张三%');
    assert.strictEqual(executed[0].params.offset, 20);
    assert.strictEqual(executed[0].params.limit, 40);
    assert.strictEqual(executed.length, 2);
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('user list query tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

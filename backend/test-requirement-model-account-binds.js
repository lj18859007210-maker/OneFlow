const assert = require('assert');

const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

function extractPlaceholders(sql) {
  return [...new Set(String(sql).match(/:\w+/g) || [])].map(item => item.slice(1));
}

async function run() {
  const originalGetConnection = db.getConnection;
  const executions = [];

  db.getConnection = async () => ({
    async execute(sql, binds = {}) {
      executions.push({ sql, binds });
      if (Array.isArray(binds)) {
        return { rows: [], rowsAffected: 1 };
      }
      const placeholders = extractPlaceholders(sql);
      placeholders.forEach((placeholder) => {
        assert.ok(
          Object.prototype.hasOwnProperty.call(binds, placeholder),
          `missing bind value for ${placeholder}`
        );
      });
      Object.keys(binds).forEach((key) => {
        assert.ok(placeholders.includes(key), `extra bind value for ${key}`);
      });
      if (/SELECT \* FROM requirements WHERE id = :id/i.test(sql)) {
        return { rows: [] };
      }
      return { rows: [], rowsAffected: 1 };
    },
    async commit() {},
    async close() {}
  });

  try {
    await requirementModel.create({
      title: '账号绑定测试',
      submitter: '需求人员A',
      submitterId: 'submitter-a',
      developer: [{ id: 'dev-demo-liuyang', userId: 'dev-demo-liuyang', username: 'demo_liuyang', name: '刘洋' }],
      developerIds: ['dev-demo-liuyang'],
      platform: '测试平台',
      capability: '测试能力',
      expectedDate: '2026-06-04',
      avgDevTime: '1',
      postDevAvgTime: '1',
      avgMonthlyCalls: 1
    });

    assert.ok(executions.some(item => /INSERT INTO requirements/i.test(item.sql)));
    console.log('requirement model account bind tests passed');
  } finally {
    db.getConnection = originalGetConnection;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

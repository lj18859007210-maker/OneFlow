const assert = require('assert');

const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const originalGetConnection = db.getConnection;
  const executions = [];

  db.getConnection = async () => ({
    async execute(sql, params) {
      executions.push({ sql, params });
      if (/SELECT name FROM users/i.test(sql)) {
        return { rows: [{ NAME: '张三' }] };
      }
      return { rows: [] };
    },
    async close() {}
  });

  try {
    await requirementModel.getGanttData({ userRole: 'admin', developer: '李四' });
    assert.match(executions[0].sql, /LIKE :filterDeveloperPattern/);
    assert.strictEqual(executions[0].params.filterDeveloperPattern, '%,李四,%');

    executions.length = 0;
    await requirementModel.getGanttData({ userRole: 'developer', userId: 'user-1' });
    assert.match(executions[1].sql, /LIKE :developerPattern/);
    assert.strictEqual(executions[1].params.developerPattern, '%,张三,%');
    assert.strictEqual(executions[1].params.submitter, '张三');

    console.log('gantt multiple developer filter tests passed');
  } finally {
    db.getConnection = originalGetConnection;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

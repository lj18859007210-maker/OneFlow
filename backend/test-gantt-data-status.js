const assert = require('assert');

const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const originalGetConnection = db.getConnection;
  const executions = [];
  let closed = false;

  db.getConnection = async () => ({
    async execute(sql, params) {
      executions.push({ sql, params });
      const selectsApprovalStatus = /\bapprovalStatus\b/i.test(sql);

      return {
        rows: [
          {
            ID: 'REQ-001',
            TITLE: '导出状态校验',
            SUBMITTER: '张三',
            DEVELOPER: '李四',
            PLATFORM: '统一支付',
            CAPABILITY: '账务',
            EXPECTEDDATE: '2026-06-10',
            ACTUALDATE: null,
            PRIORITY: '高',
            SCORE: 8,
            STATUS: '开发中',
            APPROVALSTATUS: selectsApprovalStatus ? 'approved' : undefined,
            CREATEDAT: '2026-06-01',
            UPDATEDAT: '2026-06-02'
          },
          {
            ID: 'REQ-002',
            TITLE: '历史数据状态校验',
            SUBMITTER: '张三',
            DEVELOPER: '李四',
            PLATFORM: '统一支付',
            CAPABILITY: '账务',
            EXPECTEDDATE: '2026-06-12',
            ACTUALDATE: null,
            PRIORITY: '中',
            SCORE: 6,
            STATUS: '测试中',
            APPROVALSTATUS: selectsApprovalStatus ? 'pending' : undefined,
            CREATEDAT: '2026-06-02',
            UPDATEDAT: '2026-06-03'
          }
        ]
      };
    },
    async close() {
      closed = true;
    }
  });

  try {
    const result = await requirementModel.getGanttData({ userRole: 'admin' });

    assert.strictEqual(executions.length, 1, 'admin gantt query should only execute the data query');
    assert.match(executions[0].sql, /\bapprovalStatus\b/i, 'gantt query should select approvalStatus for state parsing');
    assert.strictEqual(result.data[0].status, '开发中', 'gantt data should preserve approved workflow status');
    assert.strictEqual(result.data[1].status, '测试中', 'gantt data should preserve raw progress status even for legacy approval state');
    assert.strictEqual(closed, true, 'database connection should be closed');
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('gantt data status tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

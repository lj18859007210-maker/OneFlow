const assert = require('assert');
const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const executed = [];
  const originalGetConnection = db.getConnection;

  db.getConnection = async () => ({
    async execute(sql, params) {
      executed.push({ sql, params });
      if (/COUNT\(\*\)/i.test(sql)) {
        return { rows: [[1]] };
      }
      return {
        rows: [{
          ID: 'req-1',
          TITLE: 'OneFlow 审批提速',
          DESCRIPTION: '只读取审批中心卡片需要的字段',
          SUBMITTER: '张三',
          DEVELOPER: null,
          EXPECTEDDATE: null,
          ACTUALDATE: null,
          PRIORITY: null,
          STATUS: '待审批',
          APPROVALSTATUS: 'pending',
          APPROVALCOMMENT: null,
          CREATEDAT: new Date('2026-06-01T00:00:00.000Z'),
          UPDATEDAT: new Date('2026-06-02T00:00:00.000Z')
        }]
      };
    },
    async close() {}
  });

  try {
    const result = await requirementModel.getApprovalList(
      'admin-1',
      'admin',
      ['requirement:approve'],
      1,
      20,
      { approvalStatus: 'pending', keyword: '张三' }
    );

    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.data[0].developer, '');
    assert.strictEqual(result.data[0].priority, '低');
    assert.match(executed[0].sql, /SELECT id, title, description, submitter, developer/i);
    assert.doesNotMatch(executed[0].sql, /SELECT \*/i);
    assert.match(executed[0].sql, /approvalStatus = :approvalStatus/i);
    assert.match(executed[0].sql, /LOWER\(title\) LIKE :keyword/i);
    assert.match(executed[0].sql, /LOWER\(submitter\) LIKE :keyword/i);
    assert.doesNotMatch(executed[0].sql, /LOWER\(developer\) LIKE :keyword/i);
    assert.strictEqual(executed[0].params.keyword, '%张三%');
    assert.strictEqual(executed[0].params.approvalStatus, 'pending');
    assert.strictEqual(executed.length, 2);
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('approval list query tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

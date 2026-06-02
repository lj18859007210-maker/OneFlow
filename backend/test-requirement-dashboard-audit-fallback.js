const assert = require('assert');
const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const originalGetConnection = db.getConnection;
  let usedUnquotedAuditFallback = false;

  db.getConnection = async () => ({
    async execute(sql) {
      if (sql.includes('FROM requirements')) {
        return {
          rows: [{
            ID: 'req-1',
            DEVELOPER: '张三',
            PLATFORM: 'OneFlow',
            STATUS: '已发布',
            EXPECTEDDATE: null,
            CREATEDAT: new Date('2026-06-01T00:00:00.000Z'),
            UPDATEDAT: new Date('2026-06-03T00:00:00.000Z')
          }]
        };
      }

      if (sql.includes('FROM audit_logs') && sql.includes('"resource"')) {
        throw new Error('ORA-00904: "resource": invalid identifier');
      }

      if (sql.includes('FROM audit_logs') && sql.includes('resource')) {
        usedUnquotedAuditFallback = true;
        return {
          rows: [{
            ACTION: 'approve',
            RESOURCEID: 'req-1',
            DETAILS: JSON.stringify({ body: { approved: true } }),
            CREATEDAT: new Date('2026-06-02T12:00:00.000Z')
          }]
        };
      }

      if (sql.includes('FROM users')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    async close() {}
  });

  try {
    const dashboard = await requirementModel.getDashboardMetrics();
    assert.strictEqual(usedUnquotedAuditFallback, true);
    assert.strictEqual(dashboard.approvalCycle.sampleCount, 1);
    assert.strictEqual(dashboard.approvalCycle.averageHours, 36);
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('requirement dashboard audit fallback tests passed');
}

run();

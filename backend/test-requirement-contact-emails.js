const assert = require('assert');

const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const originalGetConnection = db.getConnection;
  const executions = [];

  let scenario = 'ids';

  db.getConnection = async () => ({
    async execute(sql, binds = {}) {
      executions.push({ sql, binds });

      if (/SELECT \* FROM requirements WHERE id = :id/i.test(sql)) {
        const legacyNamesOnly = scenario === 'names';
        const staleIds = scenario === 'stale-ids';
        return {
          rows: [{
            ID: 'req-1',
            TITLE: '联系方式测试',
            DESCRIPTION: null,
            SUBMITTER: '需求人员A',
            SUBMITTERID: legacyNamesOnly ? null : staleIds ? 'old-submitter' : 'submitter-a',
            DEVELOPER: '开发A, 开发B',
            DEVELOPERIDS: legacyNamesOnly ? null : staleIds ? 'old-dev-a, old-dev-b' : 'dev-a, dev-b',
            PLATFORM: '平台',
            CAPABILITY: '能力',
            EXPECTEDDATE: null,
            ACTUALDATE: null,
            AVGDEVTIME: null,
            POSTDEVAVGTIME: null,
            AVGMONTHLYCALLS: null,
            SENDEREMAIL: 'legacy-sender@example.com',
            CCEMAILS: null,
            PRIORITY: '中',
            SCORE: 0,
            STATUS: '待审批',
            ISDRAFT: 0,
            STEPS: null,
            NOTEIMAGES: null,
            APPROVALSTATUS: 'pending',
            APPROVALCOMMENT: null,
            PUBLISHEDAT: null,
            CREATEDAT: new Date('2026-06-04T08:00:00Z'),
            UPDATEDAT: new Date('2026-06-04T08:00:00Z')
          }]
        };
      }

      if (/SELECT id, name, email FROM users/i.test(sql)) {
        const expectedBinds = scenario === 'names'
          ? ['开发A', '开发B', '需求人员A'].sort()
          : scenario === 'stale-ids'
            ? ['开发A', '开发B', 'old-dev-a', 'old-dev-b', 'old-submitter', '需求人员A'].sort()
            : ['dev-a', 'dev-b', 'submitter-a', '开发A', '开发B', '需求人员A'].sort();
        assert.deepStrictEqual(Object.values(binds).sort(), expectedBinds);
        return {
          rows: scenario === 'stale-ids'
            ? [
                { ID: 'submitter-a', NAME: '需求人员A', EMAIL: 'submitter@example.com' },
                { ID: 'dev-a', NAME: '开发A', EMAIL: 'dev-a@example.com' },
                { ID: 'dev-b', NAME: '开发B', EMAIL: 'dev-b@example.com' }
              ]
            : scenario === 'names'
            ? [
                { ID: 'submitter-a', NAME: '需求人员A', EMAIL: 'submitter@example.com' },
                { ID: 'dev-a', NAME: '开发A', EMAIL: 'dev-a@example.com' },
                { ID: 'dev-b', NAME: '开发B', EMAIL: 'dev-b@example.com' }
              ]
            : [
                { ID: 'submitter-a', NAME: '需求人员A', EMAIL: 'submitter@example.com' },
                { ID: 'dev-a', NAME: '开发A', EMAIL: 'dev-a@example.com' },
                { ID: 'dev-b', NAME: '开发B', EMAIL: 'dev-b@example.com' }
              ]
        };
      }

      if (/FROM audit_logs/i.test(sql)) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    async commit() {},
    async close() {}
  });

  try {
    let requirement = await requirementModel.getById('req-1');

    assert.equal(requirement.submitterEmail, 'submitter@example.com');
    assert.deepStrictEqual(requirement.developerEmails, ['dev-a@example.com', 'dev-b@example.com']);
    assert.equal(requirement.senderEmail, 'legacy-sender@example.com');
    assert.ok(
      executions.some(item => /SELECT id, name, email FROM users/i.test(item.sql)),
      'getById should resolve contact emails from this requirement users'
    );

    scenario = 'names';
    requirement = await requirementModel.getById('req-1');

    assert.equal(requirement.submitterEmail, 'submitter@example.com');
    assert.deepStrictEqual(requirement.developerEmails, ['dev-a@example.com', 'dev-b@example.com']);

    scenario = 'stale-ids';
    requirement = await requirementModel.getById('req-1');

    assert.equal(requirement.submitterEmail, 'submitter@example.com');
    assert.deepStrictEqual(requirement.developerEmails, ['dev-a@example.com', 'dev-b@example.com']);

    console.log('requirement contact email tests passed');
  } finally {
    db.getConnection = originalGetConnection;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const sentEmails = [];
  const executedSql = [];

  const connection = {
    async execute(sql, params) {
      executedSql.push({ sql, params });
      if (/FROM requirements/i.test(sql)) {
        return {
          rows: [{
            ID: 'req-create-1',
            TITLE: '新需求邮件测试',
            SENDEREMAIL: 'legacy-submitter@example.com',
            CCEMAILS: JSON.stringify(['legacy-cc@example.com']),
            SUBMITTER: 'A',
            DEVELOPER: 'B, C'
          }]
        };
      }
      if (/p\.code = :permissionCode/i.test(sql)) {
        return {
          rows: [
            { EMAIL: 'approver@example.com' },
            { EMAIL: 'admin@example.com' }
          ]
        };
      }
      if (/FROM users/i.test(sql)) {
        return {
          rows: [
            { NAME: 'A', EMAIL: 'a@example.com' },
            { NAME: 'B', EMAIL: 'b@example.com' },
            { NAME: 'C', EMAIL: 'c@example.com' },
            { NAME: 'D', EMAIL: 'unrelated-dev@example.com' }
          ]
        };
      }
      return { rows: [] };
    },
    async close() {}
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/oracle') {
      return { getConnection: async () => connection };
    }
    if (request === '../models/emailSetting') {
      return { getSettings: async () => ({ sendIntervalMinutes: 1 }) };
    }
    if (request === './emailSender') {
      return {
        sendEmail: async (email) => {
          sentEmails.push(email);
          return { success: true };
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./utils/autoEmailService')];
    const autoEmailService = require('./utils/autoEmailService');

    const queued = await autoEmailService.enqueueRequirementCreatedEvent({
      requirementId: 'req-create-1',
      actorName: 'A',
      summary: '新需求已提交：新需求邮件测试'
    });

    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to.sort(), ['b@example.com', 'c@example.com'].sort());
    assert.deepStrictEqual(sentEmails[0].cc, []);
    assert.ok(!executedSql.some(item => /p\.code = :permissionCode/i.test(item.sql)), 'should not email all approvers');
    assert.match(sentEmails[0].body, /新需求已提交/);

    console.log('auto email service create tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

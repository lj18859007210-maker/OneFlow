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
            ID: 'req-001',
            TITLE: '客户资料同步',
            SENDEREMAIL: 'legacy-submitter@example.com',
            CCEMAILS: JSON.stringify(['legacy-cc@example.com']),
            SUBMITTER: '张三',
            DEVELOPER: '李四'
          }]
        };
      }
      if (/FROM users/i.test(sql)) {
        return {
          rows: [
            { NAME: '李四', EMAIL: 'developer@example.com' },
            { NAME: '张三', EMAIL: 'owner@example.com' }
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

    const queued = await autoEmailService.enqueueRequirementEvent({
      requirementId: 'req-001',
      eventType: 'status_updated',
      actorName: '王五',
      summary: '状态更新为：开发中'
    });

    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.ok(executedSql.some(item => /FROM users/i.test(item.sql)), 'should look up user emails');
    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to, ['owner@example.com']);
    assert.deepStrictEqual(
      sentEmails[0].cc.sort(),
      ['developer@example.com', 'legacy-cc@example.com', 'legacy-submitter@example.com'].sort()
    );
    assert.match(sentEmails[0].body, /状态更新为：开发中/);

    console.log('auto email service tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const sentEmails = [];

  const connection = {
    async execute(sql) {
      if (/FROM requirements/i.test(sql)) {
        return {
          rows: [{
            ID: 'req-create-1',
            TITLE: '新需求邮件测试',
            SENDEREMAIL: 'legacy-submitter@example.com',
            CCEMAILS: JSON.stringify(['legacy-cc@example.com']),
            SUBMITTER: '张三',
            DEVELOPER: '李四'
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
            { NAME: '张三', EMAIL: 'owner@example.com' },
            { NAME: '李四', EMAIL: 'developer@example.com' }
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
      actorName: '张三',
      summary: '新需求已提交：新需求邮件测试'
    });

    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to.sort(), ['admin@example.com', 'approver@example.com'].sort());
    assert.deepStrictEqual(
      sentEmails[0].cc.sort(),
      ['developer@example.com', 'legacy-cc@example.com', 'legacy-submitter@example.com', 'owner@example.com'].sort()
    );
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

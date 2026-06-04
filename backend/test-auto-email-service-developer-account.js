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
            ID: 'req-duplicate-name',
            TITLE: '同名开发人员邮件测试',
            SUBMITTER: '需求人员A',
            SUBMITTERID: 'submitter-a',
            DEVELOPER: '刘洋',
            DEVELOPERIDS: 'dev-demo-liuyang'
          }]
        };
      }
      if (/FROM users/i.test(sql)) {
        return {
          rows: [
            { ID: 'submitter-a', USERNAME: 'submitter_a', NAME: '需求人员A', EMAIL: 'a@example.com' },
            { ID: 'dev-demo-liuyang', USERNAME: 'demo_liuyang', NAME: '刘洋', EMAIL: '18859007210@139.com' },
            { ID: 'normal-liuyang', USERNAME: 'liuyang', NAME: '刘洋', EMAIL: 'liuyang@cmcc.cn' }
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
      requirementId: 'req-duplicate-name',
      actorId: 'submitter-a',
      actorName: '需求人员A',
      summary: '提交给 demo_liuyang'
    });

    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to, ['18859007210@139.com']);
    assert.ok(!sentEmails[0].to.includes('liuyang@cmcc.cn'), 'must not email same-name unselected account');

    console.log('auto email developer account tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

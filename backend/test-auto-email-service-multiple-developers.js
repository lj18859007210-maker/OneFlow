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
            ID: 'req-mail-1',
            TITLE: '多人开发邮件',
            SENDEREMAIL: 'sender@example.com',
            CCEMAILS: JSON.stringify(['cc@example.com']),
            SUBMITTER: '提交人',
            DEVELOPER: '张三, 李四'
          }]
        };
      }
      if (/FROM users/i.test(sql)) {
        return {
          rows: [
            { NAME: '提交人', EMAIL: 'owner@example.com' },
            { NAME: '张三', EMAIL: 'dev-a@example.com' },
            { NAME: '李四', EMAIL: 'dev-b@example.com' }
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
      return { getSettings: async () => ({ sendIntervalMinutes: 10 }) };
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

    const context = await autoEmailService.getRequirementMailContext('req-mail-1');

    assert.deepStrictEqual(context.to, ['owner@example.com']);
    assert.deepStrictEqual(
      context.cc.sort(),
      ['cc@example.com', 'dev-a@example.com', 'dev-b@example.com', 'sender@example.com'].sort()
    );

    const queued = await autoEmailService.enqueueRequirementEvent({
      requirement: {
        id: 'req-mail-1',
        title: '多人开发邮件',
        senderEmail: 'sender@example.com',
        ccEmails: ['direct-cc@example.com']
      },
      eventType: 'comment_created',
      actorName: '评论人',
      summary: '新增评论'
    });
    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to, ['owner@example.com']);
    assert.deepStrictEqual(
      sentEmails[0].cc.sort(),
      ['cc@example.com', 'dev-a@example.com', 'dev-b@example.com', 'sender@example.com'].sort()
    );

    console.log('auto email service multiple developer tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

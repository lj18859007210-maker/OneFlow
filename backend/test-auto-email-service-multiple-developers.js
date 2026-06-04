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
            SUBMITTER: 'A',
            DEVELOPER: 'B, C'
          }]
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

    const contextForSubmitter = await autoEmailService.getRequirementMailContext('req-mail-1', {
      actorName: 'A'
    });

    assert.deepStrictEqual(contextForSubmitter.to.sort(), ['b@example.com', 'c@example.com'].sort());
    assert.deepStrictEqual(contextForSubmitter.cc, []);

    const contextForDeveloper = await autoEmailService.getRequirementMailContext('req-mail-1', {
      actorName: 'B'
    });

    assert.deepStrictEqual(contextForDeveloper.to.sort(), ['a@example.com', 'c@example.com'].sort());
    assert.deepStrictEqual(contextForDeveloper.cc, []);

    const queued = await autoEmailService.enqueueRequirementEvent({
      requirementId: 'req-mail-1',
      eventType: 'comment_created',
      actorName: 'B',
      summary: '新增评论'
    });
    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to.sort(), ['a@example.com', 'c@example.com'].sort());
    assert.deepStrictEqual(sentEmails[0].cc, []);

    console.log('auto email service multiple developer tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

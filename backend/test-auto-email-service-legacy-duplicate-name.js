const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const sentEmails = [];
  const userQueries = [];

  const connection = {
    async execute(sql, params) {
      if (/FROM requirements/i.test(sql)) {
        return {
          rows: [{
            ID: 'req-legacy-duplicate-name',
            TITLE: '历史同名开发人员邮件测试',
            SUBMITTER: '需求人员A',
            DEVELOPER: '刘洋'
          }]
        };
      }
      if (/FROM users/i.test(sql)) {
        userQueries.push({ sql, params });
        if (/role IN/i.test(sql)) {
          return {
            rows: [
              { NAME: '刘洋', EMAIL: '18859007210@139.com' }
            ]
          };
        }
        return {
          rows: [
            { NAME: '需求人员A', EMAIL: 'a@example.com' },
            { NAME: '刘洋', EMAIL: 'liuyang@cmcc.cn' }
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
      requirementId: 'req-legacy-duplicate-name',
      actorName: '需求人员A',
      summary: '历史数据提交给刘洋'
    });

    assert.strictEqual(queued.queued, true);
    await autoEmailService.digestService.flushAll();

    assert.strictEqual(sentEmails.length, 1);
    assert.deepStrictEqual(sentEmails[0].to, ['18859007210@139.com']);
    assert.ok(!sentEmails[0].to.includes('liuyang@cmcc.cn'), 'legacy fallback must not email same-name normal user');
    assert.ok(userQueries.some(query => /role IN/i.test(query.sql)), 'developer fallback should restrict assignable roles');

    console.log('auto email legacy duplicate-name tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

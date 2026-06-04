const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const queuedEmails = [];

  Module._load = function(request, parent, isMain) {
    if (request === '../models/requirement') {
      return {
        normalizeDeveloperNames: (value) => (Array.isArray(value) ? value : [value]).filter(Boolean),
        create: async () => ({
          id: 'req-create-1',
          title: '新需求邮件测试',
          submitter: '张三',
          developer: '李四'
        })
      };
    }
    if (request === '../models/comment') {
      return { create: async () => ({ id: 'comment-1' }) };
    }
    if (request === '../utils/notificationService') {
      return { notifyAssignDev: async () => {} };
    }
    if (request === '../utils/autoEmailService') {
      return {
        enqueueRequirementCreatedEvent: async (event) => {
          queuedEmails.push(event);
          return { queued: true };
        }
      };
    }
    if (request === '../db/oracle') {
      return {
        getConnection: async () => ({
          execute: async () => ({ rows: [{ ID: 'dev-1', NAME: '李四' }] }),
          close: async () => {}
        })
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./controllers/requirementController')];
    const controller = require('./controllers/requirementController');
    const req = {
      body: { title: '新需求邮件测试', developer: '李四' },
      user: { id: 'u-1', username: 'zhangsan', name: '张三', role: 'user' }
    };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };

    await controller.create(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(queuedEmails.length, 1);
    assert.strictEqual(queuedEmails[0].requirement.id, 'req-create-1');
    assert.strictEqual(queuedEmails[0].actorName, '张三');
    assert.match(queuedEmails[0].summary, /新需求已提交/);

    console.log('requirement create email tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

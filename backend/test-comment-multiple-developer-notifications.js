const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const notifiedUsers = [];
  const queuedEmails = [];
  const queries = [];

  Module._load = function(request, parent, isMain) {
    if (request === '../models/comment') {
      return {
        create: async () => ({
          id: 'comment-1',
          content: '请两位开发都看一下'
        })
      };
    }
    if (request === '../utils/notificationService') {
      return {
        notifyNewComment: async (user) => {
          notifiedUsers.push(user);
        }
      };
    }
    if (request === '../utils/autoEmailService') {
      return {
        enqueueRequirementEvent: async (event) => {
          queuedEmails.push(event);
          return { queued: true };
        }
      };
    }
    if (request === '../db/oracle') {
      return {
        getConnection: async () => ({
          async execute(sql, params) {
            queries.push({ sql, params });
            if (/FROM requirements/i.test(sql)) {
              return {
                rows: [{
                  ID: 'req-1',
                  TITLE: '多人开发通知',
                  SUBMITTER: '提交人',
                  DEVELOPER: '张三, 李四'
                }]
              };
            }
            if (/FROM users/i.test(sql)) {
              return {
                rows: [
                  { ID: 'owner-1', NAME: '提交人' },
                  { ID: 'dev-1', NAME: '张三' },
                  { ID: 'dev-2', NAME: '李四' }
                ]
              };
            }
            return { rows: [] };
          },
          async close() {}
        })
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./controllers/commentController')];
    const controller = require('./controllers/commentController');
    const req = {
      body: {
        requirementId: 'req-1',
        type: 'user_message',
        content: '请两位开发都看一下'
      },
      user: { id: 'user-1', username: '提交人', role: 'user' }
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
    assert.deepStrictEqual(notifiedUsers.map(user => user.name).sort(), ['张三', '李四'].sort());
    assert.strictEqual(queuedEmails.length, 1);
    assert.strictEqual(queuedEmails[0].requirementId, 'req-1');
    assert.match(
      queries.find(query => /FROM users/i.test(query.sql)).sql,
      /name IN \(:name0, :name1\)/
    );

    console.log('comment multiple developer notification tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

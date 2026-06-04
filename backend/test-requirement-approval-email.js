const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const queuedEmails = [];

  Module._load = function(request, parent, isMain) {
    if (request === '../models/requirement') {
      return {
        approve: async () => ({
          requirement: {
            id: 'req-approval-1',
            title: '审批邮件测试',
            submitter: '张三',
            developer: '李四',
            approvalStatus: 'approved'
          },
          transition: { notifyEnabled: false }
        })
      };
    }
    if (request === '../models/comment') {
      return { create: async () => ({ id: 'comment-1' }) };
    }
    if (request === '../utils/notificationService') {
      return { notifyApprovalResult: async () => {} };
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
      return { getConnection: async () => ({ execute: async () => ({ rows: [] }), close: async () => {} }) };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./controllers/requirementController')];
    const controller = require('./controllers/requirementController');
    const req = {
      params: { id: 'req-approval-1' },
      body: { approved: true, comment: '同意开发', actualDate: '2026-06-10' },
      user: { id: 'u-1', username: 'approver', name: '审批人', role: 'admin' }
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

    await controller.approve(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(queuedEmails.length, 1);
    assert.strictEqual(queuedEmails[0].eventType, 'approval_updated');
    assert.strictEqual(queuedEmails[0].requirement.id, 'req-approval-1');
    assert.match(queuedEmails[0].summary, /审批通过/);

    console.log('requirement approval email tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

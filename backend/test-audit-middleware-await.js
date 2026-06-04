const assert = require('assert');
const auditMiddleware = require('./middleware/audit');
const auditLogModel = require('./models/auditLog');

async function run() {
  const events = [];
  const originalCreate = auditLogModel.create;
  auditLogModel.create = async () => {
    events.push('audit-start');
    await Promise.resolve();
    events.push('audit-end');
  };

  try {
    const middleware = auditMiddleware('update_status', 'requirement');
    const req = {
      method: 'PUT',
      originalUrl: '/api/requirements/req-1/status',
      params: { id: 'req-1' },
      query: {},
      body: { status: '测试中' },
      user: { id: 'u-1', name: '刘洋', role: 'developer' },
      ip: '127.0.0.1',
      get: () => 'test-agent'
    };
    const res = {
      json(body) {
        events.push('response');
        return body;
      }
    };

    middleware(req, res, () => events.push('next'));
    await res.json({ success: true });

    assert.deepStrictEqual(events, ['next', 'audit-start', 'audit-end', 'response']);
    console.log('audit middleware await tests passed');
  } finally {
    auditLogModel.create = originalCreate;
  }
}

run();

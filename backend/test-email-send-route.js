const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const handlers = {};

  function createRouter() {
    return {
      use() {},
      get() {},
      put() {},
      post(path, ...callbacks) {
        handlers[path] = callbacks;
      }
    };
  }

  Module._load = function(request, parent, isMain) {
    if (request === 'express') {
      return { Router: createRouter };
    }
    if (request === '../middleware/auth') {
      return (req, res, next) => next();
    }
    if (request === '../middleware/permission') {
      return { requirePermission: () => (req, res, next) => next() };
    }
    if (request === '../controllers/emailSettingsController') {
      return { getSettings() {}, updateSettings() {} };
    }
    if (request === '../utils/emailSender') {
      return {
        sendEmail: async () => {
          throw new Error('smtp unavailable');
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./routes/email')];
    require('./routes/email');
  } finally {
    Module._load = originalLoad;
  }

  const sendHandlers = handlers['/send'];
  assert.ok(sendHandlers, 'email send route should be registered');

  const req = { body: { to: 'a@example.com', subject: 'Hi', body: 'Hello' } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  await sendHandlers[0](req, res);

  assert.strictEqual(res.statusCode, 500);
  assert.deepStrictEqual(res.body, { success: false, message: 'smtp unavailable' });
  console.log('email send route tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

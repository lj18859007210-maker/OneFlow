const assert = require('assert');
const { spawnSync } = require('child_process');
const { cacheMiddleware } = require('./middleware/cache');

function createResponse() {
  return {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function runRequest(middleware, token, payloadFactory) {
  const req = {
    method: 'GET',
    originalUrl: '/api/requirements/gantt',
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
    res.json(payloadFactory());
  });

  return { nextCalled, body: res.body };
}

function run() {
  const middleware = cacheMiddleware(30);

  const first = runRequest(middleware, 'token-a', () => ({ success: true, data: [{ status: '测试中' }] }));
  const second = runRequest(middleware, 'token-b', () => ({ success: true, data: [{ status: '待开发' }] }));
  const third = runRequest(middleware, 'token-a', () => ({ success: true, data: [{ status: '待审批' }] }));

  assert.strictEqual(first.nextCalled, true, 'first request should populate cache');
  assert.strictEqual(second.nextCalled, true, 'different authorization should not hit first cache entry');
  assert.deepStrictEqual(second.body.data, [{ status: '待开发' }]);
  assert.strictEqual(third.nextCalled, false, 'same authorization and URL should hit cache');
  assert.deepStrictEqual(third.body.data, [{ status: '测试中' }]);

  const child = spawnSync(
    process.execPath,
    ['-e', "require('./middleware/cache'); console.log('cache module loaded')"],
    { cwd: __dirname, encoding: 'utf8', timeout: 1000 }
  );
  assert.strictEqual(child.status, 0, 'cache cleanup timer should not keep Node process alive');

  console.log('cache middleware tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

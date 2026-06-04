const assert = require('assert');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

function run() {
  const calls = [];
  const originalAccess = logger.access;
  logger.access = (message, meta) => calls.push({ message, meta });

  try {
    const req = {
      method: 'GET',
      originalUrl: '/api/auth/me',
      ip: '::1',
      connection: { remoteAddress: '::1' },
      get(header) {
        return header === 'User-Agent' ? 'Mozilla/5.0' : undefined;
      }
    };
    const res = {
      statusCode: 200,
      end() {
        this.ended = true;
      }
    };
    let nextCalled = false;

    requestLogger(req, res, () => {
      nextCalled = true;
    });
    res.end('ok');

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.ended, true);
    assert.strictEqual(calls.length, 1, 'request logger should write one access log per request');
    assert.match(calls[0].message, /^GET \/api\/auth\/me - 200 \(\d+ms\)$/);
    assert.deepStrictEqual(calls[0].meta, {
      statusCode: 200,
      duration: calls[0].meta.duration,
      method: 'GET',
      url: '/api/auth/me',
      ip: '::1',
      userAgent: 'Mozilla/5.0'
    });

    console.log('request logger tests passed');
  } finally {
    logger.access = originalAccess;
    logger.close();
  }
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

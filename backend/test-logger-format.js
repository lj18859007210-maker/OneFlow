const assert = require('assert');
const logger = require('./utils/logger');

function formatAccessLog() {
  const info = logger.format.transform({
    level: 'info',
    message: '[ACCESS] GET /api/auth/me - 200 (12ms)',
    timestamp: '2026-06-03 18:00:00',
    method: 'GET',
    url: '/api/auth/me',
    statusCode: 200,
    duration: 12,
    ip: '::1',
    userAgent: 'Mozilla/5.0',
    access: true
  });

  return info[Symbol.for('message')];
}

function run() {
  const line = formatAccessLog();

  assert.match(line, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[INFO\] \[ACCESS\] GET \/api\/auth\/me - 200 \(12ms\)/);
  assert.ok(line.includes('method=GET'));
  assert.ok(line.includes('url=/api/auth/me'));
  assert.ok(line.includes('statusCode=200'));
  assert.ok(line.includes('duration=12ms'));
  assert.ok(!line.includes('\n'), 'access log should be a single terminal line');
  assert.ok(!line.includes('{'), 'access log should not dump pretty JSON in the terminal');

  console.log('logger format tests passed');
  logger.close();
}

try {
  run();
} catch (error) {
  logger.close();
  console.error(error);
  process.exit(1);
}

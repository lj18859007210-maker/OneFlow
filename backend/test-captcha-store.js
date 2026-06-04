const assert = require('assert');

const {
  createCaptcha,
  verifyCaptcha,
  clearCaptchaStore
} = require('./utils/captchaStore');

function run() {
  clearCaptchaStore();

  const captcha = createCaptcha({ now: 1000, ttlMs: 60000 });
  assert.strictEqual(typeof captcha.id, 'string');
  assert.ok(captcha.id.length > 20);
  assert.strictEqual(typeof captcha.svg, 'string');
  assert.ok(captcha.svg.includes('<svg'));
  assert.strictEqual(typeof captcha.text, 'string');
  assert.strictEqual(captcha.text.length, 4);

  assert.strictEqual(
    verifyCaptcha(captcha.id, captcha.text.toLowerCase(), { now: 2000 }),
    true
  );
  assert.strictEqual(
    verifyCaptcha(captcha.id, captcha.text, { now: 2000 }),
    false
  );

  const expired = createCaptcha({ now: 1000, ttlMs: 10 });
  assert.strictEqual(
    verifyCaptcha(expired.id, expired.text, { now: 1011 }),
    false
  );

  assert.strictEqual(verifyCaptcha('', 'abcd'), false);
  assert.strictEqual(verifyCaptcha('missing', ''), false);

  clearCaptchaStore();
  console.log('captcha store tests passed');
}

run();

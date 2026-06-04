const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');

const DEFAULT_TTL_MS = 60 * 1000;
const MAX_CAPTCHA_COUNT = 500;
const captchaStore = new Map();

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

function cleanupExpired(now = Date.now()) {
  for (const [id, captcha] of captchaStore.entries()) {
    if (captcha.expiresAt <= now) {
      captchaStore.delete(id);
    }
  }

  if (captchaStore.size <= MAX_CAPTCHA_COUNT) return;

  const removable = captchaStore.size - MAX_CAPTCHA_COUNT;
  let removed = 0;
  for (const id of captchaStore.keys()) {
    captchaStore.delete(id);
    removed += 1;
    if (removed >= removable) break;
  }
}

function createCaptcha(options = {}) {
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  cleanupExpired(now);

  const captcha = svgCaptcha.create({
    size: 4,
    noise: 3,
    width: 126,
    height: 50,
    fontSize: 42,
    color: true,
    background: '#f7fbff',
    ignoreChars: '0o1il'
  });

  const id = crypto.randomBytes(24).toString('hex');
  captchaStore.set(id, {
    code: normalizeCode(captcha.text),
    expiresAt: now + ttlMs
  });

  return {
    id,
    svg: captcha.data,
    text: captcha.text,
    expiresIn: ttlMs
  };
}

function verifyCaptcha(id, code, options = {}) {
  const now = options.now ?? Date.now();
  cleanupExpired(now);

  const captcha = captchaStore.get(id);
  if (!captcha) return false;

  captchaStore.delete(id);
  if (captcha.expiresAt <= now) return false;

  return captcha.code === normalizeCode(code);
}

function clearCaptchaStore() {
  captchaStore.clear();
}

module.exports = {
  createCaptcha,
  verifyCaptcha,
  clearCaptchaStore
};

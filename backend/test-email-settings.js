const assert = require('assert');

const {
  DEFAULT_EMAIL_INTERVAL_MINUTES,
  normalizeEmailAccountSettings,
  normalizeEmailIntervalMinutes
} = require('./utils/emailSettings');

function run() {
  assert.strictEqual(normalizeEmailIntervalMinutes(undefined), DEFAULT_EMAIL_INTERVAL_MINUTES);
  assert.strictEqual(normalizeEmailIntervalMinutes(''), DEFAULT_EMAIL_INTERVAL_MINUTES);
  assert.strictEqual(normalizeEmailIntervalMinutes(1), 1);
  assert.strictEqual(normalizeEmailIntervalMinutes('60'), 60);

  assert.throws(() => normalizeEmailIntervalMinutes(0), /between 1 and 60/);
  assert.throws(() => normalizeEmailIntervalMinutes(61), /between 1 and 60/);
  assert.throws(() => normalizeEmailIntervalMinutes('2.5'), /integer/);
  assert.throws(() => normalizeEmailIntervalMinutes('abc'), /integer/);

  const account = normalizeEmailAccountSettings({
    smtpHost: ' smtp.example.com ',
    smtpPort: '587',
    smtpSecure: false,
    smtpUser: ' sender@example.com ',
    smtpPassword: 'secret',
    fromEmail: ' notice@example.com ',
    fromName: ' OneFlow '
  });
  assert.deepStrictEqual(account, {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'sender@example.com',
    smtpPassword: 'secret',
    fromEmail: 'notice@example.com',
    fromName: 'OneFlow'
  });

  assert.throws(() => normalizeEmailAccountSettings({ smtpHost: 'smtp.example.com', smtpPort: 0 }), /smtpPort/);
  assert.throws(() => normalizeEmailAccountSettings({ smtpHost: 'smtp.example.com', smtpPort: 70000 }), /smtpPort/);
  assert.throws(() => normalizeEmailAccountSettings({ smtpHost: 'smtp.example.com', smtpPort: 465, fromEmail: 'bad-email' }), /fromEmail/);

  console.log('email settings tests passed');
}

run();

const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const store = new Map();

  Module._load = function(request, parent, isMain) {
    if (request === './systemSetting') {
      return {
        getValue: async (key, fallback) => store.has(key) ? store.get(key) : fallback,
        setValue: async (key, value) => {
          store.set(key, value);
          return true;
        }
      };
    }
    if (request === '../config') {
      return {
        smtp: {
          host: 'smtp.default.example.com',
          port: 465,
          user: 'default@example.com',
          password: '',
          from: 'default@example.com'
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./models/emailSetting')];
    const emailSettingModel = require('./models/emailSetting');

    const withoutPassword = await emailSettingModel.updateSettings({
      sendIntervalMinutes: 10,
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'mailer@example.com',
      fromEmail: 'notice@example.com',
      fromName: 'OneFlow'
    });
    assert.strictEqual(withoutPassword.passwordConfigured, false);

    const withPassword = await emailSettingModel.updateSettings({
      sendIntervalMinutes: 10,
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'mailer@example.com',
      smtpPassword: 'secret',
      fromEmail: 'notice@example.com',
      fromName: 'OneFlow'
    });
    assert.strictEqual(withPassword.passwordConfigured, true);

    const delivery = await emailSettingModel.getDeliverySettings();
    assert.strictEqual(delivery.smtpPassword, 'secret');
    assert.strictEqual(delivery.passwordConfigured, true);

    console.log('email setting model tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

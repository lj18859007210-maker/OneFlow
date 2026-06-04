const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  let createdTransport = null;
  let sentPayload = null;

  Module._load = function(request, parent, isMain) {
    if (request === 'nodemailer') {
      return {
        createTransport(options) {
          createdTransport = options;
          return {
            async sendMail(payload) {
              sentPayload = payload;
              return { messageId: 'smtp-message-1' };
            }
          };
        }
      };
    }
    if (request === '../models/emailSetting') {
      return {
        getDeliverySettings: async () => ({
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'mailer@example.com',
          smtpPassword: 'secret',
          fromEmail: 'notice@example.com',
          fromName: 'OneFlow'
        })
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./utils/emailSender')];
    const { sendEmail } = require('./utils/emailSender');

    const result = await sendEmail({
      to: ['owner@example.com'],
      cc: ['dev@example.com'],
      subject: '需求动态',
      body: '状态更新为：开发中'
    });

    assert.deepStrictEqual(createdTransport, {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'mailer@example.com',
        pass: 'secret'
      }
    });
    assert.deepStrictEqual(sentPayload.to, ['owner@example.com']);
    assert.deepStrictEqual(sentPayload.cc, ['dev@example.com']);
    assert.strictEqual(sentPayload.subject, '需求动态');
    assert.strictEqual(sentPayload.text, '状态更新为：开发中');
    assert.strictEqual(sentPayload.from, '"OneFlow" <notice@example.com>');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.messageId, 'smtp-message-1');

    await assert.rejects(
      () => sendEmail({ to: [], subject: '缺少收件人', body: '正文' }),
      /to is required/
    );

    console.log('email sender tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

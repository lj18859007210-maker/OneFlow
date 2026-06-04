const emailSettingModel = require('../models/emailSetting');
const nodemailer = require('nodemailer');

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values
    .flatMap(item => String(item || '').split(/[,;，；\s]+/))
    .map(item => item.trim())
    .filter(Boolean))];
}

function assertEmailPayload({ to, subject, body }) {
  if (!to.length) {
    throw new Error('to is required');
  }
  if (!String(subject || '').trim()) {
    throw new Error('subject is required');
  }
  if (!String(body || '').trim()) {
    throw new Error('body is required');
  }
}

function formatFrom(settings) {
  const address = settings.fromEmail || settings.smtpUser;
  if (!address) {
    throw new Error('fromEmail or smtpUser is required');
  }
  const name = String(settings.fromName || '').trim();
  if (!name) return address;
  return `"${name.replace(/"/g, '\\"')}" <${address}>`;
}

function createTransport(settings) {
  if (!settings.smtpHost) {
    throw new Error('smtpHost is required');
  }
  if (!settings.smtpPort) {
    throw new Error('smtpPort is required');
  }

  const options = {
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure
  };

  if (settings.smtpUser) {
    options.auth = {
      user: settings.smtpUser,
      pass: settings.smtpPassword || ''
    };
  }

  return nodemailer.createTransport(options);
}

async function sendEmail({ to, cc = [], subject, body }) {
  const recipients = normalizeRecipients(to);
  const ccRecipients = normalizeRecipients(cc);
  assertEmailPayload({ to: recipients, subject, body });

  const settings = await emailSettingModel.getDeliverySettings();
  const transporter = createTransport(settings);
  const info = await transporter.sendMail({
    from: formatFrom(settings),
    to: recipients,
    cc: ccRecipients,
    subject: String(subject).trim(),
    text: String(body)
  });

  return {
    success: true,
    message: '邮件发送成功',
    messageId: info.messageId,
    email: { to: recipients, cc: ccRecipients, subject, body, sentAt: new Date().toISOString() }
  };
}

module.exports = {
  sendEmail,
  normalizeRecipients
};

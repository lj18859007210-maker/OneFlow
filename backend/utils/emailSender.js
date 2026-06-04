const emailSettingModel = require('../models/emailSetting');

async function sendEmail({ to, cc = [], subject, body }) {
  const settings = await emailSettingModel.getSettings();
  console.log('======== 中国移动 · 模拟邮件发送 ========');
  console.log(`SMTP: ${settings.smtpHost}:${settings.smtpPort} (${settings.smtpSecure ? 'SSL/TLS' : 'STARTTLS/明文'})`);
  console.log(`账号: ${settings.smtpUser || '未配置'}`);
  console.log(`发件人: ${settings.fromName || ''} <${settings.fromEmail || settings.smtpUser || '未配置'}>`);
  console.log(`收件人: ${Array.isArray(to) ? to.join(', ') : to}`);
  console.log(`抄送人: ${Array.isArray(cc) && cc.length ? cc.join(', ') : '无'}`);
  console.log(`主题: ${subject}`);
  console.log(`正文: ${body}`);
  console.log(`发送时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('==========================================');

  return {
    success: true,
    message: '邮件发送成功（模拟）',
    email: { to, cc, subject, body, sentAt: new Date().toISOString() }
  };
}

module.exports = {
  sendEmail
};

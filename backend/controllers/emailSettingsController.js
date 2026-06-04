const emailSettingModel = require('../models/emailSetting');

async function getSettings(req, res) {
  try {
    const settings = await emailSettingModel.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('get email settings error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await emailSettingModel.updateSettings(req.body);
    res.json({ success: true, data: settings, message: '邮件设置已保存' });
  } catch (error) {
    const message = String(error.message || error);
    const status = /sendIntervalMinutes|smtpHost|smtpPort|fromEmail/.test(message) ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
}

module.exports = {
  getSettings,
  updateSettings
};

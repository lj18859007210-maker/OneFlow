const systemSettingModel = require('./systemSetting');
const config = require('../config');
const {
  EMAIL_ACCOUNT_SETTING_KEYS,
  DEFAULT_EMAIL_INTERVAL_MINUTES,
  normalizeEmailAccountSettings,
  normalizeEmailIntervalMinutes
} = require('../utils/emailSettings');

const EMAIL_INTERVAL_KEY = 'email.send_interval_minutes';

async function getSettings() {
  const stored = await systemSettingModel.getValue(EMAIL_INTERVAL_KEY, DEFAULT_EMAIL_INTERVAL_MINUTES);
  const [smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, fromEmail, fromName] = await Promise.all([
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpHost, config.smtp.host),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPort, config.smtp.port),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpSecure, config.smtp.port === 465 ? 'true' : 'false'),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpUser, config.smtp.user),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPassword, config.smtp.password),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.fromEmail, config.smtp.from),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.fromName, 'OneFlow')
  ]);
  const account = normalizeEmailAccountSettings({
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    fromEmail,
    fromName
  }, { allowMissing: true });
  return {
    sendIntervalMinutes: normalizeEmailIntervalMinutes(stored),
    ...account,
    passwordConfigured: !!smtpPassword
  };
}

async function getDeliverySettings() {
  const [publicSettings, smtpPassword] = await Promise.all([
    getSettings(),
    systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPassword, config.smtp.password)
  ]);
  return {
    ...publicSettings,
    smtpPassword,
    passwordConfigured: !!smtpPassword
  };
}

async function updateSettings(data) {
  const sendIntervalMinutes = normalizeEmailIntervalMinutes(data?.sendIntervalMinutes);
  const account = normalizeEmailAccountSettings(data || {});
  const existingPassword = await systemSettingModel.getValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPassword, config.smtp.password);
  await systemSettingModel.setValue(EMAIL_INTERVAL_KEY, sendIntervalMinutes);
  await Promise.all([
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpHost, account.smtpHost),
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPort, account.smtpPort),
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpSecure, account.smtpSecure ? 'true' : 'false'),
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpUser, account.smtpUser),
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.fromEmail, account.fromEmail),
    systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.fromName, account.fromName)
  ]);
  if (Object.prototype.hasOwnProperty.call(account, 'smtpPassword') && account.smtpPassword) {
    await systemSettingModel.setValue(EMAIL_ACCOUNT_SETTING_KEYS.smtpPassword, account.smtpPassword);
  }
  const passwordConfigured = !!(account.smtpPassword || existingPassword);
  return {
    sendIntervalMinutes,
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    smtpSecure: account.smtpSecure,
    smtpUser: account.smtpUser,
    fromEmail: account.fromEmail,
    fromName: account.fromName,
    passwordConfigured
  };
}

module.exports = {
  EMAIL_INTERVAL_KEY,
  getSettings,
  getDeliverySettings,
  updateSettings
};

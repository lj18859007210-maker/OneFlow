const DEFAULT_EMAIL_INTERVAL_MINUTES = 10;
const MIN_EMAIL_INTERVAL_MINUTES = 1;
const MAX_EMAIL_INTERVAL_MINUTES = 60;
const EMAIL_ACCOUNT_SETTING_KEYS = {
  smtpHost: 'email.smtp_host',
  smtpPort: 'email.smtp_port',
  smtpSecure: 'email.smtp_secure',
  smtpUser: 'email.smtp_user',
  smtpPassword: 'email.smtp_password',
  fromEmail: 'email.from_email',
  fromName: 'email.from_name'
};

function normalizeEmailIntervalMinutes(value, fallback = DEFAULT_EMAIL_INTERVAL_MINUTES) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    throw new Error('sendIntervalMinutes must be an integer between 1 and 60');
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('sendIntervalMinutes must be an integer between 1 and 60');
  }
  if (parsed < MIN_EMAIL_INTERVAL_MINUTES || parsed > MAX_EMAIL_INTERVAL_MINUTES) {
    throw new Error('sendIntervalMinutes must be between 1 and 60');
  }
  return parsed;
}

function optionalTrimmed(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return fallback;
}

function normalizeEmailAccountSettings(data = {}, options = {}) {
  const allowMissing = options.allowMissing === true;
  const smtpHost = optionalTrimmed(data.smtpHost);
  const smtpUser = optionalTrimmed(data.smtpUser);
  const smtpPassword = data.smtpPassword === undefined ? undefined : String(data.smtpPassword);
  const fromEmail = optionalTrimmed(data.fromEmail);
  const fromName = optionalTrimmed(data.fromName);
  const smtpSecure = normalizeBoolean(data.smtpSecure, true);

  const portValue = data.smtpPort === undefined || data.smtpPort === null || data.smtpPort === ''
    ? ''
    : data.smtpPort;
  const smtpPort = portValue === '' ? '' : Number(portValue);

  if (!allowMissing || smtpHost) {
    if (!smtpHost) throw new Error('smtpHost is required');
  }
  if (!allowMissing || smtpPort !== '') {
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      throw new Error('smtpPort must be an integer between 1 and 65535');
    }
  }
  if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new Error('fromEmail format is invalid');
  }

  const normalized = {
    smtpHost,
    smtpPort: smtpPort === '' ? '' : smtpPort,
    smtpSecure,
    smtpUser,
    fromEmail,
    fromName
  };
  if (smtpPassword !== undefined) normalized.smtpPassword = smtpPassword;
  return normalized;
}

module.exports = {
  DEFAULT_EMAIL_INTERVAL_MINUTES,
  EMAIL_ACCOUNT_SETTING_KEYS,
  MIN_EMAIL_INTERVAL_MINUTES,
  MAX_EMAIL_INTERVAL_MINUTES,
  normalizeEmailAccountSettings,
  normalizeEmailIntervalMinutes
};

package com.oneflow.api.email;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Repository
public class EmailRepository {

    private static final String EMAIL_INTERVAL_KEY = "email.send_interval_minutes";
    private static final String SMTP_HOST_KEY = "email.smtp_host";
    private static final String SMTP_PORT_KEY = "email.smtp_port";
    private static final String SMTP_SECURE_KEY = "email.smtp_secure";
    private static final String SMTP_USER_KEY = "email.smtp_user";
    private static final String SMTP_PASSWORD_KEY = "email.smtp_password";
    private static final String FROM_EMAIL_KEY = "email.from_email";
    private static final String FROM_NAME_KEY = "email.from_name";

    private final JdbcTemplate jdbcTemplate;

    public EmailRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getPublicSettings() {
        Map<String, Object> settings = normalizeAccount(readSettings(), true);
        settings.put("sendIntervalMinutes", normalizeInterval(findValue(EMAIL_INTERVAL_KEY), 10));
        settings.put("passwordConfigured", StringUtils.hasText(findValue(SMTP_PASSWORD_KEY)));
        // smtpPassword 属于敏感字段，只在发送服务内部读取，任何配置接口都不返回明文。
        return settings;
    }

    public Map<String, Object> getDeliverySettings() {
        Map<String, Object> settings = getPublicSettings();
        settings.put("smtpPassword", findValue(SMTP_PASSWORD_KEY));
        return settings;
    }

    @Transactional
    public Map<String, Object> updateSettings(Map<String, Object> body) {
        int sendIntervalMinutes = normalizeInterval(value(body, "sendIntervalMinutes"), 10);
        Map<String, Object> account = normalizeAccount(body, false);
        String existingPassword = findValue(SMTP_PASSWORD_KEY);

        setValue(EMAIL_INTERVAL_KEY, String.valueOf(sendIntervalMinutes));
        setValue(SMTP_HOST_KEY, String.valueOf(account.get("smtpHost")));
        setValue(SMTP_PORT_KEY, String.valueOf(account.get("smtpPort")));
        setValue(SMTP_SECURE_KEY, String.valueOf(account.get("smtpSecure")));
        setValue(SMTP_USER_KEY, String.valueOf(account.get("smtpUser")));
        setValue(FROM_EMAIL_KEY, String.valueOf(account.get("fromEmail")));
        setValue(FROM_NAME_KEY, String.valueOf(account.get("fromName")));
        if (body != null && body.containsKey("smtpPassword") && StringUtils.hasText(String.valueOf(body.get("smtpPassword")))) {
            setValue(SMTP_PASSWORD_KEY, String.valueOf(body.get("smtpPassword")));
        }

        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("sendIntervalMinutes", sendIntervalMinutes);
        response.putAll(account);
        response.put("passwordConfigured", StringUtils.hasText(trimmed(value(body, "smtpPassword"))) || StringUtils.hasText(existingPassword));
        return response;
    }

    private Map<String, Object> readSettings() {
        Map<String, Object> settings = new LinkedHashMap<String, Object>();
        settings.put("smtpHost", findValue(SMTP_HOST_KEY));
        settings.put("smtpPort", findValue(SMTP_PORT_KEY));
        settings.put("smtpSecure", findValue(SMTP_SECURE_KEY));
        settings.put("smtpUser", findValue(SMTP_USER_KEY));
        settings.put("fromEmail", findValue(FROM_EMAIL_KEY));
        settings.put("fromName", findValue(FROM_NAME_KEY));
        return settings;
    }

    private Map<String, Object> normalizeAccount(Map<String, Object> data, boolean allowMissing) {
        String smtpHost = trimmed(value(data, "smtpHost"));
        String smtpUser = trimmed(value(data, "smtpUser"));
        String fromEmail = trimmed(value(data, "fromEmail"));
        String fromName = trimmed(value(data, "fromName"));
        Object portRaw = value(data, "smtpPort");
        Object secureRaw = value(data, "smtpSecure");

        Integer smtpPort = parseOptionalPort(portRaw);
        boolean smtpSecure = normalizeBoolean(secureRaw, true);

        if (!allowMissing || StringUtils.hasText(smtpHost)) {
            if (!StringUtils.hasText(smtpHost)) {
                throw new IllegalArgumentException("smtpHost is required");
            }
        }
        if (!allowMissing || smtpPort != null) {
            if (smtpPort == null || smtpPort < 1 || smtpPort > 65535) {
                throw new IllegalArgumentException("smtpPort must be an integer between 1 and 65535");
            }
        }
        if (StringUtils.hasText(fromEmail) && !fromEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("fromEmail format is invalid");
        }

        Map<String, Object> account = new LinkedHashMap<String, Object>();
        account.put("smtpHost", smtpHost == null ? "" : smtpHost);
        account.put("smtpPort", smtpPort == null ? "" : smtpPort);
        account.put("smtpSecure", smtpSecure);
        account.put("smtpUser", smtpUser == null ? "" : smtpUser);
        account.put("fromEmail", fromEmail == null ? "" : fromEmail);
        account.put("fromName", fromName == null ? "" : fromName);
        return account;
    }

    private int normalizeInterval(Object value, int fallback) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        if (!text.matches("^\\d+$")) {
            throw new IllegalArgumentException("sendIntervalMinutes must be an integer between 1 and 60");
        }
        int parsed = Integer.parseInt(text);
        if (parsed < 1 || parsed > 60) {
            throw new IllegalArgumentException("sendIntervalMinutes must be between 1 and 60");
        }
        return parsed;
    }

    private Integer parseOptionalPort(Object value) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        String text = String.valueOf(value).trim();
        if (!text.matches("^\\d+$")) {
            return -1;
        }
        return Integer.valueOf(text);
    }

    private boolean normalizeBoolean(Object value, boolean fallback) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return fallback;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() == 1;
        }
        String text = String.valueOf(value).trim().toLowerCase();
        if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) return true;
        if ("false".equals(text) || "0".equals(text) || "no".equals(text)) return false;
        return fallback;
    }

    private String findValue(String key) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT settingValue FROM system_settings WHERE settingKey = ?",
                    String.class,
                    key);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private void setValue(String key, String value) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE settingKey = ?",
                Integer.class,
                key);
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE system_settings SET settingValue = ?, updatedAt = CURRENT_TIMESTAMP WHERE settingKey = ?",
                    value,
                    key);
            return;
        }
        jdbcTemplate.update(
                "INSERT INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                UUID.randomUUID().toString(),
                key,
                value);
    }

    private Object value(Map<String, Object> data, String key) {
        return data == null ? null : data.get(key);
    }

    private String trimmed(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}

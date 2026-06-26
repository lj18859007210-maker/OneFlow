package com.oneflow.api.email;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import javax.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailSenderService {

    private final EmailRepository emailRepository;

    public EmailSenderService(EmailRepository emailRepository) {
        this.emailRepository = emailRepository;
    }

    public Map<String, Object> send(Map<String, Object> body) {
        List<String> to = normalizeRecipients(body == null ? null : body.get("to"));
        List<String> cc = normalizeRecipients(body == null ? null : body.get("cc"));
        String subject = text(body == null ? null : body.get("subject"));
        String content = text(body == null ? null : body.get("body"));

        if (to.isEmpty()) {
            throw new IllegalArgumentException("to is required");
        }
        if (!StringUtils.hasText(subject)) {
            throw new IllegalArgumentException("subject is required");
        }
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("body is required");
        }

        Map<String, Object> settings = emailRepository.getDeliverySettings();
        JavaMailSenderImpl sender = createSender(settings);
        String from = formatFrom(settings);
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to.toArray(new String[to.size()]));
            if (!cc.isEmpty()) {
                helper.setCc(cc.toArray(new String[cc.size()]));
            }
            helper.setSubject(subject);
            helper.setText(content, false);
            sender.send(message);

            Map<String, Object> email = new LinkedHashMap<String, Object>();
            email.put("to", to);
            email.put("cc", cc);
            email.put("subject", subject);
            email.put("body", content);
            email.put("sentAt", Instant.now().toString());

            Map<String, Object> result = new LinkedHashMap<String, Object>();
            result.put("success", true);
            result.put("message", "邮件发送成功");
            result.put("messageId", message.getMessageID());
            result.put("email", email);
            return result;
        } catch (Exception ex) {
            throw new IllegalStateException(ex.getMessage(), ex);
        }
    }

    private JavaMailSenderImpl createSender(Map<String, Object> settings) {
        String host = text(settings.get("smtpHost"));
        if (!StringUtils.hasText(host)) {
            throw new IllegalStateException("smtpHost is required");
        }
        Integer port = integer(settings.get("smtpPort"));
        if (port == null) {
            throw new IllegalStateException("smtpPort is required");
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(text(settings.get("smtpUser")));
        sender.setPassword(settings.get("smtpPassword") == null ? "" : String.valueOf(settings.get("smtpPassword")));
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", StringUtils.hasText(sender.getUsername()) ? "true" : "false");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.ssl.enable", Boolean.TRUE.equals(settings.get("smtpSecure")) ? "true" : "false");
        return sender;
    }

    private String formatFrom(Map<String, Object> settings) {
        String address = text(settings.get("fromEmail"));
        if (!StringUtils.hasText(address)) {
            address = text(settings.get("smtpUser"));
        }
        if (!StringUtils.hasText(address)) {
            throw new IllegalStateException("fromEmail or smtpUser is required");
        }
        String name = text(settings.get("fromName"));
        if (!StringUtils.hasText(name)) {
            return address;
        }
        return "\"" + name.replace("\"", "\\\"") + "\" <" + address + ">";
    }

    private List<String> normalizeRecipients(Object value) {
        List<Object> raw = new ArrayList<Object>();
        if (value instanceof List) {
            raw.addAll((List<?>) value);
        } else {
            raw.add(value);
        }

        Set<String> recipients = new LinkedHashSet<String>();
        for (Object item : raw) {
            String text = item == null ? "" : String.valueOf(item);
            String[] parts = text.split("[,;，；\\s]+");
            for (String part : parts) {
                String recipient = part.trim();
                if (StringUtils.hasText(recipient)) {
                    recipients.add(recipient);
                }
            }
        }
        return new ArrayList<String>(recipients);
    }

    private Integer integer(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        return Integer.valueOf(String.valueOf(value));
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}

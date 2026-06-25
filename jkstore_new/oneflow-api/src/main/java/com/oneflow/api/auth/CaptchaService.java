package com.oneflow.api.auth;

import com.oneflow.api.config.OneFlowProperties;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class CaptchaService {

    private static final char[] CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final SecureRandom random = new SecureRandom();
    private final Map<String, CaptchaEntry> entries = new ConcurrentHashMap<String, CaptchaEntry>();
    private final OneFlowProperties properties;

    public CaptchaService(OneFlowProperties properties) {
        this.properties = properties;
    }

    public CaptchaChallenge create() {
        String code = nextCode();
        String id = UUID.randomUUID().toString();
        long expiresIn = properties.getCaptcha().getExpiresInSeconds();
        entries.put(id, new CaptchaEntry(code, Instant.now().plusSeconds(expiresIn)));
        return new CaptchaChallenge(id, toSvg(code), expiresIn);
    }

    public boolean verify(String id, String code) {
        if (!properties.getCaptcha().isEnabled()) {
            return true;
        }
        if (id == null || code == null) {
            return false;
        }
        CaptchaEntry entry = entries.remove(id);
        if (entry == null || entry.expiresAt.isBefore(Instant.now())) {
            return false;
        }
        return entry.code.equalsIgnoreCase(code.trim());
    }

    private String nextCode() {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < 4; index++) {
            builder.append(CHARS[random.nextInt(CHARS.length)]);
        }
        return builder.toString();
    }

    private String toSvg(String code) {
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"40\">"
                + "<rect width=\"120\" height=\"40\" fill=\"#f6f8fa\"/>"
                + "<text x=\"18\" y=\"27\" font-size=\"22\" font-family=\"Arial\" fill=\"#1f2937\">"
                + code
                + "</text></svg>";
    }

    private static class CaptchaEntry {
        private final String code;
        private final Instant expiresAt;

        private CaptchaEntry(String code, Instant expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }
}

package com.oneflow.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "oneflow")
public class OneFlowProperties {

    private final Jwt jwt = new Jwt();
    private final Captcha captcha = new Captcha();
    private final Security security = new Security();
    private final Upload upload = new Upload();
    private final Ai ai = new Ai();

    public Jwt getJwt() {
        return jwt;
    }

    public Captcha getCaptcha() {
        return captcha;
    }

    public Security getSecurity() {
        return security;
    }

    public Upload getUpload() {
        return upload;
    }

    public Ai getAi() {
        return ai;
    }

    public static class Jwt {
        private String secret = "change-this-secret";
        private long expiresInSeconds = 604800L;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getExpiresInSeconds() {
            return expiresInSeconds;
        }

        public void setExpiresInSeconds(long expiresInSeconds) {
            this.expiresInSeconds = expiresInSeconds;
        }
    }

    public static class Captcha {
        private boolean enabled = true;
        private long expiresInSeconds = 300L;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public long getExpiresInSeconds() {
            return expiresInSeconds;
        }

        public void setExpiresInSeconds(long expiresInSeconds) {
            this.expiresInSeconds = expiresInSeconds;
        }
    }

    public static class Security {
        private String allowedOrigins = "*";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Upload {
        private String dir = "uploads";
        private long maxFileSize = 10 * 1024 * 1024L;

        public String getDir() {
            return dir;
        }

        public void setDir(String dir) {
            this.dir = dir;
        }

        public long getMaxFileSize() {
            return maxFileSize;
        }

        public void setMaxFileSize(long maxFileSize) {
            this.maxFileSize = maxFileSize;
        }
    }

    public static class Ai {
        private boolean mockEnabled = false;
        private String provider = "ollama";
        private String baseUrl = "";
        private String model = "";
        private String apiKey = "";

        public boolean isMockEnabled() {
            return mockEnabled;
        }

        public void setMockEnabled(boolean mockEnabled) {
            this.mockEnabled = mockEnabled;
        }

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }
    }
}

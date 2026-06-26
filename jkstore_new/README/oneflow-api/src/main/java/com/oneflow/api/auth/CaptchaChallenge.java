package com.oneflow.api.auth;

public class CaptchaChallenge {

    private final String id;
    private final String svg;
    private final long expiresIn;

    public CaptchaChallenge(String id, String svg, long expiresIn) {
        this.id = id;
        this.svg = svg;
        this.expiresIn = expiresIn;
    }

    public String getId() {
        return id;
    }

    public String getSvg() {
        return svg;
    }

    public long getExpiresIn() {
        return expiresIn;
    }
}

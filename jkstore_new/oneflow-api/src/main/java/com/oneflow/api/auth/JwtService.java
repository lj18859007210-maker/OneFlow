package com.oneflow.api.auth;

import com.oneflow.api.config.OneFlowProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.util.Date;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final OneFlowProperties properties;

    public JwtService(OneFlowProperties properties) {
        this.properties = properties;
    }

    public String createToken(CurrentUser user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("id", user.getId())
                .claim("username", user.getUsername())
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + properties.getJwt().getExpiresInSeconds() * 1000L))
                .signWith(SignatureAlgorithm.HS256, properties.getJwt().getSecret())
                .compact();
    }

    public CurrentUser parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(properties.getJwt().getSecret())
                    .parseClaimsJws(token)
                    .getBody();
            CurrentUser user = new CurrentUser();
            user.setId(asString(claims.get("id")));
            user.setUsername(firstNonBlank(asString(claims.get("username")), claims.getSubject()));
            user.setName(asString(claims.get("name")));
            user.setEmail(asString(claims.get("email")));
            user.setRole(asString(claims.get("role")));
            return user;
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String firstNonBlank(String first, String second) {
        return first != null && first.trim().length() > 0 ? first : second;
    }
}

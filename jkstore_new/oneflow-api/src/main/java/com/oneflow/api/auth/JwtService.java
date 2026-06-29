package com.oneflow.api.auth;

import com.oneflow.api.config.OneFlowProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
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
                // 前端路由守卫会在进入首页前调用 /auth/me 刷新当前用户。
                // 如果 token 里不带权限，/auth/me 会返回空 permissions，
                // 然后前端认为没有 requirement:view，又把用户踢回登录页。
                .claim("permissions", user.getPermissions())
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
            user.setPermissions(asStringList(claims.get("permissions")));
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

    private List<String> asStringList(Object value) {
        List<String> list = new ArrayList<String>();
        if (!(value instanceof List<?>)) {
            return list;
        }
        for (Object item : (List<?>) value) {
            if (item != null) {
                list.add(String.valueOf(item));
            }
        }
        return list;
    }
}

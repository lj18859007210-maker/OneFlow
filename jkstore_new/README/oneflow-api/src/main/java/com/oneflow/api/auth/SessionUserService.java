package com.oneflow.api.auth;

import com.oneflow.api.permission.PermissionRepository;
import com.oneflow.api.user.UserRepository;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SessionUserService {

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public SessionUserService(UserRepository userRepository, PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
    }

    public CurrentUser login(String username, String password) {
        Map<String, Object> row = userRepository.findActiveByUsername(username);
        if (row == null) {
            return null;
        }
        // Node 版使用 bcryptjs；Spring Security 的 BCryptPasswordEncoder
        // 可以验证同一类 $2a/$2b bcrypt hash，数据库密码不需要重新生成。
        String hash = value(row, "PASSWORD", "password");
        if (hash == null || !passwordEncoder.matches(password, hash)) {
            return null;
        }
        return build(row);
    }

    public CurrentUser ensureSsoUser(String username) {
        // 先检查用户是否存在，避免每次 SSO 都做昂贵的 BCrypt encode
        Map<String, Object> existing = userRepository.findActiveByUsername(username);
        if (existing != null) {
            return build(existing);
        }
        // 只在新用户创建时才生成随机密码 hash
        String randomPasswordHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
        return build(userRepository.createSsoUser(username, randomPasswordHash));
    }

    public CurrentUser build(Map<String, Object> row) {
        if (row == null) {
            return null;
        }
        CurrentUser user = new CurrentUser();
        user.setId(value(row, "ID", "id"));
        user.setUsername(value(row, "USERNAME", "username"));
        user.setName(value(row, "NAME", "name"));
        user.setEmail(value(row, "EMAIL", "email"));
        user.setRole(value(row, "ROLE", "role"));
        // 前端鉴权只需要权限 code 数组，不需要完整权限对象。
        // 这里去重后放入 token，与旧 buildCurrentUser 返回结构保持一致。
        Set<String> codes = new LinkedHashSet<String>(permissionRepository.findCodesByRole(user.getRole()));
        user.setPermissions(new java.util.ArrayList<String>(codes));
        return user;
    }

    private String value(Map<String, Object> row, String upper, String lower) {
        Object value = row.get(upper);
        if (value == null) {
            value = row.get(lower);
        }
        return value == null ? null : String.valueOf(value);
    }
}

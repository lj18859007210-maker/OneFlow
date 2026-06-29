package com.oneflow.api.auth;

import com.oneflow.api.permission.PermissionRepository;
import com.oneflow.api.permission.RoleAccess;
import com.oneflow.api.user.UserRepository;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SessionUserService {

    private static final Logger log = LoggerFactory.getLogger(SessionUserService.class);

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
            // 只记录判断结果，不记录密码，方便区分“账号不存在”和“密码不匹配”。
            log.info("[LOGIN] active user not found username={}", username);
            return null;
        }
        // Node 版使用 bcryptjs；Spring Security 的 BCryptPasswordEncoder
        // 可以验证同一类 $2a/$2b bcrypt hash，数据库密码不需要重新生成。
        String hash = value(row, "PASSWORD", "password");
        if (hash == null || !passwordEncoder.matches(password, compatibleBcryptHash(hash))) {
            // 只输出 hash 前缀，确认数据库字段格式即可，避免泄露完整密码摘要。
            log.info("[LOGIN] password mismatch username={} hashPrefix={}", username, hashPrefix(hash));
            return null;
        }
        log.info("[LOGIN] password matched username={}", username);
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
        addBasePermissionsWhenRoleMappingIsMissing(user.getRole(), codes);
        user.setPermissions(new java.util.ArrayList<String>(codes));
        return user;
    }

    private void addBasePermissionsWhenRoleMappingIsMissing(String role, Set<String> codes) {
        if (!codes.isEmpty()) {
            return;
        }

        String roleName = RoleAccess.normalizeRoleName(role);
        List<String> basePermissions = null;
        if ("user".equals(roleName) || "developer".equals(roleName)) {
            // 兼容内网存量库：旧 Node 后端允许普通用户和开发人员进入需求列表。
            // 新库若缺少 role_permissions 初始化数据，返回空权限会让前端首页守卫反复跳转。
            basePermissions = Arrays.asList("requirement:view");
        }

        if (basePermissions != null) {
            codes.addAll(basePermissions);
        }
    }

    private String value(Map<String, Object> row, String upper, String lower) {
        Object value = row.get(upper);
        if (value == null) {
            value = row.get(lower);
        }
        return value == null ? null : String.valueOf(value);
    }

    private String hashPrefix(String hash) {
        if (hash == null) {
            return "null";
        }
        return hash.length() <= 4 ? hash : hash.substring(0, 4);
    }

    private String compatibleBcryptHash(String hash) {
        if (hash != null && hash.startsWith("$2b$")) {
            // 旧 Node 后端 bcryptjs 生成/支持 $2b$。
            // 当前 Spring Security 5.1.x 的 BCryptPasswordEncoder 只识别 $2a$，
            // 但 $2a$/$2b$ 的主体校验格式相同；这里只在内存中转换给校验器使用，
            // 不修改数据库里的原始 hash，避免影响旧后端或其他系统。
            return "$2a$" + hash.substring(4);
        }
        return hash;
    }
}

package com.oneflow.api.security;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.auth.JwtService;
import com.oneflow.api.permission.PermissionRepository;
import com.oneflow.api.permission.RoleAccess;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AuthSupport {

    private final JwtService jwtService;
    private final PermissionRepository permissionRepository;

    public AuthSupport(JwtService jwtService, PermissionRepository permissionRepository) {
        this.jwtService = jwtService;
        this.permissionRepository = permissionRepository;
    }

    public CurrentUser parseBearerUser(String authorization) {
        if (!StringUtils.hasText(authorization) || !authorization.toLowerCase().startsWith("bearer ")) {
            return null;
        }
        return jwtService.parse(authorization.substring(7).trim());
    }

    public boolean hasPermission(CurrentUser user, String permissionCode) {
        if (user == null) {
            return false;
        }
        String roleId = RoleAccess.normalizeRoleId(user.getRole());
        // 旧 Node 中 admin 角色直接放行，避免后台权限表缺种子数据时管理员被锁死。
        if ("role-admin".equals(roleId)) {
            return true;
        }
        // 非管理员每次按数据库 role_permissions 校验，保证管理员改权限后立即生效。
        return permissionRepository.hasPermission(user.getRole(), permissionCode);
    }
}

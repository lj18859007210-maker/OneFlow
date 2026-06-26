package com.oneflow.api.permission;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class PermissionRepository {

    private final JdbcTemplate jdbcTemplate;

    public PermissionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Permission> findAll() {
        try {
            return jdbcTemplate.query(
                    "SELECT id, code, name, module, description, createdAt FROM permissions ORDER BY module, code",
                    mapper());
        } catch (BadSqlGrammarException ex) {
            // 兼容旧 Node 行为：权限表还没初始化时返回空列表，
            // 不因为缺表导致服务整体不可用，便于分阶段部署数据库脚本。
            return new ArrayList<Permission>();
        }
    }

    public List<Permission> findByRole(String role) {
        String roleId = RoleAccess.normalizeRoleId(role);
        if (roleId == null) {
            return new ArrayList<Permission>();
        }
        return jdbcTemplate.query(
                "SELECT DISTINCT p.id, p.code, p.name, p.module, p.description, p.createdAt "
                        + "FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permissionId "
                        + "WHERE rp.roleId = ? ORDER BY p.module, p.code",
                mapper(),
                roleId);
    }

    public List<String> findCodesByRole(String role) {
        String roleId = RoleAccess.normalizeRoleId(role);
        if (roleId == null) {
            return new ArrayList<String>();
        }
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT p.code FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permissionId "
                        + "WHERE rp.roleId = ? ORDER BY p.code",
                String.class,
                roleId);
    }

    public boolean hasPermission(String role, String code) {
        String roleId = RoleAccess.normalizeRoleId(role);
        if (roleId == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM role_permissions rp INNER JOIN permissions p ON rp.permissionId = p.id "
                        + "WHERE rp.roleId = ? AND p.code = ?",
                Integer.class,
                roleId,
                code);
        return count != null && count > 0;
    }

    public List<String> findModules() {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT module FROM permissions WHERE module IS NOT NULL ORDER BY module",
                String.class);
    }

    @Transactional
    public void assign(String role, List<String> permissionIds) {
        String roleId = RoleAccess.normalizeRoleId(role);
        if (roleId == null) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
        // 角色权限采用“先删后插”的全量覆盖方式，保持和旧 Node assignPermissions 一致。
        // 调用方传入的 permissionIds 就是该角色最终权限集合。
        jdbcTemplate.update("DELETE FROM role_permissions WHERE roleId = ?", roleId);
        if (permissionIds == null) {
            return;
        }
        for (String permissionId : permissionIds) {
            if (permissionId != null && !permissionId.trim().isEmpty()) {
                jdbcTemplate.update(
                        "INSERT INTO role_permissions (id, roleId, permissionId) VALUES (?, ?, ?)",
                        UUID.randomUUID().toString(),
                        roleId,
                        permissionId.trim());
            }
        }
    }

    private RowMapper<Permission> mapper() {
        return new RowMapper<Permission>() {
            @Override
            public Permission mapRow(ResultSet rs, int rowNum) throws SQLException {
                Permission permission = new Permission();
                permission.setId(rs.getString("id"));
                permission.setCode(rs.getString("code"));
                permission.setName(rs.getString("name"));
                permission.setModule(rs.getString("module"));
                permission.setDescription(rs.getString("description"));
                permission.setCreatedAt(rs.getTimestamp("createdAt"));
                return permission;
            }
        };
    }
}

package com.oneflow.api.user;

import com.oneflow.api.permission.RoleAccess;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> findActiveByUsername(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, username, password, name, email, role, status, createdAt, updatedAt "
                        + "FROM users WHERE username = ? AND status = 1",
                username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> findById(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, username, name, email, role, status, createdAt, updatedAt FROM users WHERE id = ?",
                id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    public Map<String, Object> ensureSsoUser(String username, String passwordHash) {
        Map<String, Object> existing = findActiveByUsername(username);
        if (existing != null) {
            return existing;
        }
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO users (id, username, password, name, email, role, status) VALUES (?, ?, ?, ?, ?, ?, 1)",
                id,
                username,
                passwordHash,
                username,
                null,
                "user");
        return findActiveByUsername(username);
    }

    /**
     * 插入新 SSO 用户（前提是已确认 username 不存在），
     * 用于 {@code SessionUserService.ensureSsoUser()} 的已有用户快捷路径，
     * 避免每次 SSO 都做完整 ensureSsoUser 中的多余 select。
     */
    @Transactional
    public Map<String, Object> createSsoUser(String username, String passwordHash) {
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO users (id, username, password, name, email, role, status) VALUES (?, ?, ?, ?, ?, ?, 1)",
                id,
                username,
                passwordHash,
                username,
                null,
                "user");
        return findActiveByUsername(username);
    }

    public Map<String, Object> findPage(int page, int pageSize, String role, String keyword) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        java.util.ArrayList<Object> params = new java.util.ArrayList<Object>();

        String roleName = RoleAccess.normalizeRoleName(role);
        if (roleName != null) {
            where.append(" AND role = ?");
            params.add(roleName);
        }
        if (StringUtils.hasText(keyword)) {
            where.append(" AND (LOWER(name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users" + where, params.toArray(), Integer.class);
        int offset = (safePage - 1) * safePageSize;
        params.add(offset);
        params.add(offset + safePageSize);
        // 使用 ROW_NUMBER() 做分页，而不是 LIMIT/OFFSET。
        // 这样 H2 测试库和 Oracle 生产库都能理解，后续接真实 Oracle 时不用再换一套分页语义。
        List<Map<String, Object>> data = jdbcTemplate.queryForList(
                "SELECT ID, USERNAME, NAME, EMAIL, ROLE, STATUS, CREATEDAT, UPDATEDAT FROM ("
                        + "SELECT id AS ID, username AS USERNAME, name AS NAME, email AS EMAIL, role AS ROLE, status AS STATUS, "
                        + "createdAt AS CREATEDAT, updatedAt AS UPDATEDAT, ROW_NUMBER() OVER (ORDER BY createdAt DESC) AS rn "
                        + "FROM users"
                        + where
                        + ") WHERE rn > ? AND rn <= ?",
                params.toArray());

        Map<String, Object> result = new HashMap<String, Object>();
        result.put("data", data);
        result.put("total", total == null ? 0 : total);
        result.put("page", safePage);
        result.put("pageSize", safePageSize);
        return result;
    }

    @Transactional
    public Map<String, Object> updateRole(String id, String role) {
        String roleName = RoleAccess.normalizeRoleName(role);
        if (roleName == null) {
            throw new IllegalArgumentException("Invalid role");
        }
        int updated = jdbcTemplate.update("UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", roleName, id);
        if (updated == 0) {
            return null;
        }
        // 旧逻辑：用户角色改成 developer 时自动补开发者档案；
        // 改成其他角色时移除开发者档案，避免开发人员列表出现无效账号。
        if ("developer".equals(roleName)) {
            Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM developers WHERE userId = ?", Integer.class, id);
            if (exists != null && exists == 0) {
                Map<String, Object> user = findById(id);
                jdbcTemplate.update(
                        "INSERT INTO developers (id, userId, name, email, maxLoad, currentLoad, status) VALUES (?, ?, ?, ?, 5, 0, 1)",
                        UUID.randomUUID().toString(),
                        id,
                        user.get("NAME") == null ? user.get("name") : user.get("NAME"),
                        user.get("EMAIL") == null ? user.get("email") : user.get("EMAIL"));
            }
        } else {
            jdbcTemplate.update("DELETE FROM developers WHERE userId = ?", id);
        }
        return findById(id);
    }
}

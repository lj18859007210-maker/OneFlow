package com.oneflow.api.developer;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Repository
public class DeveloperRepository {

    private static final String DEVELOPER_ROLE_SQL = "('developer', 'role-developer')";
    private static final String ASSIGNABLE_ROLE_SQL = "('developer', 'role-developer', 'admin', 'role-admin')";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public DeveloperRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> findAll(String department, Integer status) {
        return queryDevelopers(department, status, DEVELOPER_ROLE_SQL);
    }

    public List<Map<String, Object>> findAssignable() {
        // 需求创建页的“可指派人员”沿用旧 Node 逻辑：开发者和管理员都可被指派。
        // 这样管理员临时兜底处理需求时，前端下拉框仍能选到管理员账号。
        return queryDevelopers(null, 1, ASSIGNABLE_ROLE_SQL);
    }

    public Map<String, Object> findByUserId(String userId) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                baseSelect() + " WHERE u.id = ? ORDER BY u.name ASC",
                rowMapper(),
                userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> loadStats() {
        List<Map<String, Object>> developers = findAll(null, 1);
        List<Map<String, Object>> stats = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> developer : developers) {
            Number currentLoad = number(developer.get("currentLoad"), 0);
            Number maxLoad = number(developer.get("maxLoad"), 5);
            double percent = maxLoad.doubleValue() == 0 ? 0 : Math.round(currentLoad.doubleValue() * 1000.0 / maxLoad.doubleValue()) / 10.0;

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("id", developer.get("id"));
            item.put("name", developer.get("name"));
            item.put("department", developer.get("department"));
            item.put("maxLoad", maxLoad);
            item.put("currentLoad", currentLoad);
            item.put("loadPercent", percent);
            stats.add(item);
        }
        stats.sort((a, b) -> Double.compare(number(b.get("loadPercent"), 0).doubleValue(), number(a.get("loadPercent"), 0).doubleValue()));
        return stats;
    }

    public List<String> departments() {
        List<Map<String, Object>> developers = findAll(null, 1);
        List<String> result = new ArrayList<String>();
        for (Map<String, Object> developer : developers) {
            String department = developer.get("department") == null ? null : String.valueOf(developer.get("department"));
            if (StringUtils.hasText(department) && !result.contains(department)) {
                result.add(department);
            }
        }
        java.util.Collections.sort(result);
        return result;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        String email = optionalString(body, "email");
        if (!StringUtils.hasText(email)) {
            throw new IllegalArgumentException("创建开发人员需要提供邮箱");
        }

        Map<String, Object> user = findDeveloperAccountByEmail(email);
        if (user == null) {
            throw new IllegalArgumentException("未找到开发人员角色账号，请先在用户角色管理中设置");
        }

        String userId = String.valueOf(read(user, "id"));
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM developers WHERE userId = ?", Integer.class, userId);
        if (exists != null && exists > 0) {
            return findByUserId(userId);
        }

        // developers 表只保存开发者档案信息，账号、角色、登录状态仍以 users 表为准。
        // 这种分层让后续新增其它后端项目时，可以复用用户体系而不把业务档案混入账号表。
        jdbcTemplate.update(
                "INSERT INTO developers (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                UUID.randomUUID().toString(),
                userId,
                read(user, "name"),
                read(user, "email"),
                optionalString(body, "department"),
                jsonOrNull(body.get("skills")),
                integerOrDefault(body.get("maxLoad"), 5),
                body.containsKey("status") ? integerOrDefault(body.get("status"), 1) : number(read(user, "status"), 1).intValue());
        return findByUserId(userId);
    }

    @Transactional
    public Map<String, Object> update(String userId, Map<String, Object> body) {
        Map<String, Object> user = findDeveloperAccountById(userId);
        if (user == null) {
            return null;
        }

        jdbcTemplate.update(
                "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), status = COALESCE(?, status), updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
                optionalString(body, "name"),
                optionalString(body, "email"),
                body.containsKey("status") ? integerOrDefault(body.get("status"), 1) : null,
                userId);

        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM developers WHERE userId = ?", Integer.class, userId);
        if (exists == null || exists == 0) {
            // 旧系统允许先把用户角色改成开发者，再在开发者管理里补档案。
            // 因此更新接口要具备 upsert 能力，避免前端因为缺少 profile 先后顺序而失败。
            jdbcTemplate.update(
                    "INSERT INTO developers (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    UUID.randomUUID().toString(),
                    userId,
                    optionalOrFallback(body, "name", read(user, "name")),
                    optionalOrFallback(body, "email", read(user, "email")),
                    optionalString(body, "department"),
                    jsonOrNull(body.get("skills")),
                    integerOrDefault(body.get("maxLoad"), 5),
                    body.containsKey("status") ? integerOrDefault(body.get("status"), 1) : 1);
        } else {
            jdbcTemplate.update(
                    "UPDATE developers SET department = COALESCE(?, department), skills = COALESCE(?, skills), "
                            + "maxLoad = COALESCE(?, maxLoad), status = COALESCE(?, status), name = COALESCE(?, name), "
                            + "email = COALESCE(?, email), updatedAt = CURRENT_TIMESTAMP WHERE userId = ?",
                    optionalString(body, "department"),
                    body.containsKey("skills") ? jsonOrNull(body.get("skills")) : null,
                    body.containsKey("maxLoad") ? integerOrDefault(body.get("maxLoad"), 5) : null,
                    body.containsKey("status") ? integerOrDefault(body.get("status"), 1) : null,
                    optionalString(body, "name"),
                    optionalString(body, "email"),
                    userId);
        }
        return findByUserId(userId);
    }

    @Transactional
    public boolean remove(String userId) {
        Map<String, Object> user = jdbcTemplate.queryForList("SELECT id, name, email FROM users WHERE id = ?", userId)
                .stream()
                .findFirst()
                .orElse(null);
        if (user == null) {
            return false;
        }

        jdbcTemplate.update("DELETE FROM developers WHERE userId = ?", userId);
        int updated = jdbcTemplate.update(
                "UPDATE users SET role = 'user', updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND role IN ('developer', 'role-developer')",
                userId);
        return updated > 0;
    }

    private List<Map<String, Object>> queryDevelopers(String department, Integer status, String roleSql) {
        StringBuilder sql = new StringBuilder(baseSelect()).append(" WHERE u.role IN ").append(roleSql);
        List<Object> params = new ArrayList<Object>();
        if (StringUtils.hasText(department)) {
            sql.append(" AND COALESCE(d.department, '') = ?");
            params.add(department);
        }
        if (status != null) {
            sql.append(" AND u.status = ?");
            params.add(status);
        }
        sql.append(" ORDER BY u.name ASC");
        return jdbcTemplate.query(sql.toString(), rowMapper(), params.toArray());
    }

    private String baseSelect() {
        return "SELECT u.id AS userId, u.username, u.name, u.email, u.role, u.status, u.createdAt, u.updatedAt, "
                + "d.id AS profileId, d.department, d.skills, COALESCE(d.maxLoad, 5) AS maxLoad, "
                + "COALESCE(d.currentLoad, 0) AS currentLoad "
                + "FROM users u LEFT JOIN developers d ON d.userId = u.id";
    }

    private Map<String, Object> findDeveloperAccountByEmail(String email) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, email, status FROM users WHERE email = ? AND role IN ('developer', 'role-developer')",
                email);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private Map<String, Object> findDeveloperAccountById(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, email, status FROM users WHERE id = ? AND role IN ('developer', 'role-developer')",
                id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                String role = rs.getString("role");
                String department = rs.getString("department");
                if (!StringUtils.hasText(department) && ("admin".equals(role) || "role-admin".equals(role))) {
                    department = "管理员";
                }

                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("userId"));
                row.put("userId", rs.getString("userId"));
                row.put("profileId", rs.getString("profileId"));
                row.put("name", rs.getString("name"));
                row.put("username", rs.getString("username"));
                row.put("email", rs.getString("email"));
                row.put("role", role);
                row.put("department", department);
                row.put("skills", parseSkills(rs.getString("skills")));
                row.put("maxLoad", rs.getObject("maxLoad"));
                row.put("currentLoad", rs.getObject("currentLoad"));
                row.put("status", rs.getObject("status"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                row.put("updatedAt", rs.getTimestamp("updatedAt"));
                return row;
            }
        };
    }

    private List<Object> parseSkills(String value) {
        if (!StringUtils.hasText(value)) {
            return new ArrayList<Object>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<Object>>() {});
        } catch (Exception ex) {
            return new ArrayList<Object>();
        }
    }

    private String jsonOrNull(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String) {
            return StringUtils.hasText((String) value) ? (String) value : null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private String optionalString(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String value = String.valueOf(body.get(key)).trim();
        return value.isEmpty() ? null : value;
    }

    private Object optionalOrFallback(Map<String, Object> body, String key, Object fallback) {
        String value = optionalString(body, key);
        return value == null ? fallback : value;
    }

    private Integer integerOrDefault(Object value, int fallback) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return fallback;
        }
        return Double.valueOf(String.valueOf(value)).intValue();
    }

    private Number number(Object value, int fallback) {
        if (value instanceof Number) {
            return (Number) value;
        }
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return fallback;
        }
        return Double.valueOf(String.valueOf(value));
    }

    private Object read(Map<String, Object> row, String key) {
        if (row.containsKey(key)) {
            return row.get(key);
        }
        return row.get(key.toUpperCase());
    }
}

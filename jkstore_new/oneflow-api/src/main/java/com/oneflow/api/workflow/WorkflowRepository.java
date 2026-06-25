package com.oneflow.api.workflow;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Repository
public class WorkflowRepository {

    private static final Set<String> VALID_ROLES = new LinkedHashSet<String>(
            Arrays.asList("admin", "developer", "user"));

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public WorkflowRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> findStatuses(String flowKey) {
        return jdbcTemplate.query(
                "SELECT id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled "
                        + "FROM workflow_statuses WHERE flowKey = ? ORDER BY sortOrder ASC",
                statusMapper(),
                flowKey);
    }

    public List<Map<String, Object>> findTransitions(String flowKey) {
        return jdbcTemplate.query(
                "SELECT id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome "
                        + "FROM workflow_transitions WHERE flowKey = ? ORDER BY fromStatus ASC, toStatus ASC",
                transitionMapper(),
                flowKey);
    }

    @Transactional
    public List<Map<String, Object>> replaceStatuses(String flowKey, List<Map<String, Object>> statuses) {
        jdbcTemplate.update("DELETE FROM workflow_statuses WHERE flowKey = ?", flowKey);
        for (Map<String, Object> status : statuses) {
            // statusCode 是前端和需求状态流转共同依赖的稳定编码，迁移时不做自动翻译，避免旧数据失配。
            String statusCode = requiredText(status, "statusCode", "缺少 statusCode");
            String statusName = optionalText(status, "statusName");
            jdbcTemplate.update(
                    "INSERT INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    UUID.randomUUID().toString(),
                    flowKey,
                    statusCode,
                    StringUtils.hasText(statusName) ? statusName : statusCode,
                    integerOrDefault(status.get("sortOrder"), 0),
                    booleanValue(status.get("isTerminal"), false) ? 1 : 0,
                    booleanValue(status.get("enabled"), true) ? 1 : 0);
        }
        return findStatuses(flowKey);
    }

    @Transactional
    public Map<String, Object> createTransition(String flowKey, Map<String, Object> body) {
        Map<String, Object> normalized = normalizeTransitionPayload(body, null);
        validateTransitionPayload(normalized);
        String id = UUID.randomUUID().toString();

        jdbcTemplate.update(
                "INSERT INTO workflow_transitions (id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome, createdAt, updatedAt) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                id,
                flowKey,
                normalized.get("fromStatus"),
                normalized.get("toStatus"),
                toJson(normalized.get("allowedRoles")),
                booleanValue(normalized.get("requireApproval"), false) ? 1 : 0,
                booleanValue(normalized.get("notifyEnabled"), true) ? 1 : 0,
                booleanValue(normalized.get("enabled"), true) ? 1 : 0,
                normalized.get("approvalOutcome"));

        return findTransitionById(id);
    }

    @Transactional
    public Map<String, Object> updateTransition(String id, Map<String, Object> body) {
        Map<String, Object> current = findTransitionById(id);
        if (current == null) {
            return null;
        }

        Map<String, Object> normalized = normalizeTransitionPayload(body, current);
        validateTransitionPayload(normalized);

        jdbcTemplate.update(
                "UPDATE workflow_transitions SET fromStatus = ?, toStatus = ?, allowedRoles = ?, "
                        + "requireApproval = ?, notifyEnabled = ?, enabled = ?, approvalOutcome = ?, updatedAt = CURRENT_TIMESTAMP "
                        + "WHERE id = ?",
                normalized.get("fromStatus"),
                normalized.get("toStatus"),
                toJson(normalized.get("allowedRoles")),
                booleanValue(normalized.get("requireApproval"), false) ? 1 : 0,
                booleanValue(normalized.get("notifyEnabled"), true) ? 1 : 0,
                booleanValue(normalized.get("enabled"), true) ? 1 : 0,
                normalized.get("approvalOutcome"),
                id);

        return findTransitionById(id);
    }

    public Map<String, Integer> reload(String flowKey) {
        Map<String, Integer> result = new LinkedHashMap<String, Integer>();
        result.put("statuses", findStatuses(flowKey).size());
        result.put("transitions", findTransitions(flowKey).size());
        return result;
    }

    private Map<String, Object> findTransitionById(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome "
                        + "FROM workflow_transitions WHERE id = ?",
                transitionMapper(),
                id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private Map<String, Object> normalizeTransitionPayload(Map<String, Object> body, Map<String, Object> current) {
        Map<String, Object> source = body == null ? new LinkedHashMap<String, Object>() : body;
        boolean requireApproval = source.containsKey("requireApproval")
                ? booleanValue(source.get("requireApproval"), false)
                : current != null && booleanValue(current.get("requireApproval"), false);

        Object rawApprovalOutcome = source.containsKey("approvalOutcome")
                ? source.get("approvalOutcome")
                : current == null ? null : current.get("approvalOutcome");
        String approvalOutcome = requireApproval ? normalizeApprovalOutcome(rawApprovalOutcome) : "none";
        if (requireApproval && !StringUtils.hasText(approvalOutcome)) {
            approvalOutcome = "approved";
        }

        Map<String, Object> normalized = new LinkedHashMap<String, Object>();
        normalized.put("fromStatus", firstText(source.get("fromStatus"), current == null ? null : current.get("fromStatus")));
        normalized.put("toStatus", firstText(source.get("toStatus"), current == null ? null : current.get("toStatus")));
        // allowedRoles 在旧 Node 中以 JSON 字符串存库；Java 层统一转成数组返回，避免前端再判断字符串/数组两种形态。
        normalized.put("allowedRoles", normalizeRoles(source.containsKey("allowedRoles")
                ? source.get("allowedRoles")
                : current == null ? null : current.get("allowedRoles")));
        normalized.put("requireApproval", requireApproval);
        normalized.put("notifyEnabled", source.containsKey("notifyEnabled")
                ? booleanValue(source.get("notifyEnabled"), true)
                : current == null || booleanValue(current.get("notifyEnabled"), true));
        normalized.put("enabled", source.containsKey("enabled")
                ? booleanValue(source.get("enabled"), true)
                : current == null || booleanValue(current.get("enabled"), true));
        normalized.put("approvalOutcome", approvalOutcome);
        return normalized;
    }

    private void validateTransitionPayload(Map<String, Object> payload) {
        if (!StringUtils.hasText((String) payload.get("fromStatus")) || !StringUtils.hasText((String) payload.get("toStatus"))) {
            throw new IllegalArgumentException("流转配置缺少状态定义");
        }
        if (((List<?>) payload.get("allowedRoles")).isEmpty()) {
            throw new IllegalArgumentException("流转配置至少需要一个执行角色");
        }
        boolean requireApproval = booleanValue(payload.get("requireApproval"), false);
        String approvalOutcome = String.valueOf(payload.get("approvalOutcome"));
        if (requireApproval && !("approved".equals(approvalOutcome) || "rejected".equals(approvalOutcome))) {
            throw new IllegalArgumentException("需要审批的流转只能使用 approved 或 rejected 作为审批结果");
        }
        if (!requireApproval && !"none".equals(approvalOutcome)) {
            throw new IllegalArgumentException("无需审批的流转审批结果必须为 none");
        }
    }

    private List<String> normalizeRoles(Object value) {
        List<?> rawRoles = parseRoleList(value);
        List<String> roles = new ArrayList<String>();
        for (Object rawRole : rawRoles) {
            String role = normalizeRole(rawRole);
            if (role != null && !roles.contains(role)) {
                roles.add(role);
            }
        }
        return roles;
    }

    private List<?> parseRoleList(Object value) {
        if (value == null) {
            return new ArrayList<Object>();
        }
        if (value instanceof List) {
            return (List<?>) value;
        }
        String text = String.valueOf(value).trim();
        if (!StringUtils.hasText(text)) {
            return new ArrayList<Object>();
        }
        try {
            return objectMapper.readValue(text, new TypeReference<List<Object>>() {});
        } catch (Exception ignored) {
            return Arrays.asList(text.split(","));
        }
    }

    private String normalizeRole(Object value) {
        Object raw = value;
        if (value instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) value;
            raw = map.containsKey("value") ? map.get("value") : map.containsKey("role") ? map.get("role") : map.get("code");
        }
        if (raw == null) {
            return null;
        }
        String role = String.valueOf(raw).trim();
        if (!StringUtils.hasText(role) || "[object Object]".equals(role)) {
            return null;
        }
        if ("role-admin".equals(role)) role = "admin";
        if ("role-developer".equals(role)) role = "developer";
        if ("role-user".equals(role)) role = "user";
        return VALID_ROLES.contains(role) ? role : null;
    }

    private RowMapper<Map<String, Object>> statusMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("flowKey", rs.getString("flowKey"));
                row.put("statusCode", rs.getString("statusCode"));
                row.put("statusName", rs.getString("statusName"));
                row.put("sortOrder", rs.getInt("sortOrder"));
                row.put("isTerminal", rs.getInt("isTerminal") == 1);
                row.put("enabled", rs.getInt("enabled") == 1);
                return row;
            }
        };
    }

    private RowMapper<Map<String, Object>> transitionMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("flowKey", rs.getString("flowKey"));
                row.put("fromStatus", rs.getString("fromStatus"));
                row.put("toStatus", rs.getString("toStatus"));
                row.put("allowedRoles", normalizeRoles(rs.getString("allowedRoles")));
                row.put("requireApproval", rs.getInt("requireApproval") == 1);
                row.put("notifyEnabled", rs.getInt("notifyEnabled") == 1);
                row.put("enabled", rs.getInt("enabled") == 1);
                row.put("approvalOutcome", StringUtils.hasText(rs.getString("approvalOutcome")) ? rs.getString("approvalOutcome") : "none");
                return row;
            }
        };
    }

    private String requiredText(Map<String, Object> body, String key, String message) {
        String value = optionalText(body, key);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private String optionalText(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String value = String.valueOf(body.get(key)).trim();
        return value.isEmpty() ? null : value;
    }

    private String firstText(Object value, Object fallback) {
        String text = value == null ? null : String.valueOf(value).trim();
        if (StringUtils.hasText(text)) {
            return text;
        }
        return fallback == null ? null : String.valueOf(fallback).trim();
    }

    private String normalizeApprovalOutcome(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return StringUtils.hasText(text) ? text : null;
    }

    private boolean booleanValue(Object value, boolean fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        String text = String.valueOf(value).trim();
        if (!StringUtils.hasText(text)) {
            return fallback;
        }
        return "true".equalsIgnoreCase(text) || "1".equals(text);
    }

    private int integerOrDefault(Object value, int fallback) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return fallback;
        }
        return Double.valueOf(String.valueOf(value)).intValue();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "[]";
        }
    }
}

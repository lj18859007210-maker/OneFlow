package com.oneflow.api.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

@Repository
public class AuditLogRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AuditLogRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> findPage(String userId, String action, String resource, String status, int page, int pageSize) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<Object>();
        append(where, params, "userId", userId);
        append(where, params, "action", action);
        append(where, params, "resource", resource);
        append(where, params, "status", status);

        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM audit_logs" + where, params.toArray(), Integer.class);
        List<Object> pageParams = new ArrayList<Object>(params);
        pageParams.add(offset);
        pageParams.add(offset + safePageSize);
        List<Map<String, Object>> data = jdbcTemplate.query(
                "SELECT * FROM (SELECT a.*, ROW_NUMBER() OVER (ORDER BY createdAt DESC) rn FROM audit_logs a"
                        + where + ") WHERE rn > ? AND rn <= ?",
                rowMapper(),
                pageParams.toArray());
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("data", data);
        result.put("total", total == null ? 0 : total);
        result.put("page", safePage);
        result.put("pageSize", safePageSize);
        return result;
    }

    public List<Map<String, Object>> actions() {
        List<String> actions = jdbcTemplate.queryForList("SELECT DISTINCT action FROM audit_logs ORDER BY action", String.class);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (String action : actions) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("value", action);
            item.put("label", actionLabel(action));
            result.add(item);
        }
        return result;
    }

    private void append(StringBuilder where, List<Object> params, String column, String value) {
        if (StringUtils.hasText(value)) {
            where.append(" AND ").append(column).append(" = ?");
            params.add(value);
        }
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("userId", rs.getString("userId"));
                row.put("userName", rs.getString("userName"));
                row.put("userRole", rs.getString("userRole"));
                row.put("action", rs.getString("action"));
                row.put("resource", rs.getString("resource"));
                row.put("resourceId", rs.getString("resourceId"));
                row.put("details", parseDetails(rs.getString("details")));
                row.put("ipAddress", rs.getString("ipAddress"));
                row.put("userAgent", rs.getString("userAgent"));
                row.put("status", rs.getString("status"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                enrich(row);
                return row;
            }
        };
    }

    private void enrich(Map<String, Object> row) {
        row.put("actionLabel", actionLabel(String.valueOf(row.get("action"))));
        row.put("resourceLabel", resourceLabel(row.get("resource") == null ? null : String.valueOf(row.get("resource"))));
        row.put("resultLabel", "failed".equals(row.get("status")) ? "失败" : "成功");
        row.put("summary", String.valueOf(row.get("userName")) + " 对"
                + row.get("resourceLabel") + "执行" + row.get("actionLabel"));
        Map<String, Object> raw = new LinkedHashMap<String, Object>();
        raw.put("action", row.get("action"));
        raw.put("resource", row.get("resource"));
        raw.put("resourceId", row.get("resourceId"));
        row.put("raw", raw);
    }

    private Map<String, Object> parseDetails(String details) {
        if (!StringUtils.hasText(details)) {
            return new LinkedHashMap<String, Object>();
        }
        try {
            return objectMapper.readValue(details, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return new LinkedHashMap<String, Object>();
        }
    }

    private String actionLabel(String action) {
        if ("create".equals(action)) return "新增";
        if ("update".equals(action)) return "编辑";
        if ("delete".equals(action)) return "删除";
        if ("login".equals(action)) return "登录系统";
        if ("upload_attachment".equals(action)) return "上传正式附件";
        if ("upload_comment_attachment".equals(action)) return "上传评论附件";
        if ("upload_attachment_version".equals(action)) return "上传附件新版本";
        if ("promote_comment_attachment".equals(action)) return "转为正式附件";
        if ("delete_attachment".equals(action)) return "删除附件";
        return action;
    }

    private String resourceLabel(String resource) {
        if ("requirement".equals(resource)) return "需求";
        if ("developer".equals(resource)) return "开发人员";
        if ("attachment".equals(resource)) return "附件";
        if ("auth".equals(resource)) return "账号";
        return resource == null ? "资源" : resource;
    }
}

package com.oneflow.api.ai;

import com.oneflow.api.auth.CurrentUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class AiRepository {

    private final JdbcTemplate jdbcTemplate;

    public AiRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> loadContext(CurrentUser viewer) {
        List<Object> params = new ArrayList<Object>();
        String scope = buildScope(viewer, params);
        List<Map<String, Object>> requirements = jdbcTemplate.query(
                "SELECT id, title, submitter, submitterId, developer, developerIds, platform, capability, priority, status, score, "
                        + "expectedDate, actualDate, createdAt, updatedAt FROM requirements WHERE isDraft = 0 "
                        + scope + " ORDER BY createdAt DESC",
                requirementMapper(),
                params.toArray());

        Map<String, Object> context = new LinkedHashMap<String, Object>();
        context.put("today", new SimpleDateFormat("yyyy-MM-dd").format(new Date()));
        context.put("total", requirements.size());
        context.put("all", requirements);
        context.put("recentActivities", loadActivities(requirements));
        return context;
    }

    private List<Map<String, Object>> loadActivities(List<Map<String, Object>> requirements) {
        List<Map<String, Object>> activities = jdbcTemplate.query(
                "SELECT c.requirementId, c.userName, c.type, c.createdAt, r.title "
                        + "FROM requirement_comments c LEFT JOIN requirements r ON r.id = c.requirementId "
                        + "ORDER BY c.createdAt DESC",
                activityMapper());
        if (requirements == null || requirements.isEmpty()) {
            return new ArrayList<Map<String, Object>>();
        }
        List<String> visibleIds = new ArrayList<String>();
        for (Map<String, Object> requirement : requirements) {
            visibleIds.add(String.valueOf(requirement.get("id")));
        }
        List<Map<String, Object>> visible = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> activity : activities) {
            if (visibleIds.contains(String.valueOf(activity.get("requirementId")))) {
                visible.add(activity);
            }
        }
        return visible;
    }

    private String buildScope(CurrentUser viewer, List<Object> params) {
        if (viewer == null) {
            return " AND 1 = 0";
        }
        if ("admin".equals(viewer.getRole()) || "role-admin".equals(viewer.getRole())) {
            return "";
        }
        // 普通用户沿用旧需求可见范围：只能把自己提交或指派给自己的需求喂给 AI，避免 AI 泄露其他人的数据。
        params.add(viewer.getId());
        params.add(viewer.getId());
        params.add(viewer.getName());
        params.add(viewer.getName());
        return " AND (submitterId = ? OR developerIds LIKE ? OR submitter = ? OR developer LIKE ?)";
    }

    private RowMapper<Map<String, Object>> requirementMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("title", rs.getString("title"));
                row.put("submitter", rs.getString("submitter"));
                row.put("developer", rs.getString("developer"));
                row.put("platform", rs.getString("platform"));
                row.put("capability", rs.getString("capability"));
                row.put("priority", rs.getString("priority"));
                row.put("status", rs.getString("status"));
                row.put("score", rs.getObject("score"));
                row.put("expectedDate", format(rs.getObject("expectedDate")));
                row.put("actualDate", format(rs.getObject("actualDate")));
                row.put("createdAt", format(rs.getObject("createdAt")));
                row.put("updatedAt", format(rs.getObject("updatedAt")));
                return row;
            }
        };
    }

    private RowMapper<Map<String, Object>> activityMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("requirementId", rs.getString("requirementId"));
                row.put("title", rs.getString("title"));
                row.put("userName", rs.getString("userName"));
                row.put("type", rs.getString("type"));
                row.put("content", rs.getString("type"));
                row.put("createdAt", format(rs.getObject("createdAt")));
                return row;
            }
        };
    }

    private String format(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Date) {
            return new SimpleDateFormat("yyyy-MM-dd").format((Date) value);
        }
        String text = String.valueOf(value);
        return text.length() > 10 ? text.substring(0, 10) : text;
    }
}

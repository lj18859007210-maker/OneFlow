package com.oneflow.api.requirement;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oneflow.api.auth.CurrentUser;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
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
public class RequirementRepository {

    private static final String STATUS_PENDING_APPROVAL = "待审批";
    private static final String STATUS_PENDING_REVIEW = "待评审";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public RequirementRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> findPage(int page, int pageSize, String keyword, CurrentUser viewer) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;

        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<Object>();
        appendVisibility(where, params, viewer);
        if (StringUtils.hasText(keyword)) {
            where.append(" AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(platform) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM requirements" + where, params.toArray(), Integer.class);
        List<Object> pageParams = new ArrayList<Object>(params);
        pageParams.add(offset);
        pageParams.add(offset + safePageSize);

        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT * FROM ("
                        + "SELECT r.*, ROW_NUMBER() OVER (ORDER BY r.createdAt DESC) AS rn "
                        + "FROM requirements r"
                        + where
                        + ") WHERE rn > ? AND rn <= ?",
                rowMapper(),
                pageParams.toArray());

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("data", rows);
        result.put("total", total == null ? 0 : total);
        result.put("page", safePage);
        result.put("pageSize", safePageSize);
        result.put("statusStats", new LinkedHashMap<String, Object>());
        result.put("priorityStats", new LinkedHashMap<String, Object>());
        result.put("scoreStats", new LinkedHashMap<String, Object>());
        result.put("avgScore", 0);
        result.put("filterOptions", new LinkedHashMap<String, Object>());
        return result;
    }

    public Map<String, Object> findById(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT * FROM requirements WHERE id = ?",
                rowMapper(),
                id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> findMine(int page, int pageSize, CurrentUser user) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;
        List<Object> params = new ArrayList<Object>();
        String where = " WHERE isDraft = 0 AND (submitterId = ? OR submitter = ?)";
        params.add(user.getId());
        params.add(user.getName());

        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM requirements" + where, params.toArray(), Integer.class);
        List<Object> pageParams = new ArrayList<Object>(params);
        pageParams.add(offset);
        pageParams.add(offset + safePageSize);
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT * FROM (SELECT r.*, ROW_NUMBER() OVER (ORDER BY r.createdAt DESC) rn FROM requirements r"
                        + where + ") WHERE rn > ? AND rn <= ?",
                rowMapper(),
                pageParams.toArray());
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("data", rows);
        result.put("total", total == null ? 0 : total);
        result.put("page", safePage);
        result.put("pageSize", safePageSize);
        return result;
    }

    public List<Map<String, Object>> findDrafts(CurrentUser user, String submitter) {
        List<Object> params = new ArrayList<Object>();
        StringBuilder where = new StringBuilder(" WHERE isDraft = 1");
        if (isAdmin(user) && StringUtils.hasText(submitter)) {
            where.append(" AND submitter = ?");
            params.add(submitter);
        } else {
            // 普通用户只读取自己的草稿，避免通过 submitter 参数越权查看他人未提交内容。
            where.append(" AND (submitterId = ? OR submitter = ?)");
            params.add(user.getId());
            params.add(user.getName());
        }
        return jdbcTemplate.query(
                "SELECT * FROM requirements" + where + " ORDER BY updatedAt DESC",
                rowMapper(),
                params.toArray());
    }

    public Map<String, Object> findLatestDraft(CurrentUser user, String submitter) {
        List<Map<String, Object>> drafts = findDrafts(user, submitter);
        return drafts.isEmpty() ? null : drafts.get(0);
    }

    public Map<String, Object> findApprovalPage(int page, int pageSize, String approvalStatus, String keyword, CurrentUser viewer) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 50 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;
        StringBuilder where = new StringBuilder(" WHERE isDraft = 0");
        List<Object> params = new ArrayList<Object>();
        if (StringUtils.hasText(approvalStatus)) {
            where.append(" AND approvalStatus = ?");
            params.add(approvalStatus);
        }
        if (StringUtils.hasText(keyword)) {
            where.append(" AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
        }
        if (!isAdmin(viewer) && "developer".equals(viewer.getRole())) {
            where.append(" AND (developerIds = ? OR developer = ?)");
            params.add(viewer.getId());
            params.add(viewer.getName());
        }
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM requirements" + where, params.toArray(), Integer.class);
        List<Object> pageParams = new ArrayList<Object>(params);
        pageParams.add(offset);
        pageParams.add(offset + safePageSize);
        List<Map<String, Object>> data = jdbcTemplate.query(
                "SELECT * FROM (SELECT r.*, ROW_NUMBER() OVER (ORDER BY r.createdAt DESC) rn FROM requirements r"
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

    public Map<String, Object> findGanttData(String platform, String status, String developer, CurrentUser viewer) {
        StringBuilder where = new StringBuilder(" WHERE isDraft = 0");
        List<Object> params = new ArrayList<Object>();
        appendVisibility(where, params, viewer);
        if (StringUtils.hasText(platform)) {
            where.append(" AND platform = ?");
            params.add(platform);
        }
        if (StringUtils.hasText(status)) {
            where.append(" AND status = ?");
            params.add(status);
        }
        if (StringUtils.hasText(developer)) {
            where.append(" AND developer = ?");
            params.add(developer);
        }
        List<Map<String, Object>> data = jdbcTemplate.query(
                "SELECT * FROM requirements" + where + " ORDER BY platform, createdAt",
                rowMapper(),
                params.toArray());
        Map<String, Map<String, Object>> platformStats = new LinkedHashMap<String, Map<String, Object>>();
        for (Map<String, Object> item : data) {
            String key = item.get("platform") == null ? "未分类" : String.valueOf(item.get("platform"));
            if (!platformStats.containsKey(key)) {
                Map<String, Object> stat = new LinkedHashMap<String, Object>();
                stat.put("total", 0);
                stat.put("completed", 0);
                platformStats.put(key, stat);
            }
            Map<String, Object> stat = platformStats.get(key);
            stat.put("total", ((Number) stat.get("total")).intValue() + 1);
            if ("已发布".equals(item.get("status"))) {
                stat.put("completed", ((Number) stat.get("completed")).intValue() + 1);
            }
        }
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("data", data);
        result.put("platformStats", platformStats);
        result.put("total", data.size());
        return result;
    }

    public Map<String, Object> buildDashboard(CurrentUser viewer) {
        StringBuilder where = new StringBuilder(" WHERE isDraft = 0");
        List<Object> params = new ArrayList<Object>();
        appendVisibility(where, params, viewer);
        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT * FROM requirements" + where, rowMapper(), params.toArray());
        int released = 0;
        int overdue = 0;
        Map<String, Integer> byPlatform = new LinkedHashMap<String, Integer>();
        long now = System.currentTimeMillis();
        for (Map<String, Object> row : rows) {
            if ("已发布".equals(row.get("status"))) {
                released++;
            }
            Object expected = row.get("expectedDate");
            if (!"已发布".equals(row.get("status")) && expected instanceof java.util.Date && ((java.util.Date) expected).getTime() < now) {
                overdue++;
            }
            String platform = row.get("platform") == null ? "未分类" : String.valueOf(row.get("platform"));
            byPlatform.put(platform, byPlatform.containsKey(platform) ? byPlatform.get(platform) + 1 : 1);
        }
        Map<String, Object> dashboard = new LinkedHashMap<String, Object>();
        Map<String, Object> overview = new LinkedHashMap<String, Object>();
        overview.put("total", rows.size());
        overview.put("released", released);
        overview.put("active", rows.size() - released);
        dashboard.put("overview", overview);
        Map<String, Object> overdueMap = new LinkedHashMap<String, Object>();
        overdueMap.put("count", overdue);
        overdueMap.put("rate", rows.isEmpty() ? 0 : Math.round((overdue * 1000.0 / rows.size())) / 10.0);
        dashboard.put("overdue", overdueMap);
        dashboard.put("approvalCycle", sampleMetric(rows.size()));
        dashboard.put("developmentCycle", sampleMetric(released));
        dashboard.put("throughput", new ArrayList<Object>());
        List<Map<String, Object>> ranking = new ArrayList<Map<String, Object>>();
        for (Map.Entry<String, Integer> entry : byPlatform.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("platform", entry.getKey());
            item.put("count", entry.getValue());
            ranking.add(item);
        }
        dashboard.put("platformRanking", ranking);
        dashboard.put("developerHeatmap", new ArrayList<Object>());
        return dashboard;
    }

    private Map<String, Object> sampleMetric(int sampleCount) {
        Map<String, Object> metric = new LinkedHashMap<String, Object>();
        metric.put("sampleCount", sampleCount);
        metric.put("averageHours", 0);
        metric.put("averageDays", 0);
        return metric;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, CurrentUser actor) {
        String id = UUID.randomUUID().toString();
        String title = requiredString(body, "title");
        String developerName = optionalString(body, "developer");
        String submitterName = StringUtils.hasText(actor.getName()) ? actor.getName() : actor.getUsername();

        jdbcTemplate.update(
                "INSERT INTO requirements (id, title, description, submitter, submitterId, developer, developerIds, "
                        + "platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime, avgMonthlyCalls, "
                        + "senderEmail, ccEmails, priority, score, status, isDraft, steps, noteImages, approvalStatus, approvalComment, publishedAt) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                title,
                optionalString(body, "description"),
                submitterName,
                actor.getId(),
                developerName,
                optionalString(body, "developerIds"),
                optionalString(body, "platform"),
                optionalString(body, "capability"),
                sqlDate(body.get("expectedDate")),
                sqlDate(body.get("actualDate")),
                optionalString(body, "avgDevTime"),
                optionalString(body, "postDevAvgTime"),
                numberOrNull(body.get("avgMonthlyCalls")),
                optionalString(body, "senderEmail"),
                jsonOrDefault(body.get("ccEmails"), "[]"),
                StringUtils.hasText(optionalString(body, "priority")) ? optionalString(body, "priority") : "中",
                numberOrDefault(body.get("score"), 0),
                STATUS_PENDING_APPROVAL,
                truthy(body.get("isDraft")) ? 1 : 0,
                jsonOrDefault(body.get("steps"), "[]"),
                jsonOrDefault(body.get("noteImages"), "[]"),
                "pending",
                optionalString(body, "approvalComment"),
                null);
        return findById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        Map<String, Object> current = findById(id);
        if (current == null) {
            return null;
        }
        jdbcTemplate.update(
                "UPDATE requirements SET title = ?, description = ?, platform = ?, priority = ?, developer = ?, "
                        + "expectedDate = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
                valueOrCurrent(body, "title", current.get("title")),
                valueOrCurrent(body, "description", current.get("description")),
                valueOrCurrent(body, "platform", current.get("platform")),
                valueOrCurrent(body, "priority", current.get("priority")),
                valueOrCurrent(body, "developer", current.get("developer")),
                body.containsKey("expectedDate") ? sqlDate(body.get("expectedDate")) : current.get("expectedDate"),
                id);
        return findById(id);
    }

    @Transactional
    public boolean remove(String id) {
        return jdbcTemplate.update("DELETE FROM requirements WHERE id = ?", id) > 0;
    }

    @Transactional
    public Map<String, Object> approve(String id, boolean approved, String comment) {
        Map<String, Object> current = findById(id);
        if (current == null) {
            return null;
        }
        String approvalStatus = approved ? "approved" : "rejected";
        String nextStatus = approved ? STATUS_PENDING_REVIEW : STATUS_PENDING_APPROVAL;
        jdbcTemplate.update(
                "UPDATE requirements SET approvalStatus = ?, approvalComment = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
                approvalStatus,
                comment,
                nextStatus,
                id);
        return findById(id);
    }

    @Transactional
    public Map<String, Object> updateStatus(String id, String status) {
        Map<String, Object> current = findById(id);
        if (current == null) {
            return null;
        }
        Timestamp publishedAt = "已发布".equals(status) ? new Timestamp(System.currentTimeMillis()) : null;
        if (publishedAt == null) {
            jdbcTemplate.update("UPDATE requirements SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", status, id);
        } else {
            jdbcTemplate.update("UPDATE requirements SET status = ?, publishedAt = COALESCE(publishedAt, ?), updatedAt = CURRENT_TIMESTAMP WHERE id = ?", status, publishedAt, id);
        }
        return findById(id);
    }

    @Transactional
    public Map<String, Object> score(String id, Number score) {
        Map<String, Object> current = findById(id);
        if (current == null) {
            return null;
        }
        jdbcTemplate.update("UPDATE requirements SET score = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", score, id);
        return findById(id);
    }

    public boolean canView(CurrentUser user, Map<String, Object> requirement) {
        if (user == null || requirement == null) {
            return false;
        }
        if (isAdmin(user)) {
            return true;
        }
        return userMatches(user, requirement.get("submitterId"), requirement.get("submitter"))
                || userMatches(user, requirement.get("developerIds"), requirement.get("developer"));
    }

    public boolean canEdit(CurrentUser user, Map<String, Object> requirement) {
        if (isAdmin(user)) {
            return true;
        }
        return requirement != null && userMatches(user, requirement.get("submitterId"), requirement.get("submitter"));
    }

    private void appendVisibility(StringBuilder where, List<Object> params, CurrentUser viewer) {
        if (viewer == null || isAdmin(viewer)) {
            return;
        }
        // 普通用户只能看自己提交或分配给自己的需求。
        // 这里同时匹配结构化 id 和旧数据里的中文姓名，兼容旧 Node 写入方式。
        where.append(" AND (submitterId = ? OR submitter = ? OR developerIds = ? OR developer = ?)");
        params.add(viewer.getId());
        params.add(viewer.getName());
        params.add(viewer.getId());
        params.add(viewer.getName());
    }

    private boolean isAdmin(CurrentUser user) {
        return user != null && ("admin".equals(user.getRole()) || "role-admin".equals(user.getRole()));
    }

    private boolean userMatches(CurrentUser user, Object idValue, Object nameValue) {
        String id = idValue == null ? "" : String.valueOf(idValue);
        String name = nameValue == null ? "" : String.valueOf(nameValue);
        return id.equals(user.getId()) || id.equals(user.getUsername())
                || name.equals(user.getName()) || name.equals(user.getUsername());
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("title", rs.getString("title"));
                row.put("description", rs.getString("description"));
                row.put("submitter", rs.getString("submitter"));
                row.put("submitterId", rs.getString("submitterId"));
                row.put("developer", rs.getString("developer"));
                row.put("developerIds", rs.getString("developerIds"));
                row.put("platform", rs.getString("platform"));
                row.put("capability", rs.getString("capability"));
                row.put("expectedDate", rs.getDate("expectedDate"));
                row.put("actualDate", rs.getDate("actualDate"));
                row.put("avgDevTime", rs.getString("avgDevTime"));
                row.put("postDevAvgTime", rs.getString("postDevAvgTime"));
                row.put("avgMonthlyCalls", rs.getObject("avgMonthlyCalls"));
                row.put("senderEmail", rs.getString("senderEmail"));
                // 旧后端把这些字段作为 JSON 字符串存库，但返回给前端时是数组。
                // Java 迁移后继续在边界层反序列化，避免前端改解析逻辑。
                row.put("ccEmails", parseJsonArray(rs.getString("ccEmails")));
                row.put("priority", rs.getString("priority"));
                row.put("score", rs.getObject("score"));
                row.put("status", rs.getString("status"));
                row.put("isDraft", rs.getObject("isDraft"));
                row.put("steps", parseJsonArray(rs.getString("steps")));
                row.put("noteImages", parseJsonArray(rs.getString("noteImages")));
                row.put("approvalStatus", rs.getString("approvalStatus"));
                row.put("approvalComment", rs.getString("approvalComment"));
                row.put("publishedAt", rs.getTimestamp("publishedAt"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                row.put("updatedAt", rs.getTimestamp("updatedAt"));
                return row;
            }
        };
    }

    private List<Object> parseJsonArray(String value) {
        if (!StringUtils.hasText(value)) {
            return new ArrayList<Object>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<Object>>() {});
        } catch (Exception ex) {
            return new ArrayList<Object>();
        }
    }

    private String requiredString(Map<String, Object> body, String field) {
        String value = optionalString(body, field);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value;
    }

    private String optionalString(Map<String, Object> body, String field) {
        if (body == null || body.get(field) == null) {
            return null;
        }
        String value = String.valueOf(body.get(field)).trim();
        return value.isEmpty() ? null : value;
    }

    private Object valueOrCurrent(Map<String, Object> body, String field, Object current) {
        return body != null && body.containsKey(field) ? body.get(field) : current;
    }

    private Date sqlDate(Object value) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        return Date.valueOf(String.valueOf(value).substring(0, 10));
    }

    private Number numberOrNull(Object value) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        return Double.valueOf(String.valueOf(value));
    }

    private Number numberOrDefault(Object value, Number fallback) {
        Number number = numberOrNull(value);
        return number == null ? fallback : number;
    }

    private boolean truthy(Object value) {
        return Boolean.TRUE.equals(value) || "1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    private String jsonOrDefault(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof String) {
            return StringUtils.hasText((String) value) ? (String) value : fallback;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return fallback;
        }
    }
}

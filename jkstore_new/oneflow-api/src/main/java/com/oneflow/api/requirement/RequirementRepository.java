package com.oneflow.api.requirement;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oneflow.api.auth.CurrentUser;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
    private static final String STATUS_PENDING_DEV = "待开发";
    private static final String STATUS_IN_DEV = "开发中";
    private static final String STATUS_RELEASED = "已发布";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public RequirementRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> findPage(
            int page,
            int pageSize,
            String keyword,
            String status,
            String platform,
            String developer,
            String priority,
            String dateStart,
            String dateEnd,
            Double minScore,
            Double maxScore,
            String isOverdue,
            CurrentUser viewer) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;

        StringBuilder where = new StringBuilder(" WHERE isDraft = 0");
        List<Object> params = new ArrayList<Object>();
        appendVisibility(where, params, viewer);
        if (StringUtils.hasText(status)) {
            where.append(" AND status = ?");
            params.add(status.trim());
        }
        if (StringUtils.hasText(platform)) {
            where.append(" AND platform = ?");
            params.add(platform.trim());
        }
        if (StringUtils.hasText(developer)) {
            where.append(" AND ((',' || REPLACE(COALESCE(developerIds, ''), ' ', '') || ',') LIKE ? "
                    + "OR (',' || REPLACE(COALESCE(developer, ''), ' ', '') || ',') LIKE ?)");
            String pattern = "%," + developer.trim().replaceAll("\\s+", "") + ",%";
            params.add(pattern);
            params.add(pattern);
        }
        if (StringUtils.hasText(keyword)) {
            where.append(" AND (LOWER(title) LIKE ? OR LOWER(submitter) LIKE ? OR LOWER(developer) LIKE ? OR LOWER(status) LIKE ?)");
            String like = "%" + keyword.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (StringUtils.hasText(priority)) {
            where.append(" AND priority = ?");
            params.add(priority.trim());
        }
        if (StringUtils.hasText(dateStart)) {
            where.append(" AND createdAt >= ?");
            params.add(Timestamp.valueOf(dateStart.trim().substring(0, 10) + " 00:00:00"));
        }
        if (StringUtils.hasText(dateEnd)) {
            where.append(" AND createdAt < ?");
            Timestamp endAt = Timestamp.valueOf(dateEnd.trim().substring(0, 10) + " 00:00:00");
            params.add(new Timestamp(endAt.getTime() + 24L * 60 * 60 * 1000));
        }
        if (minScore != null) {
            where.append(" AND score >= ?");
            params.add(minScore);
        }
        if (maxScore != null) {
            where.append(" AND score <= ?");
            params.add(maxScore);
        }
        if ("true".equals(isOverdue)) {
            where.append(" AND expectedDate IS NOT NULL AND expectedDate < CURRENT_DATE AND status <> ?");
            params.add(STATUS_RELEASED);
        } else if ("false".equals(isOverdue)) {
            where.append(" AND (expectedDate IS NULL OR expectedDate >= CURRENT_DATE OR status = ?)");
            params.add(STATUS_RELEASED);
        } else if ("early".equals(isOverdue)) {
            where.append(" AND status = ? AND expectedDate IS NOT NULL AND publishedAt IS NOT NULL AND publishedAt < expectedDate");
            params.add(STATUS_RELEASED);
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
        result.put("statusStats", groupedCount("status", where, params));
        result.put("priorityStats", groupedCount("priority", where, params));
        result.put("scoreStats", scoreStats(where, params));
        result.put("avgScore", avgScore(where, params));
        result.put("filterOptions", filterOptions());
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
            if (STATUS_RELEASED.equals(row.get("status"))) {
                released++;
            }
            Object expected = row.get("expectedDate");
            if (!STATUS_RELEASED.equals(row.get("status")) && expected instanceof java.util.Date && ((java.util.Date) expected).getTime() < now) {
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

        List<Map<String, Object>> auditLogs = dashboardAuditLogs();
        Map<String, List<Map<String, Object>>> logsByRequirement = logsByRequirement(auditLogs);
        dashboard.put("throughput", throughput(rows, logsByRequirement));
        dashboard.put("approvalCycle", approvalCycle(rows, logsByRequirement));
        dashboard.put("developmentCycle", developmentCycle(rows, logsByRequirement));
        dashboard.put("overdue", overdue(rows, overdue));
        dashboard.put("platformRanking", platformRanking(rows));
        dashboard.put("developerHeatmap", developerHeatmap(rows));
        return dashboard;
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
        if (isDeveloper(viewer)) {
            appendDeveloperVisibility(where, params, viewer);
            return;
        }
        appendSubmitterVisibility(where, params, viewer);
    }

    private boolean isAdmin(CurrentUser user) {
        return user != null && ("admin".equals(user.getRole()) || "role-admin".equals(user.getRole()));
    }

    private boolean isDeveloper(CurrentUser user) {
        return user != null && ("developer".equals(user.getRole()) || "role-developer".equals(user.getRole()));
    }

    private void appendDeveloperVisibility(StringBuilder where, List<Object> params, CurrentUser viewer) {
        List<String> idKeys = identityKeys(viewer);
        List<String> nameKeys = nameKeys(viewer);
        List<String> clauses = new ArrayList<String>();
        for (String key : idKeys) {
            clauses.add("submitterId = ?");
            params.add(key);
            clauses.add("(',' || REPLACE(COALESCE(developerIds, ''), ' ', '') || ',') LIKE ?");
            params.add("%," + key.replaceAll("\\s+", "") + ",%");
        }
        for (String key : nameKeys) {
            clauses.add("((submitterId IS NULL OR TRIM(submitterId) IS NULL) AND submitter = ?)");
            params.add(key);
            clauses.add("((developerIds IS NULL OR TRIM(developerIds) IS NULL) AND (',' || REPLACE(COALESCE(developer, ''), ' ', '') || ',') LIKE ?)");
            params.add("%," + key.replaceAll("\\s+", "") + ",%");
        }
        where.append(clauses.isEmpty() ? " AND 1 = 0" : " AND (" + joinOr(clauses) + ")");
    }

    private void appendSubmitterVisibility(StringBuilder where, List<Object> params, CurrentUser viewer) {
        List<String> idKeys = identityKeys(viewer);
        List<String> nameKeys = nameKeys(viewer);
        List<String> clauses = new ArrayList<String>();
        for (String key : idKeys) {
            clauses.add("submitterId = ?");
            params.add(key);
        }
        for (String key : nameKeys) {
            clauses.add("((submitterId IS NULL OR TRIM(submitterId) IS NULL) AND submitter = ?)");
            params.add(key);
        }
        where.append(clauses.isEmpty() ? " AND 1 = 0" : " AND (" + joinOr(clauses) + ")");
    }

    private List<String> identityKeys(CurrentUser user) {
        List<String> keys = new ArrayList<String>();
        addUnique(keys, user == null ? null : user.getId());
        addUnique(keys, user == null ? null : user.getUsername());
        return keys;
    }

    private List<String> nameKeys(CurrentUser user) {
        List<String> keys = new ArrayList<String>();
        addUnique(keys, user == null ? null : user.getName());
        addUnique(keys, user == null ? null : user.getUsername());
        return keys;
    }

    private void addUnique(List<String> values, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        String trimmed = value.trim();
        if (!values.contains(trimmed)) {
            values.add(trimmed);
        }
    }

    private String joinOr(List<String> clauses) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < clauses.size(); index++) {
            if (index > 0) {
                builder.append(" OR ");
            }
            builder.append(clauses.get(index));
        }
        return builder.toString();
    }

    private List<Map<String, Object>> dashboardAuditLogs() {
        try {
            return queryDashboardAuditLogs("\"resource\"");
        } catch (Exception ex) {
            try {
                return queryDashboardAuditLogs("resource");
            } catch (Exception fallbackEx) {
                return new ArrayList<Map<String, Object>>();
            }
        }
    }

    private List<Map<String, Object>> queryDashboardAuditLogs(String resourceColumn) {
        // 旧 Node 版本优先查带引号的 "resource"，不支持时再查普通 resource。
        // 同时用 RowMapper 显式读 CLOB 字符串，避免 queryForList 在达梦/Oracle 类驱动下返回 Lob 对象导致 JSON 解析失败。
        return jdbcTemplate.query(
                "SELECT action, resourceId, details, createdAt FROM audit_logs "
                        + "WHERE " + resourceColumn + " = 'requirement' AND action IN ('approve', 'update_status') "
                        + "ORDER BY createdAt ASC",
                new RowMapper<Map<String, Object>>() {
                    @Override
                    public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                        Map<String, Object> row = new LinkedHashMap<String, Object>();
                        row.put("action", rs.getString("action"));
                        row.put("resourceId", rs.getString("resourceId"));
                        row.put("details", rs.getString("details"));
                        row.put("createdAt", rs.getTimestamp("createdAt"));
                        return row;
                    }
                });
    }

    private Map<String, List<Map<String, Object>>> logsByRequirement(List<Map<String, Object>> auditLogs) {
        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<String, List<Map<String, Object>>>();
        for (Map<String, Object> log : auditLogs) {
            Object resourceId = value(log, "RESOURCEID", "resourceId");
            if (resourceId == null || !StringUtils.hasText(String.valueOf(resourceId))) {
                continue;
            }
            String key = String.valueOf(resourceId);
            if (!result.containsKey(key)) {
                result.put(key, new ArrayList<Map<String, Object>>());
            }
            result.get(key).add(log);
        }
        for (List<Map<String, Object>> logs : result.values()) {
            Collections.sort(logs, new Comparator<Map<String, Object>>() {
                @Override
                public int compare(Map<String, Object> left, Map<String, Object> right) {
                    return Long.compare(time(value(left, "CREATEDAT", "createdAt")), time(value(right, "CREATEDAT", "createdAt")));
                }
            });
        }
        return result;
    }

    private List<Map<String, Object>> throughput(List<Map<String, Object>> requirements, Map<String, List<Map<String, Object>>> logsByRequirement) {
        Map<String, Map<String, Object>> points = new LinkedHashMap<String, Map<String, Object>>();
        for (Map<String, Object> requirement : requirements) {
            String createdMonth = month(requirement.get("createdAt"));
            if (createdMonth != null) {
                Map<String, Object> point = monthPoint(points, createdMonth);
                point.put("createdCount", intValue(point.get("createdCount")) + 1);
            }

            Object releaseAt = releaseDate(requirement, logsByRequirement.get(String.valueOf(requirement.get("id"))));
            String releasedMonth = month(releaseAt);
            if (releasedMonth != null) {
                Map<String, Object> point = monthPoint(points, releasedMonth);
                point.put("releasedCount", intValue(point.get("releasedCount")) + 1);
            }
        }
        return sortedValues(points);
    }

    private Map<String, Object> approvalCycle(List<Map<String, Object>> requirements, Map<String, List<Map<String, Object>>> logsByRequirement) {
        List<Map<String, Object>> samples = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> requirement : requirements) {
            Object createdAt = requirement.get("createdAt");
            Map<String, Object> approvalLog = firstApprovalLog(logsByRequirement.get(String.valueOf(requirement.get("id"))));
            Object approvalAt = approvalLog == null ? null : value(approvalLog, "CREATEDAT", "createdAt");
            if (createdAt != null && approvalAt != null && time(approvalAt) >= time(createdAt)) {
                addSample(samples, approvalAt, (time(approvalAt) - time(createdAt)) / (1000.0 * 60 * 60));
            }
        }
        return metric("averageHours", samples);
    }

    private Map<String, Object> developmentCycle(List<Map<String, Object>> requirements, Map<String, List<Map<String, Object>>> logsByRequirement) {
        List<Map<String, Object>> samples = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> requirement : requirements) {
            List<Map<String, Object>> logs = logsByRequirement.get(String.valueOf(requirement.get("id")));
            Map<String, Object> startLog = firstStatusLog(logs, STATUS_PENDING_DEV, STATUS_IN_DEV);
            Object startAt = startLog == null ? null : value(startLog, "CREATEDAT", "createdAt");
            Object releaseAt = releaseDate(requirement, logs);
            if (startAt != null && releaseAt != null && time(releaseAt) >= time(startAt)) {
                addSample(samples, releaseAt, (time(releaseAt) - time(startAt)) / (1000.0 * 60 * 60 * 24));
            }
        }
        return metric("averageDays", samples);
    }

    private Map<String, Object> overdue(List<Map<String, Object>> rows, int overdueCount) {
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("count", overdueCount);
        result.put("total", rows.size());
        result.put("rate", rows.isEmpty() ? 0 : roundToOne(overdueCount * 100.0 / rows.size()));
        return result;
    }

    private List<Map<String, Object>> platformRanking(List<Map<String, Object>> requirements) {
        Map<String, Map<String, Object>> byPlatform = new LinkedHashMap<String, Map<String, Object>>();
        for (Map<String, Object> requirement : requirements) {
            String platform = requirement.get("platform") == null ? "未分类" : String.valueOf(requirement.get("platform"));
            if (!byPlatform.containsKey(platform)) {
                Map<String, Object> item = new LinkedHashMap<String, Object>();
                item.put("platform", platform);
                item.put("total", 0);
                item.put("released", 0);
                item.put("releaseRate", 0);
                byPlatform.put(platform, item);
            }
            Map<String, Object> item = byPlatform.get(platform);
            item.put("total", intValue(item.get("total")) + 1);
            if (STATUS_RELEASED.equals(requirement.get("status"))) {
                item.put("released", intValue(item.get("released")) + 1);
            }
        }
        List<Map<String, Object>> ranking = new ArrayList<Map<String, Object>>(byPlatform.values());
        for (Map<String, Object> item : ranking) {
            int total = intValue(item.get("total"));
            item.put("releaseRate", total == 0 ? 0 : roundToOne(intValue(item.get("released")) * 100.0 / total));
        }
        Collections.sort(ranking, new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> left, Map<String, Object> right) {
                int totalCompare = Integer.compare(intValue(right.get("total")), intValue(left.get("total")));
                if (totalCompare != 0) return totalCompare;
                int releasedCompare = Integer.compare(intValue(right.get("released")), intValue(left.get("released")));
                if (releasedCompare != 0) return releasedCompare;
                return String.valueOf(left.get("platform")).compareTo(String.valueOf(right.get("platform")));
            }
        });
        return ranking;
    }

    private List<Map<String, Object>> developerHeatmap(List<Map<String, Object>> requirements) {
        List<Map<String, Object>> developers;
        try {
            developers = jdbcTemplate.queryForList(
                    "SELECT u.id, u.name, COALESCE(d.department, '') AS department, "
                            + "COALESCE(d.maxLoad, 5) AS maxLoad, COALESCE(d.currentLoad, 0) AS currentLoad "
                            + "FROM users u LEFT JOIN developers d ON d.userId = u.id "
                            + "WHERE u.role IN ('developer', 'role-developer', 'admin', 'role-admin') AND u.status = 1 "
                            + "ORDER BY u.name ASC");
        } catch (Exception ex) {
            return new ArrayList<Map<String, Object>>();
        }

        Map<String, Integer> liveLoad = developerLiveLoad(requirements);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> developer : developers) {
            String id = String.valueOf(value(developer, "ID", "id"));
            String name = String.valueOf(value(developer, "NAME", "name"));
            int currentLoad = liveLoad.containsKey(id) ? liveLoad.get(id) : liveLoad.containsKey(name) ? liveLoad.get(name) : 0;
            int maxLoad = intValue(value(developer, "MAXLOAD", "maxLoad"));
            double loadPercent = maxLoad == 0 ? 0 : roundToOne(currentLoad * 100.0 / maxLoad);
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("id", id);
            item.put("name", name);
            item.put("department", value(developer, "DEPARTMENT", "department") == null ? "" : value(developer, "DEPARTMENT", "department"));
            item.put("maxLoad", maxLoad);
            item.put("currentLoad", currentLoad);
            item.put("loadPercent", loadPercent);
            item.put("loadLevel", loadPercent >= 80 ? "high" : loadPercent >= 60 ? "medium" : "normal");
            result.add(item);
        }
        Collections.sort(result, new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> left, Map<String, Object> right) {
                return Double.compare(number(right.get("loadPercent")), number(left.get("loadPercent")));
            }
        });
        return result;
    }

    private Map<String, Object> groupedCount(String column, StringBuilder where, List<Object> params) {
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT " + column + " AS statKey, COUNT(*) AS cnt FROM requirements"
                        + where + " GROUP BY " + column,
                params.toArray());
        for (Map<String, Object> row : rows) {
            Object key = value(row, "STATKEY", "statKey");
            if (key == null || !StringUtils.hasText(String.valueOf(key))) {
                continue;
            }
            Object count = value(row, "CNT", "cnt");
            result.put(String.valueOf(key).trim(), count == null ? 0 : ((Number) count).intValue());
        }
        return result;
    }

    private Map<String, Object> scoreStats(StringBuilder where, List<Object> params) {
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("0-60", 0);
        result.put("61-80", 0);
        result.put("81-100", 0);
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT "
                        + "SUM(CASE WHEN score > 0 AND score <= 60 THEN 1 ELSE 0 END) AS bucket0, "
                        + "SUM(CASE WHEN score >= 61 AND score <= 80 THEN 1 ELSE 0 END) AS bucket61, "
                        + "SUM(CASE WHEN score >= 81 AND score <= 100 THEN 1 ELSE 0 END) AS bucket81 "
                        + "FROM requirements" + where,
                params.toArray());
        result.put("0-60", intValue(value(row, "BUCKET0", "bucket0")));
        result.put("61-80", intValue(value(row, "BUCKET61", "bucket61")));
        result.put("81-100", intValue(value(row, "BUCKET81", "bucket81")));
        return result;
    }

    private double avgScore(StringBuilder where, List<Object> params) {
        List<Object> avgParams = new ArrayList<Object>(params);
        Object value = jdbcTemplate.queryForObject(
                "SELECT AVG(score) FROM requirements" + where + " AND score > 0",
                avgParams.toArray(),
                Object.class);
        if (value == null) {
            return 0;
        }
        return ((Number) value).doubleValue();
    }

    private Map<String, Object> filterOptions() {
        List<String> platforms = jdbcTemplate.queryForList(
                "SELECT DISTINCT platform FROM requirements "
                        + "WHERE isDraft = 0 AND platform IS NOT NULL AND TRIM(platform) IS NOT NULL "
                        + "ORDER BY platform ASC",
                String.class);
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("platforms", platforms);
        return result;
    }

    private int intValue(Object value) {
        return value == null ? 0 : ((Number) value).intValue();
    }

    private Object value(Map<String, Object> row, String upper, String lower) {
        Object value = row.get(upper);
        if (value == null) {
            value = row.get(lower);
        }
        return value;
    }

    private Map<String, Object> monthPoint(Map<String, Map<String, Object>> points, String label) {
        if (!points.containsKey(label)) {
            Map<String, Object> point = new LinkedHashMap<String, Object>();
            point.put("label", label);
            point.put("createdCount", 0);
            point.put("releasedCount", 0);
            points.put(label, point);
        }
        return points.get(label);
    }

    private List<Map<String, Object>> sortedValues(Map<String, Map<String, Object>> values) {
        List<Map<String, Object>> list = new ArrayList<Map<String, Object>>(values.values());
        Collections.sort(list, new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> left, Map<String, Object> right) {
                return String.valueOf(left.get("label")).compareTo(String.valueOf(right.get("label")));
            }
        });
        return list;
    }

    private void addSample(List<Map<String, Object>> samples, Object date, double value) {
        Map<String, Object> sample = new LinkedHashMap<String, Object>();
        sample.put("date", date);
        sample.put("value", value);
        samples.add(sample);
    }

    private Map<String, Object> metric(String averageKey, List<Map<String, Object>> samples) {
        double total = 0;
        for (Map<String, Object> sample : samples) {
            total += number(sample.get("value"));
        }
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put(averageKey, samples.isEmpty() ? 0 : roundToOne(total / samples.size()));
        result.put("sampleCount", samples.size());
        result.put("trend", averageByMonth(samples));
        return result;
    }

    private List<Map<String, Object>> averageByMonth(List<Map<String, Object>> samples) {
        Map<String, double[]> grouped = new LinkedHashMap<String, double[]>();
        for (Map<String, Object> sample : samples) {
            String label = month(sample.get("date"));
            if (label == null) {
                continue;
            }
            if (!grouped.containsKey(label)) {
                grouped.put(label, new double[] {0, 0});
            }
            double[] stat = grouped.get(label);
            stat[0] += number(sample.get("value"));
            stat[1] += 1;
        }
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        List<String> labels = new ArrayList<String>(grouped.keySet());
        Collections.sort(labels);
        for (String label : labels) {
            double[] stat = grouped.get(label);
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("label", label);
            item.put("value", stat[1] == 0 ? 0 : roundToOne(stat[0] / stat[1]));
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> firstApprovalLog(List<Map<String, Object>> logs) {
        if (logs == null) {
            return null;
        }
        for (Map<String, Object> log : logs) {
            if ("approve".equals(value(log, "ACTION", "action")) && Boolean.TRUE.equals(auditBody(log).get("approved"))) {
                return log;
            }
        }
        return null;
    }

    private Map<String, Object> firstStatusLog(List<Map<String, Object>> logs, String... statuses) {
        if (logs == null) {
            return null;
        }
        for (Map<String, Object> log : logs) {
            if (!"update_status".equals(value(log, "ACTION", "action"))) {
                continue;
            }
            Object status = auditBody(log).get("status");
            for (String expected : statuses) {
                if (expected.equals(status)) {
                    return log;
                }
            }
        }
        return null;
    }

    private Object releaseDate(Map<String, Object> requirement, List<Map<String, Object>> logs) {
        Map<String, Object> releaseLog = firstStatusLog(logs, STATUS_RELEASED);
        if (releaseLog != null) {
            return value(releaseLog, "CREATEDAT", "createdAt");
        }
        return STATUS_RELEASED.equals(requirement.get("status")) ? requirement.get("updatedAt") : null;
    }

    private Map<String, Object> auditBody(Map<String, Object> log) {
        Object details = value(log, "DETAILS", "details");
        Map<String, Object> parsed = new LinkedHashMap<String, Object>();
        if (details instanceof Map<?, ?>) {
            parsed.putAll((Map<String, Object>) details);
        } else if (details != null && StringUtils.hasText(String.valueOf(details))) {
            try {
                parsed = objectMapper.readValue(String.valueOf(details), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ex) {
                parsed = new LinkedHashMap<String, Object>();
            }
        }
        Object body = parsed.get("body");
        if (body instanceof Map<?, ?>) {
            Map<String, Object> result = new LinkedHashMap<String, Object>();
            result.putAll((Map<String, Object>) body);
            return result;
        }
        return new LinkedHashMap<String, Object>();
    }

    private Map<String, Integer> developerLiveLoad(List<Map<String, Object>> requirements) {
        Map<String, Integer> result = new LinkedHashMap<String, Integer>();
        for (Map<String, Object> requirement : requirements) {
            // dashboard 热力图沿用旧后端口径：只统计未发布需求作为当前负载。
            if (STATUS_RELEASED.equals(requirement.get("status"))) {
                continue;
            }
            List<String> ids = splitCsv(requirement.get("developerIds"));
            List<String> names = splitCsv(requirement.get("developer"));
            int count = Math.max(ids.size(), names.size());
            for (int index = 0; index < count; index++) {
                if (index < ids.size()) {
                    increment(result, ids.get(index));
                }
                if (index < names.size()) {
                    increment(result, names.get(index));
                }
            }
        }
        return result;
    }

    private List<String> splitCsv(Object value) {
        List<String> result = new ArrayList<String>();
        if (value == null) {
            return result;
        }
        String[] parts = String.valueOf(value).split("[,;，；]");
        for (String part : parts) {
            if (StringUtils.hasText(part)) {
                result.add(part.trim());
            }
        }
        return result;
    }

    private void increment(Map<String, Integer> values, String key) {
        if (!StringUtils.hasText(key)) {
            return;
        }
        values.put(key, values.containsKey(key) ? values.get(key) + 1 : 1);
    }

    private String month(Object value) {
        java.util.Date date = date(value);
        if (date == null) {
            return null;
        }
        return new SimpleDateFormat("yyyy-MM").format(date);
    }

    private long time(Object value) {
        java.util.Date date = date(value);
        return date == null ? 0 : date.getTime();
    }

    private java.util.Date date(Object value) {
        if (value instanceof java.util.Date) {
            return (java.util.Date) value;
        }
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        try {
            return Timestamp.valueOf(String.valueOf(value));
        } catch (Exception ex) {
            try {
                return new SimpleDateFormat("yyyy-MM-dd").parse(String.valueOf(value).substring(0, 10));
            } catch (ParseException parseEx) {
                return null;
            }
        }
    }

    private double number(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return 0;
        }
        return Double.valueOf(String.valueOf(value));
    }

    private double roundToOne(double value) {
        return Math.round(value * 10.0) / 10.0;
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

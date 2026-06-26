package com.oneflow.api.notification;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public NotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> findByUserId(String userId, Boolean isRead, String type, int page, int pageSize) {
        int safePage = page <= 0 ? 1 : page;
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        int offset = (safePage - 1) * safePageSize;
        StringBuilder where = new StringBuilder(" WHERE userId = ?");
        List<Object> params = new ArrayList<Object>();
        params.add(userId);
        if (isRead != null) {
            where.append(" AND isRead = ?");
            params.add(isRead ? 1 : 0);
        }
        if (type != null && !type.trim().isEmpty()) {
            where.append(" AND type = ?");
            params.add(type);
        }
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notifications" + where, params.toArray(), Integer.class);
        List<Object> pageParams = new ArrayList<Object>(params);
        pageParams.add(offset);
        pageParams.add(offset + safePageSize);
        List<Map<String, Object>> data = jdbcTemplate.query(
                "SELECT * FROM (SELECT n.*, ROW_NUMBER() OVER (ORDER BY createdAt DESC) rn FROM notifications n"
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

    public int unreadCount(String userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE userId = ? AND isRead = 0",
                Integer.class,
                userId);
        return count == null ? 0 : count;
    }

    public boolean markAsRead(String id, String userId) {
        // 旧 Node markAsRead 只按 id 更新。Java 迁移时补上 userId 约束，防止用户标记他人通知。
        return jdbcTemplate.update(
                "UPDATE notifications SET isRead = 1, readAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?",
                id,
                userId) > 0;
    }

    public int markAllAsRead(String userId) {
        return jdbcTemplate.update(
                "UPDATE notifications SET isRead = 1, readAt = CURRENT_TIMESTAMP WHERE userId = ? AND isRead = 0",
                userId);
    }

    public boolean delete(String id, String userId) {
        return jdbcTemplate.update("DELETE FROM notifications WHERE id = ? AND userId = ?", id, userId) > 0;
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("userId", rs.getString("userId"));
                row.put("userName", rs.getString("userName"));
                row.put("type", rs.getString("type"));
                row.put("title", rs.getString("title"));
                row.put("content", rs.getString("content"));
                row.put("resourceId", rs.getString("resourceId"));
                row.put("resourceType", rs.getString("resourceType"));
                row.put("isRead", rs.getInt("isRead") == 1);
                row.put("readAt", rs.getTimestamp("readAt"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                return row;
            }
        };
    }
}

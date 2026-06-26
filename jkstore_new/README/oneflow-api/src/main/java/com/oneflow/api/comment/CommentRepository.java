package com.oneflow.api.comment;

import com.oneflow.api.auth.CurrentUser;
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
public class CommentRepository {

    private final JdbcTemplate jdbcTemplate;

    public CommentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findByRequirementId(String requirementId) {
        return jdbcTemplate.query(
                "SELECT * FROM requirement_comments WHERE requirementId = ? ORDER BY createdAt ASC",
                rowMapper(),
                requirementId);
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, CurrentUser user) {
        String id = UUID.randomUUID().toString();
        String content = optionalString(body, "content");

        jdbcTemplate.update(
                "INSERT INTO requirement_comments (id, requirementId, userId, userName, userRole, type, content, createdAt) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                id,
                optionalString(body, "requirementId"),
                user.getId(),
                StringUtils.hasText(user.getName()) ? user.getName() : user.getUsername(),
                user.getRole(),
                optionalString(body, "type"),
                content == null ? "" : content);

        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT * FROM requirement_comments WHERE id = ?", rowMapper(), id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private RowMapper<Map<String, Object>> rowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("requirementId", rs.getString("requirementId"));
                row.put("userId", rs.getString("userId"));
                row.put("userName", rs.getString("userName"));
                row.put("userRole", rs.getString("userRole"));
                row.put("type", rs.getString("type"));
                row.put("content", splitLegacyContent(rs.getString("content")));
                // 旧 Node 支持两种评论附件：新的 comment_attachments 表，以及老评论正文里直接粘贴的 URL。
                // 当前先固定返回 attachments 数组，确保前端渲染字段稳定；真实附件表在 attachments 模块迁移时接入。
                row.put("legacyAttachments", new ArrayList<Object>());
                row.put("attachments", new ArrayList<Object>());
                row.put("createdAt", rs.getTimestamp("createdAt"));
                return row;
            }
        };
    }

    private String splitLegacyContent(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        List<String> lines = new ArrayList<String>();
        for (String line : value.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/uploads/")) {
                lines.add(trimmed);
            }
        }
        return String.join("\n", lines).trim();
    }

    private String optionalString(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String value = String.valueOf(body.get(key)).trim();
        return value.isEmpty() ? null : value;
    }
}

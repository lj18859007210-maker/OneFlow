package com.oneflow.api.attachment;

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

@Repository
public class AttachmentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttachmentStorage storage;

    public AttachmentRepository(JdbcTemplate jdbcTemplate, AttachmentStorage storage) {
        this.jdbcTemplate = jdbcTemplate;
        this.storage = storage;
    }

    public List<Map<String, Object>> listByRequirement(String requirementId, CurrentUser user) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT * FROM requirement_attachments WHERE requirementId = ? AND status = 'active' ORDER BY createdAt DESC",
                attachmentRowMapper(),
                requirementId);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> row : rows) {
            result.add(enrich(row, user));
        }
        return result;
    }

    public Map<String, Object> getRequirementAttachment(String id, CurrentUser user) {
        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT * FROM requirement_attachments WHERE id = ?", attachmentRowMapper(), id);
        return rows.isEmpty() ? null : enrich(rows.get(0), user);
    }

    public Map<String, Object> getCommentAttachment(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT * FROM comment_attachments WHERE id = ?", commentAttachmentRowMapper(), id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> getVersion(String id) {
        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT * FROM requirement_attachment_versions WHERE id = ?", versionRowMapper(), id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public String requirementIdByVersion(String versionId) {
        List<String> rows = jdbcTemplate.queryForList(
                "SELECT a.requirementId FROM requirement_attachment_versions v JOIN requirement_attachments a ON a.id = v.attachmentId WHERE v.id = ?",
                String.class,
                versionId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    public Map<String, Object> createFormal(String requirementId, String category, String remark, String createdBy, AttachmentStorage.StoredFile file, CurrentUser user) {
        ensureCategory(category);
        String attachmentId = UUID.randomUUID().toString();
        String versionId = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO requirement_attachments (id, requirementId, category, originalName, sourceType, currentVersionId, status, createdBy, createdAt, updatedAt) "
                        + "VALUES (?, ?, ?, ?, 'formal', ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                attachmentId,
                requirementId,
                category,
                file.getOriginalName(),
                versionId,
                createdBy);
        jdbcTemplate.update(
                "INSERT INTO requirement_attachment_versions (id, attachmentId, versionNo, storagePath, mimeType, fileSize, remark, createdBy, createdAt) "
                        + "VALUES (?, ?, 1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                versionId,
                attachmentId,
                file.getStoragePath(),
                file.getMimeType(),
                file.getFileSize(),
                remark,
                createdBy);
        return getRequirementAttachment(attachmentId, user);
    }

    @Transactional
    public List<Map<String, Object>> createPendingCommentAttachments(String requirementId, String createdBy, List<AttachmentStorage.StoredFile> files) {
        List<Map<String, Object>> created = new ArrayList<Map<String, Object>>();
        for (AttachmentStorage.StoredFile file : files) {
            String id = UUID.randomUUID().toString();
            jdbcTemplate.update(
                    "INSERT INTO comment_attachments (id, requirementId, commentId, originalName, storagePath, mimeType, fileSize, createdBy, status, createdAt) "
                            + "VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)",
                    id,
                    requirementId,
                    file.getOriginalName(),
                    file.getStoragePath(),
                    file.getMimeType(),
                    file.getFileSize(),
                    createdBy);
            created.add(getCommentAttachment(id));
        }
        return created;
    }

    @Transactional
    public Map<String, Object> addVersion(String attachmentId, String remark, String createdBy, AttachmentStorage.StoredFile file, CurrentUser user) {
        Map<String, Object> attachment = getRequirementAttachment(attachmentId, user);
        if (attachment == null) {
            return null;
        }
        Integer maxVersion = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(versionNo), 0) FROM requirement_attachment_versions WHERE attachmentId = ?",
                Integer.class,
                attachmentId);
        int nextVersion = (maxVersion == null ? 0 : maxVersion) + 1;
        String versionId = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO requirement_attachment_versions (id, attachmentId, versionNo, storagePath, mimeType, fileSize, remark, createdBy, createdAt) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                versionId,
                attachmentId,
                nextVersion,
                file.getStoragePath(),
                file.getMimeType(),
                file.getFileSize(),
                remark,
                createdBy);
        jdbcTemplate.update("UPDATE requirement_attachments SET currentVersionId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", versionId, attachmentId);
        return getRequirementAttachment(attachmentId, user);
    }

    @Transactional
    public Map<String, Object> promoteCommentAttachment(String requirementId, String commentAttachmentId, String category, String createdBy, CurrentUser user) {
        ensureCategory(category);
        Map<String, Object> commentAttachment = getCommentAttachment(commentAttachmentId);
        if (commentAttachment == null) {
            return null;
        }
        List<String> existing = jdbcTemplate.queryForList(
                "SELECT id FROM requirement_attachments WHERE linkedCommentAttachmentId = ? AND status = 'active'",
                String.class,
                commentAttachmentId);
        if (!existing.isEmpty()) {
            return getRequirementAttachment(existing.get(0), user);
        }
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO requirement_attachments (id, requirementId, category, originalName, sourceType, linkedCommentAttachmentId, status, createdBy, createdAt, updatedAt) "
                        + "VALUES (?, ?, ?, ?, 'comment-link', ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                id,
                requirementId,
                category,
                commentAttachment.get("originalName"),
                commentAttachmentId,
                createdBy);
        return getRequirementAttachment(id, user);
    }

    @Transactional
    public boolean deleteRequirementAttachment(String id) {
        return jdbcTemplate.update("UPDATE requirement_attachments SET status = 'deleted', updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'", id) > 0;
    }

    private Map<String, Object> enrich(Map<String, Object> attachment, CurrentUser user) {
        Map<String, Object> currentVersion = null;
        if (attachment.get("currentVersionId") != null) {
            currentVersion = getVersion(String.valueOf(attachment.get("currentVersionId")));
        }
        List<Map<String, Object>> versions = jdbcTemplate.query(
                "SELECT * FROM requirement_attachment_versions WHERE attachmentId = ? ORDER BY versionNo DESC",
                versionRowMapper(),
                attachment.get("id"));
        Map<String, Object> linkedComment = attachment.get("linkedCommentAttachmentId") == null
                ? null
                : getCommentAttachment(String.valueOf(attachment.get("linkedCommentAttachmentId")));
        if (currentVersion == null && linkedComment != null) {
            currentVersion = linkedComment;
        }

        attachment.put("currentVersion", currentVersion);
        attachment.put("versions", versions);
        attachment.put("linkedCommentAttachment", linkedComment);
        attachment.put("summary", summary(attachment, currentVersion));
        attachment.put("actions", actions(user, attachment, currentVersion));
        return attachment;
    }

    private Map<String, Object> summary(Map<String, Object> attachment, Map<String, Object> currentVersion) {
        Map<String, Object> summary = new LinkedHashMap<String, Object>();
        summary.put("id", attachment.get("id"));
        summary.put("category", attachment.get("category"));
        summary.put("sourceType", attachment.get("sourceType"));
        summary.put("originalName", attachment.get("originalName"));
        summary.put("currentVersionId", currentVersion == null ? null : currentVersion.get("id"));
        summary.put("versionNo", currentVersion == null ? null : currentVersion.get("versionNo"));
        summary.put("mimeType", currentVersion == null ? null : currentVersion.get("mimeType"));
        summary.put("fileSize", currentVersion == null ? null : currentVersion.get("fileSize"));
        summary.put("previewable", isPreviewable(currentVersion == null ? null : String.valueOf(currentVersion.get("mimeType"))));
        return summary;
    }

    private Map<String, Object> actions(CurrentUser user, Map<String, Object> attachment, Map<String, Object> currentVersion) {
        List<String> permissions = user == null ? new ArrayList<String>() : user.getPermissions();
        boolean previewable = Boolean.TRUE.equals(summary(attachment, currentVersion).get("previewable"));
        Map<String, Object> actions = new LinkedHashMap<String, Object>();
        // JWT 里不长期塞权限明细，避免权限变更后旧 token 继续带旧授权。
        // 但旧 Node 的附件动作计算对 admin 是直接放行的，所以这里保留 admin 全动作能力。
        actions.put("canView", has(user, permissions, "attachment:view"));
        actions.put("canPreview", has(user, permissions, "attachment:preview") && previewable);
        actions.put("canDownload", has(user, permissions, "attachment:download"));
        actions.put("canDelete", has(user, permissions, "attachment:delete"));
        actions.put("canManageVersions", has(user, permissions, "attachment:version:manage"));
        actions.put("canPromote", has(user, permissions, "attachment:promote") && "comment-link".equals(attachment.get("sourceType")) && attachment.get("currentVersionId") == null);
        return actions;
    }

    private boolean has(CurrentUser user, List<String> permissions, String permission) {
        if (user != null && ("admin".equals(user.getRole()) || "role-admin".equals(user.getRole()))) {
            return true;
        }
        return permissions != null && (permissions.contains(permission) || permissions.contains("*"));
    }

    private boolean isPreviewable(String mimeType) {
        return mimeType != null && (mimeType.startsWith("image/") || "application/pdf".equals(mimeType));
    }

    private void ensureCategory(String category) {
        if (!"requirement".equals(category) && !"design".equals(category) && !"test-report".equals(category) && !"acceptance".equals(category)) {
            throw new IllegalArgumentException("Invalid attachment category: " + category);
        }
    }

    private RowMapper<Map<String, Object>> attachmentRowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("requirementId", rs.getString("requirementId"));
                row.put("category", rs.getString("category"));
                row.put("originalName", rs.getString("originalName"));
                row.put("sourceType", rs.getString("sourceType"));
                row.put("sourceCommentId", rs.getString("sourceCommentId"));
                row.put("linkedCommentAttachmentId", rs.getString("linkedCommentAttachmentId"));
                row.put("currentVersionId", rs.getString("currentVersionId"));
                row.put("status", rs.getString("status"));
                row.put("createdBy", rs.getString("createdBy"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                row.put("updatedAt", rs.getTimestamp("updatedAt"));
                return row;
            }
        };
    }

    private RowMapper<Map<String, Object>> versionRowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("attachmentId", rs.getString("attachmentId"));
                row.put("versionNo", rs.getObject("versionNo"));
                row.put("storagePath", rs.getString("storagePath"));
                row.put("mimeType", rs.getString("mimeType"));
                row.put("fileSize", rs.getObject("fileSize"));
                row.put("remark", rs.getString("remark"));
                row.put("createdBy", rs.getString("createdBy"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                row.put("fileKind", "version");
                row.put("fileId", rs.getString("id"));
                row.put("previewUrl", storage.buildFileRoute("version", rs.getString("id"), "inline"));
                row.put("downloadUrl", storage.buildFileRoute("version", rs.getString("id"), "download"));
                return row;
            }
        };
    }

    private RowMapper<Map<String, Object>> commentAttachmentRowMapper() {
        return new RowMapper<Map<String, Object>>() {
            @Override
            public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getString("id"));
                row.put("requirementId", rs.getString("requirementId"));
                row.put("commentId", rs.getString("commentId"));
                row.put("originalName", rs.getString("originalName"));
                row.put("storagePath", rs.getString("storagePath"));
                row.put("mimeType", rs.getString("mimeType"));
                row.put("fileSize", rs.getObject("fileSize"));
                row.put("createdBy", rs.getString("createdBy"));
                row.put("status", rs.getString("status"));
                row.put("createdAt", rs.getTimestamp("createdAt"));
                row.put("previewUrl", storage.buildFileRoute("comment", rs.getString("id"), "inline"));
                row.put("downloadUrl", storage.buildFileRoute("comment", rs.getString("id"), "download"));
                return row;
            }
        };
    }
}

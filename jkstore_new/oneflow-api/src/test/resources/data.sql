MERGE INTO users (id, username, password, name, email, role, status, createdAt, updatedAt) KEY(id)
VALUES ('u-admin', 'admin', '$2b$10$DVcgFnGEMHfyFgm8HIWMT.INaxeWx8VlLSDjSWIhVmw92C0ScFyga', 'Admin', 'admin@example.com', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO users (id, username, password, name, email, role, status, createdAt, updatedAt) KEY(id)
VALUES ('u-user', 'normal', '$2b$10$DVcgFnGEMHfyFgm8HIWMT.INaxeWx8VlLSDjSWIhVmw92C0ScFyga', 'Normal User', 'normal@example.com', 'user', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-001', 'requirement:view', 'View Requirement', 'requirement', 'View requirements');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-012', 'permission:manage', 'Manage Permission', 'permission', 'Manage permissions');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-015', 'user:role:manage', 'Manage User Role', 'user', 'Manage user roles');

MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-001', 'role-admin', 'perm-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-012', 'role-admin', 'perm-012');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-015', 'role-admin', 'perm-015');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-001', 'role-user', 'perm-001');

MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-002', 'requirement:create', 'Create Requirement', 'requirement', 'Create requirements');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-003', 'requirement:update', 'Update Requirement', 'requirement', 'Update requirements');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-005', 'requirement:approve', 'Approve Requirement', 'requirement', 'Approve requirements');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-006', 'requirement:score', 'Score Requirement', 'requirement', 'Score requirements');

MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-002', 'role-admin', 'perm-002');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-003', 'role-admin', 'perm-003');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-005', 'role-admin', 'perm-005');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-006', 'role-admin', 'perm-006');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-002', 'role-user', 'perm-002');

MERGE INTO users (id, username, password, name, email, role, status, createdAt, updatedAt) KEY(id)
VALUES ('u-dev', 'dev', '$2b$10$DVcgFnGEMHfyFgm8HIWMT.INaxeWx8VlLSDjSWIhVmw92C0ScFyga', 'Developer', 'dev@example.com', 'developer', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-dev-001', 'role-developer', 'perm-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-dev-003', 'role-developer', 'perm-003');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-dev-006', 'role-developer', 'perm-006');

MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-dev-001', 'developer:view', 'View Developer', 'developer', 'View developer profiles');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-dev-002', 'developer:create', 'Create Developer', 'developer', 'Create developer profiles');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-dev-003', 'developer:update', 'Update Developer', 'developer', 'Update developer profiles');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-dev-004', 'developer:delete', 'Delete Developer', 'developer', 'Delete developer profiles');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-001', 'attachment:view', 'View Attachment', 'attachment', 'View requirement attachments');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-002', 'attachment:upload', 'Upload Attachment', 'attachment', 'Upload requirement attachments');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-003', 'attachment:version:manage', 'Manage Attachment Version', 'attachment', 'Manage attachment versions');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-004', 'attachment:promote', 'Promote Attachment', 'attachment', 'Promote comment attachments');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-005', 'attachment:delete', 'Delete Attachment', 'attachment', 'Delete attachments');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-006', 'attachment:preview', 'Preview Attachment', 'attachment', 'Preview attachment files');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-att-007', 'attachment:download', 'Download Attachment', 'attachment', 'Download attachment files');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-audit-001', 'audit:view', 'View Audit Log', 'audit', 'View audit logs');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-notice-001', 'notification:view', 'View Notification', 'notification', 'View personal notifications');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-workflow-001', 'workflow:manage', 'Manage Workflow', 'workflow', 'Manage workflow configuration');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-platform-001', 'platform:manage', 'Manage Platform', 'platform', 'Manage platform configuration');
MERGE INTO permissions (id, code, name, module, description) KEY(id)
VALUES ('perm-email-001', 'email:settings:manage', 'Manage Email Settings', 'email', 'Manage SMTP settings and email sending');

MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-dev-001', 'role-admin', 'perm-dev-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-dev-002', 'role-admin', 'perm-dev-002');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-dev-003', 'role-admin', 'perm-dev-003');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-dev-004', 'role-admin', 'perm-dev-004');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-001', 'role-admin', 'perm-att-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-002', 'role-admin', 'perm-att-002');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-003', 'role-admin', 'perm-att-003');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-004', 'role-admin', 'perm-att-004');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-005', 'role-admin', 'perm-att-005');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-006', 'role-admin', 'perm-att-006');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-att-007', 'role-admin', 'perm-att-007');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-audit-001', 'role-admin', 'perm-audit-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-notice-001', 'role-admin', 'perm-notice-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-workflow-001', 'role-admin', 'perm-workflow-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-platform-001', 'role-admin', 'perm-platform-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-admin-email-001', 'role-admin', 'perm-email-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-dev-001', 'role-user', 'perm-dev-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-att-001', 'role-user', 'perm-att-001');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-att-002', 'role-user', 'perm-att-002');
MERGE INTO role_permissions (id, roleId, permissionId) KEY(id) VALUES ('rp-user-notice-001', 'role-user', 'perm-notice-001');

MERGE INTO developers (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt) KEY(id)
VALUES ('dev-profile-001', 'u-dev', 'Developer', 'dev@example.com', 'Backend', '["Java","Oracle"]', 5, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO users (id, username, password, name, email, role, status, createdAt, updatedAt) KEY(id)
VALUES ('u-new-dev', 'newdev', '$2b$10$DVcgFnGEMHfyFgm8HIWMT.INaxeWx8VlLSDjSWIhVmw92C0ScFyga', 'New Developer', 'newdev@example.com', 'developer', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) KEY(id) VALUES (
  'req-001', 'Existing Requirement', 'Seed requirement', 'Admin', 'u-admin', 'Developer', 'u-dev',
  'OneFlow', '内部支撑', DATE '2026-07-01', NULL, '10小时', NULL,
  120, 'admin@example.com', '[]', '高', 0, '待审批', 0,
  '[]', '[]', 'pending', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

MERGE INTO requirement_comments (id, requirementId, userId, userName, userRole, type, content, createdAt) KEY(id)
VALUES ('comment-001', 'req-001', 'u-admin', 'Admin', 'admin', 'note', 'Existing comment', CURRENT_TIMESTAMP);

MERGE INTO audit_logs (id, userId, userName, userRole, action, resource, resourceId, details, ipAddress, userAgent, status, createdAt) KEY(id)
VALUES ('audit-001', 'u-admin', 'Admin', 'admin', 'create', 'requirement', 'req-001', '{"body":{"title":"Existing Requirement"}}', '127.0.0.1', 'JUnit', 'success', CURRENT_TIMESTAMP);

MERGE INTO notifications (id, userId, userName, type, title, content, resourceId, resourceType, isRead, readAt, createdAt) KEY(id)
VALUES ('notice-001', 'u-user', 'Normal User', 'comment', 'New Comment', 'A comment was added', 'req-002', 'requirement', 0, NULL, CURRENT_TIMESTAMP);

MERGE INTO notifications (id, userId, userName, type, title, content, resourceId, resourceType, isRead, readAt, createdAt) KEY(id)
VALUES ('notice-admin-001', 'u-admin', 'Admin', 'system', 'Admin Notice', 'Only admin can see this', NULL, 'system', 0, NULL, CURRENT_TIMESTAMP);

MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-platforms-001', 'requirement.platforms', '[{"name":"Default Group","children":["Portal","CRM"]}]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-interval', 'email.send_interval_minutes', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-host', 'email.smtp_host', 'smtp.seed.example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-port', 'email.smtp_port', '465', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-secure', 'email.smtp_secure', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-user', 'email.smtp_user', 'seed@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-password', 'email.smtp_password', 'seed-secret', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-from-email', 'email.from_email', 'notice@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) KEY(settingKey)
VALUES ('setting-email-from-name', 'email.from_name', 'OneFlow', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt) KEY(id)
VALUES ('wf-status-001', 'requirement', 'pending', 'Pending', 10, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt) KEY(id)
VALUES ('wf-status-002', 'requirement', 'released', 'Released', 20, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
MERGE INTO workflow_transitions (id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome, createdAt, updatedAt) KEY(id)
VALUES ('wf-transition-001', 'requirement', 'pending', 'released', '["admin"]', 0, 1, 1, 'none', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) KEY(id) VALUES (
  'req-002', 'Released Requirement', 'Released seed', 'Normal User', 'u-user', 'Developer', 'u-dev',
  'Portal', '集团迎检', DATE '2026-06-01', DATE '2026-06-02', '12小时', '6小时',
  360, 'normal@example.com', '[]', '中', 88, '已发布', 0,
  '[]', '[]', 'approved', 'ok', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

MERGE INTO requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) KEY(id) VALUES (
  'req-draft-001', 'Draft Requirement', 'Draft seed', 'Normal User', 'u-user', NULL, NULL,
  'OneFlow', '内部支撑', DATE '2026-09-01', NULL, NULL, NULL,
  20, 'normal@example.com', '[]', '低', 0, '待审批', 1,
  '[]', '[]', 'pending', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

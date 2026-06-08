-- OneFlow DM8 schema.
-- Execute with any user that can create objects in schema ONEFLOW.
-- This file creates objects explicitly under schema ONEFLOW.

CREATE TABLE ONEFLOW.users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  role VARCHAR(20) DEFAULT 'user',
  status INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ONEFLOW.idx_users_username ON ONEFLOW.users(username);
CREATE INDEX ONEFLOW.idx_users_status ON ONEFLOW.users(status);
CREATE INDEX ONEFLOW.idx_users_createdAt ON ONEFLOW.users(createdAt);
CREATE INDEX ONEFLOW.idx_users_role_createdAt ON ONEFLOW.users(role, createdAt);

CREATE OR REPLACE TRIGGER ONEFLOW.trg_users_update
BEFORE UPDATE ON ONEFLOW.users
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE TABLE ONEFLOW.requirements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description CLOB,
  submitter VARCHAR(100),
  submitterId VARCHAR(36),
  developer VARCHAR(100),
  developerIds VARCHAR(500),
  platform VARCHAR(100),
  capability VARCHAR(50),
  expectedDate DATE,
  actualDate DATE,
  avgDevTime VARCHAR(50),
  postDevAvgTime VARCHAR(50),
  avgMonthlyCalls DECIMAL(18, 2),
  senderEmail VARCHAR(200),
  ccEmails CLOB,
  priority VARCHAR(20),
  score DECIMAL(18, 2) DEFAULT 0,
  status VARCHAR(50),
  isDraft INT DEFAULT 0,
  steps CLOB,
  noteImages CLOB,
  approvalStatus VARCHAR(20) DEFAULT 'pending',
  approvalComment CLOB,
  publishedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_requirements_submitter ON ONEFLOW.requirements(submitter);
CREATE INDEX ONEFLOW.idx_requirements_isDraft ON ONEFLOW.requirements(isDraft);
CREATE INDEX ONEFLOW.idx_requirements_status ON ONEFLOW.requirements(status);
CREATE INDEX ONEFLOW.idx_requirements_createdAt ON ONEFLOW.requirements(createdAt);

CREATE OR REPLACE TRIGGER ONEFLOW.trg_requirements_update
BEFORE UPDATE ON ONEFLOW.requirements
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE TABLE ONEFLOW.developers (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  department VARCHAR(100),
  skills CLOB,
  maxLoad INT DEFAULT 5,
  currentLoad INT DEFAULT 0,
  status INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ONEFLOW.idx_developers_userId ON ONEFLOW.developers(userId);
CREATE INDEX ONEFLOW.idx_developers_name ON ONEFLOW.developers(name);
CREATE INDEX ONEFLOW.idx_developers_department ON ONEFLOW.developers(department);
CREATE INDEX ONEFLOW.idx_developers_status ON ONEFLOW.developers(status);

CREATE OR REPLACE TRIGGER ONEFLOW.trg_developers_update
BEFORE UPDATE ON ONEFLOW.developers
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE TABLE ONEFLOW.permissions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  description VARCHAR(200),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ONEFLOW.idx_permissions_code ON ONEFLOW.permissions(code);
CREATE INDEX ONEFLOW.idx_permissions_module ON ONEFLOW.permissions(module);

CREATE TABLE ONEFLOW.role_permissions (
  id VARCHAR(36) PRIMARY KEY,
  roleId VARCHAR(36) NOT NULL,
  permissionId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_role_permissions_roleId ON ONEFLOW.role_permissions(roleId);
CREATE INDEX ONEFLOW.idx_role_permissions_permissionId ON ONEFLOW.role_permissions(permissionId);
CREATE UNIQUE INDEX ONEFLOW.idx_role_permissions_unique
  ON ONEFLOW.role_permissions(roleId, permissionId);

CREATE TABLE ONEFLOW.workflow_statuses (
  id VARCHAR(36) PRIMARY KEY,
  flowKey VARCHAR(64) NOT NULL,
  statusCode VARCHAR(64) NOT NULL,
  statusName VARCHAR(64) NOT NULL,
  sortOrder INT DEFAULT 0,
  isTerminal INT DEFAULT 0,
  enabled INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_workflow_statuses_flow_key ON ONEFLOW.workflow_statuses(flowKey);
CREATE UNIQUE INDEX ONEFLOW.idx_workflow_statuses_flow_code
  ON ONEFLOW.workflow_statuses(flowKey, statusCode);

CREATE TABLE ONEFLOW.workflow_transitions (
  id VARCHAR(36) PRIMARY KEY,
  flowKey VARCHAR(64) NOT NULL,
  fromStatus VARCHAR(64) NOT NULL,
  toStatus VARCHAR(64) NOT NULL,
  allowedRoles CLOB,
  requireApproval INT DEFAULT 0,
  notifyEnabled INT DEFAULT 1,
  enabled INT DEFAULT 1,
  approvalOutcome VARCHAR(20) DEFAULT 'none',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_workflow_transitions_flow_key
  ON ONEFLOW.workflow_transitions(flowKey);
CREATE INDEX ONEFLOW.idx_workflow_transitions_from_status
  ON ONEFLOW.workflow_transitions(flowKey, fromStatus);

CREATE TABLE ONEFLOW.notifications (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  userName VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content CLOB,
  resourceId VARCHAR(36),
  resourceType VARCHAR(50),
  isRead INT DEFAULT 0,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_notifications_userId ON ONEFLOW.notifications(userId);
CREATE INDEX ONEFLOW.idx_notifications_isRead ON ONEFLOW.notifications(isRead);
CREATE INDEX ONEFLOW.idx_notifications_type ON ONEFLOW.notifications(type);
CREATE INDEX ONEFLOW.idx_notifications_createdAt ON ONEFLOW.notifications(createdAt);

CREATE TABLE ONEFLOW.audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  userName VARCHAR(100),
  userRole VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  "resource" VARCHAR(100),
  resourceId VARCHAR(36),
  details CLOB,
  ipAddress VARCHAR(45),
  userAgent VARCHAR(500),
  status VARCHAR(20) DEFAULT 'success',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_audit_logs_userId ON ONEFLOW.audit_logs(userId);
CREATE INDEX ONEFLOW.idx_audit_logs_action ON ONEFLOW.audit_logs(action);
CREATE INDEX ONEFLOW.idx_audit_logs_resource ON ONEFLOW.audit_logs("resource");
CREATE INDEX ONEFLOW.idx_audit_logs_createdAt ON ONEFLOW.audit_logs(createdAt);
CREATE INDEX ONEFLOW.idx_audit_logs_status ON ONEFLOW.audit_logs(status);

CREATE TABLE ONEFLOW.system_settings (
  id VARCHAR(36) PRIMARY KEY,
  settingKey VARCHAR(100) NOT NULL,
  settingValue VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ONEFLOW.idx_system_settings_key ON ONEFLOW.system_settings(settingKey);

CREATE OR REPLACE TRIGGER ONEFLOW.trg_system_settings_update
BEFORE UPDATE ON ONEFLOW.system_settings
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE TABLE ONEFLOW.requirement_comments (
  id VARCHAR(36) PRIMARY KEY,
  requirementId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  userName VARCHAR(100) NOT NULL,
  userRole VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content CLOB NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_requirement FOREIGN KEY (requirementId)
    REFERENCES ONEFLOW.requirements(id)
);

CREATE INDEX ONEFLOW.idx_comments_requirementId ON ONEFLOW.requirement_comments(requirementId);
CREATE INDEX ONEFLOW.idx_comments_createdAt ON ONEFLOW.requirement_comments(createdAt);

CREATE TABLE ONEFLOW.requirement_attachments (
  id VARCHAR(36) PRIMARY KEY,
  requirementId VARCHAR(36) NOT NULL,
  category VARCHAR(50) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  sourceType VARCHAR(32) DEFAULT 'formal',
  sourceCommentId VARCHAR(36),
  linkedCommentAttachmentId VARCHAR(36),
  currentVersionId VARCHAR(36),
  status VARCHAR(20) DEFAULT 'active',
  createdBy VARCHAR(36),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_requirement_attachments_requirement_id
  ON ONEFLOW.requirement_attachments(requirementId);
CREATE INDEX ONEFLOW.idx_requirement_attachments_status
  ON ONEFLOW.requirement_attachments(status);

CREATE OR REPLACE TRIGGER ONEFLOW.trg_requirement_attachments_update
BEFORE UPDATE ON ONEFLOW.requirement_attachments
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE TABLE ONEFLOW.requirement_attachment_versions (
  id VARCHAR(36) PRIMARY KEY,
  attachmentId VARCHAR(36) NOT NULL,
  versionNo INT NOT NULL,
  storagePath VARCHAR(500) NOT NULL,
  mimeType VARCHAR(200),
  fileSize BIGINT DEFAULT 0,
  remark CLOB,
  createdBy VARCHAR(36),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_requirement_attachment_versions_attachment_id
  ON ONEFLOW.requirement_attachment_versions(attachmentId);
CREATE UNIQUE INDEX ONEFLOW.idx_requirement_attachment_versions_no
  ON ONEFLOW.requirement_attachment_versions(attachmentId, versionNo);

CREATE TABLE ONEFLOW.comment_attachments (
  id VARCHAR(36) PRIMARY KEY,
  requirementId VARCHAR(36),
  commentId VARCHAR(36),
  originalName VARCHAR(255) NOT NULL,
  storagePath VARCHAR(500) NOT NULL,
  mimeType VARCHAR(200),
  fileSize BIGINT DEFAULT 0,
  createdBy VARCHAR(36),
  status VARCHAR(20) DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ONEFLOW.idx_comment_attachments_comment_id
  ON ONEFLOW.comment_attachments(commentId);
CREATE INDEX ONEFLOW.idx_comment_attachments_requirement_id
  ON ONEFLOW.comment_attachments(requirementId);

COMMIT;

-- ============================================
-- OneFlow 新增模块建表脚本
-- 请在 Oracle 数据库客户端中一次性执行
-- ============================================

-- 1. 通知表
CREATE TABLE notifications (
  id VARCHAR2(36) PRIMARY KEY,
  userId VARCHAR2(36) NOT NULL,
  userName NVARCHAR2(100),
  type NVARCHAR2(50) NOT NULL,
  title NVARCHAR2(200) NOT NULL,
  content NCLOB,
  resourceId VARCHAR2(36),
  resourceType NVARCHAR2(50),
  isRead NUMBER DEFAULT 0,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_notifications_isRead ON notifications(isRead);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt);

-- 2. 审计日志表
CREATE TABLE audit_logs (
  id VARCHAR2(36) PRIMARY KEY,
  userId VARCHAR2(36),
  userName NVARCHAR2(100),
  userRole NVARCHAR2(20),
  action NVARCHAR2(100) NOT NULL,
  "resource" NVARCHAR2(100),
  resourceId VARCHAR2(36),
  details NCLOB,
  ipAddress VARCHAR2(45),
  userAgent NVARCHAR2(500),
  status NVARCHAR2(20) DEFAULT 'success',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);

-- 3. 开发人员表
CREATE TABLE developers (
  id VARCHAR2(36) PRIMARY KEY,
  name NVARCHAR2(100) NOT NULL,
  email NVARCHAR2(200),
  department NVARCHAR2(100),
  skills NCLOB,
  maxLoad NUMBER DEFAULT 5,
  currentLoad NUMBER DEFAULT 0,
  status NUMBER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_developers_name ON developers(name);
CREATE INDEX idx_developers_department ON developers(department);
CREATE INDEX idx_developers_status ON developers(status);

CREATE OR REPLACE TRIGGER trg_developers_update
BEFORE UPDATE ON developers
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-001', '张伟', 'zhangwei@cmcc.cn', '前端开发部', '["Vue","React","TypeScript"]', 5, 0, 1);
INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-002', '李强', 'liqiang@cmcc.cn', '后端开发部', '["Node.js","Java","Oracle"]', 5, 0, 1);
INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-003', '王磊', 'wanglei@cmcc.cn', '全栈开发部', '["Vue","Node.js","Python"]', 5, 0, 1);
INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-004', '陈勇', 'chenyong@cmcc.cn', '平台架构部', '["Java","Microservices","Docker"]', 5, 0, 1);
INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-005', '刘洋', 'liuyang@cmcc.cn', '质量测试部', '["Selenium","Jest","Cypress"]', 5, 0, 1);

-- 4. 权限表
CREATE TABLE permissions (
  id VARCHAR2(36) PRIMARY KEY,
  code NVARCHAR2(100) NOT NULL UNIQUE,
  name NVARCHAR2(100) NOT NULL,
  module NVARCHAR2(50),
  description NVARCHAR2(200),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_permissions_module ON permissions(module);

-- 5. 角色权限关联表
CREATE TABLE role_permissions (
  id VARCHAR2(36) PRIMARY KEY,
  roleId VARCHAR2(36) NOT NULL,
  permissionId VARCHAR2(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_role_permissions_roleId ON role_permissions(roleId);
CREATE INDEX idx_role_permissions_permissionId ON role_permissions(permissionId);

-- 插入默认权限
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-001', 'requirement:view', '查看需求', 'requirement', '查看需求列表和详情');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-002', 'requirement:create', '创建需求', 'requirement', '创建新需求');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-003', 'requirement:edit', '编辑需求', 'requirement', '编辑已有需求');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-004', 'requirement:delete', '删除需求', 'requirement', '删除需求');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-005', 'requirement:approve', '审批需求', 'requirement', '审批需求');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-006', 'requirement:score', '评分需求', 'requirement', '对需求进行评分');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-007', 'user:manage', '用户管理', 'user', '管理用户和角色');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-008', 'developer:manage', '开发人员管理', 'developer', '管理开发人员');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-009', 'audit:view', '查看审计日志', 'audit', '查看系统审计日志');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-010', 'system:config', '系统配置', 'system', '修改系统配置');

-- 为 admin 角色分配所有权限
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-001', 'role-admin', 'perm-001');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-002', 'role-admin', 'perm-002');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-003', 'role-admin', 'perm-003');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-004', 'role-admin', 'perm-004');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-005', 'role-admin', 'perm-005');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-006', 'role-admin', 'perm-006');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-007', 'role-admin', 'perm-007');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-008', 'role-admin', 'perm-008');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-009', 'role-admin', 'perm-009');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-010', 'role-admin', 'perm-010');

-- 为 user 角色分配基础权限
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-011', 'role-user', 'perm-001');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-012', 'role-user', 'perm-002');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-013', 'role-user', 'perm-003');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-014', 'role-user', 'perm-006');

COMMIT;

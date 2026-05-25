CREATE TABLE permissions (
  id VARCHAR2(36) PRIMARY KEY,
  code NVARCHAR2(100) NOT NULL UNIQUE,
  name NVARCHAR2(100) NOT NULL,
  module NVARCHAR2(50),
  description NVARCHAR2(200),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id VARCHAR2(36) PRIMARY KEY,
  roleId VARCHAR2(36) NOT NULL,
  permissionId VARCHAR2(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_role_permissions_roleId ON role_permissions(roleId);
CREATE INDEX idx_role_permissions_permissionId ON role_permissions(permissionId);
CREATE INDEX idx_permissions_module ON permissions(module);

INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-001', 'requirement:view', '查看需求', 'requirement', '查看需求列表、我的需求和需求详情');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-002', 'requirement:create', '创建需求', 'requirement', '提交新需求和保存需求草稿');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-003', 'requirement:update', '更新需求', 'requirement', '编辑需求、草稿和需求状态');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-004', 'requirement:delete', '删除需求', 'requirement', '删除需求和草稿');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-005', 'requirement:approve', '审批需求', 'requirement', '进入审批中心并审批需求');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-006', 'requirement:score', '评分需求', 'requirement', '对需求进行评分');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-007', 'developer:view', '查看开发人员', 'developer', '查看开发人员列表和负载统计');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-008', 'developer:create', '创建开发档案', 'developer', '为开发人员账号创建扩展档案');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-009', 'developer:update', '更新开发档案', 'developer', '更新开发人员部门、技能和负载信息');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-010', 'developer:delete', '移出开发人员', 'developer', '将账号从开发人员中移出');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-011', 'audit:view', '查看审计日志', 'audit', '查看系统审计日志');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-012', 'permission:manage', '权限管理', 'permission', '查看和分配角色权限');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-013', 'project:timeline:view', '查看项目进度', 'project', '查看项目进度甘特图');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-014', 'notification:view', '查看通知', 'notification', '查看、已读和删除个人通知');
INSERT INTO permissions (id, code, name, module, description) VALUES ('perm-015', 'user:role:manage', '用户角色管理', 'user', '查看用户列表并调整用户角色');

INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-0', 'role-admin', 'perm-001');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-1', 'role-admin', 'perm-002');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-2', 'role-admin', 'perm-003');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-3', 'role-admin', 'perm-004');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-4', 'role-admin', 'perm-005');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-5', 'role-admin', 'perm-006');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-6', 'role-admin', 'perm-007');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-7', 'role-admin', 'perm-008');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-8', 'role-admin', 'perm-009');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-9', 'role-admin', 'perm-010');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-10', 'role-admin', 'perm-011');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-11', 'role-admin', 'perm-012');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-12', 'role-admin', 'perm-013');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-13', 'role-admin', 'perm-014');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-admin-14', 'role-admin', 'perm-015');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-user-0', 'role-user', 'perm-001');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-user-1', 'role-user', 'perm-002');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-user-2', 'role-user', 'perm-014');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-0', 'role-developer', 'perm-001');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-1', 'role-developer', 'perm-003');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-2', 'role-developer', 'perm-006');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-3', 'role-developer', 'perm-013');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-4', 'role-developer', 'perm-007');
INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-seed-developer-5', 'role-developer', 'perm-014');

COMMIT;

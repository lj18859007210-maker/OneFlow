-- 创建权限表
CREATE TABLE permissions (
  id VARCHAR2(36) PRIMARY KEY,
  code NVARCHAR2(100) NOT NULL UNIQUE,
  name NVARCHAR2(100) NOT NULL,
  module NVARCHAR2(50),
  description NVARCHAR2(200),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建角色权限关联表
CREATE TABLE role_permissions (
  id VARCHAR2(36) PRIMARY KEY,
  roleId VARCHAR2(36) NOT NULL,
  permissionId VARCHAR2(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_role_permissions_roleId ON role_permissions(roleId);
CREATE INDEX idx_role_permissions_permissionId ON role_permissions(permissionId);
CREATE INDEX idx_permissions_module ON permissions(module);

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

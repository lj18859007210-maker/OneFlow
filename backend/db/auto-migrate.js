const db = require('./oracle');
const { PERMISSIONS, ROLE_DEFAULT_PERMISSION_CODES, buildPermissionInsertSql } = require('../utils/permissionCatalog');
const { FLOW_KEY_REQUIREMENT, DEFAULT_STATUSES, DEFAULT_TRANSITIONS } = require('../utils/workflowDefaults');

const TABLES = {
  notifications: `
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
    )`,
  audit_logs: `
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
    )`,
  developers: `
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
    )`,
  permissions: `
    CREATE TABLE permissions (
      id VARCHAR2(36) PRIMARY KEY,
      code NVARCHAR2(100) NOT NULL UNIQUE,
      name NVARCHAR2(100) NOT NULL,
      module NVARCHAR2(50),
      description NVARCHAR2(200),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  role_permissions: `
    CREATE TABLE role_permissions (
      id VARCHAR2(36) PRIMARY KEY,
      roleId VARCHAR2(36) NOT NULL,
      permissionId VARCHAR2(36) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  workflow_statuses: `
    CREATE TABLE workflow_statuses (
      id VARCHAR2(36) PRIMARY KEY,
      flowKey NVARCHAR2(64) NOT NULL,
      statusCode NVARCHAR2(64) NOT NULL,
      statusName NVARCHAR2(64) NOT NULL,
      sortOrder NUMBER DEFAULT 0,
      isTerminal NUMBER DEFAULT 0,
      enabled NUMBER DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  workflow_transitions: `
    CREATE TABLE workflow_transitions (
      id VARCHAR2(36) PRIMARY KEY,
      flowKey NVARCHAR2(64) NOT NULL,
      fromStatus NVARCHAR2(64) NOT NULL,
      toStatus NVARCHAR2(64) NOT NULL,
      allowedRoles NCLOB,
      requireApproval NUMBER DEFAULT 0,
      notifyEnabled NUMBER DEFAULT 1,
      enabled NUMBER DEFAULT 1,
      approvalOutcome NVARCHAR2(20) DEFAULT 'none',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  requirement_attachments: `
    CREATE TABLE requirement_attachments (
      id VARCHAR2(36) PRIMARY KEY,
      requirementId VARCHAR2(36) NOT NULL,
      category NVARCHAR2(50) NOT NULL,
      originalName NVARCHAR2(255) NOT NULL,
      sourceType NVARCHAR2(32) DEFAULT 'formal',
      sourceCommentId VARCHAR2(36),
      linkedCommentAttachmentId VARCHAR2(36),
      currentVersionId VARCHAR2(36),
      status NVARCHAR2(20) DEFAULT 'active',
      createdBy VARCHAR2(36),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  requirement_attachment_versions: `
    CREATE TABLE requirement_attachment_versions (
      id VARCHAR2(36) PRIMARY KEY,
      attachmentId VARCHAR2(36) NOT NULL,
      versionNo NUMBER NOT NULL,
      storagePath NVARCHAR2(500) NOT NULL,
      mimeType NVARCHAR2(200),
      fileSize NUMBER DEFAULT 0,
      remark NCLOB,
      createdBy VARCHAR2(36),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  comment_attachments: `
    CREATE TABLE comment_attachments (
      id VARCHAR2(36) PRIMARY KEY,
      requirementId VARCHAR2(36),
      commentId VARCHAR2(36),
      originalName NVARCHAR2(255) NOT NULL,
      storagePath NVARCHAR2(500) NOT NULL,
      mimeType NVARCHAR2(200),
      fileSize NUMBER DEFAULT 0,
      createdBy VARCHAR2(36),
      status NVARCHAR2(20) DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
};

const INDEXES = [
  'CREATE INDEX idx_notifications_userId ON notifications(userId)',
  'CREATE INDEX idx_notifications_isRead ON notifications(isRead)',
  'CREATE INDEX idx_notifications_type ON notifications(type)',
  'CREATE INDEX idx_notifications_createdAt ON notifications(createdAt)',
  'CREATE INDEX idx_audit_logs_userId ON audit_logs(userId)',
  'CREATE INDEX idx_audit_logs_action ON audit_logs(action)',
  'CREATE INDEX idx_audit_logs_resource ON audit_logs("resource")',
  'CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt)',
  'CREATE INDEX idx_developers_name ON developers(name)',
  'CREATE INDEX idx_developers_department ON developers(department)',
  'CREATE INDEX idx_developers_status ON developers(status)',
  'CREATE INDEX idx_permissions_module ON permissions(module)',
  'CREATE INDEX idx_role_permissions_roleId ON role_permissions(roleId)',
  'CREATE INDEX idx_role_permissions_permissionId ON role_permissions(permissionId)',
  'CREATE INDEX idx_workflow_statuses_flow_key ON workflow_statuses(flowKey)',
  'CREATE UNIQUE INDEX idx_workflow_statuses_flow_code ON workflow_statuses(flowKey, statusCode)',
  'CREATE INDEX idx_workflow_transitions_flow_key ON workflow_transitions(flowKey)',
  'CREATE INDEX idx_workflow_transitions_from_status ON workflow_transitions(flowKey, fromStatus)',
  'CREATE INDEX idx_requirement_attachments_requirement_id ON requirement_attachments(requirementId)',
  'CREATE INDEX idx_requirement_attachments_status ON requirement_attachments(status)',
  'CREATE INDEX idx_requirement_attachment_versions_attachment_id ON requirement_attachment_versions(attachmentId)',
  'CREATE UNIQUE INDEX idx_requirement_attachment_versions_no ON requirement_attachment_versions(attachmentId, versionNo)',
  'CREATE INDEX idx_comment_attachments_comment_id ON comment_attachments(commentId)',
  'CREATE INDEX idx_comment_attachments_requirement_id ON comment_attachments(requirementId)'
];

const SEED_DATA = [
  // developers
  `INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status) VALUES ('dev-001', '张伟', 'zhangwei@cmcc.cn', '前端开发部', '["Vue","React","TypeScript"]', 5, 0, 1)`,
  `INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status) VALUES ('dev-002', '李强', 'liqiang@cmcc.cn', '后端开发部', '["Node.js","Java","Oracle"]', 5, 0, 1)`,
  `INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status) VALUES ('dev-003', '王磊', 'wanglei@cmcc.cn', '全栈开发部', '["Vue","Node.js","Python"]', 5, 0, 1)`,
  `INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status) VALUES ('dev-004', '陈勇', 'chenyong@cmcc.cn', '平台架构部', '["Java","Microservices","Docker"]', 5, 0, 1)`,
  `INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status) VALUES ('dev-005', '刘洋', 'liuyang@cmcc.cn', '质量测试部', '["Selenium","Jest","Cypress"]', 5, 0, 1)`,
  // permissions
  ...PERMISSIONS.map(buildPermissionInsertSql),
  // role_permissions admin
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-001', 'role-admin', 'perm-001')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-002', 'role-admin', 'perm-002')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-003', 'role-admin', 'perm-003')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-004', 'role-admin', 'perm-004')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-005', 'role-admin', 'perm-005')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-006', 'role-admin', 'perm-006')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-007', 'role-admin', 'perm-007')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-008', 'role-admin', 'perm-008')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-009', 'role-admin', 'perm-009')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-010', 'role-admin', 'perm-010')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-019', 'role-admin', 'perm-011')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-020', 'role-admin', 'perm-012')`,
  // role_permissions user
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-011', 'role-user', 'perm-001')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-012', 'role-user', 'perm-002')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-013', 'role-user', 'perm-003')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-014', 'role-user', 'perm-006')`,
  // role_permissions developer
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-015', 'role-developer', 'perm-001')`,
  `INSERT INTO role_permissions (id, roleId, permissionId) VALUES ('rp-016', 'role-developer', 'perm-007')`
];

async function upsertPermission(connection, permission) {
  const exists = await connection.execute(
    'SELECT COUNT(*) AS CNT FROM permissions WHERE id = :id',
    { id: permission.id }
  );
  const count = exists.rows[0][0];

  if (count > 0) {
    await connection.execute(
      `UPDATE permissions
       SET code = :code,
           name = :name,
           module = :module,
           description = :description
       WHERE id = :id`,
      permission
    );
    return;
  }

  try {
    await connection.execute(buildPermissionInsertSql(permission));
  } catch (error) {
    if (!error.message.includes('ORA-00001')) {
      throw error;
    }
  }
}

async function syncPermissions(connection) {
  for (const permission of PERMISSIONS) {
    await upsertPermission(connection, permission);
  }

  const permissionIds = PERMISSIONS.map(permission => permission.id);
  const bindNames = permissionIds.map((_, index) => `:id${index}`);
  const binds = Object.fromEntries(permissionIds.map((id, index) => [`id${index}`, id]));

  await connection.execute(
    `DELETE FROM role_permissions WHERE permissionId NOT IN (${bindNames.join(', ')})`,
    binds
  );
  await connection.execute(
    `DELETE FROM permissions WHERE id NOT IN (${bindNames.join(', ')})`,
    binds
  );
}

async function ensureAdminPermissions(connection) {
  for (const permission of PERMISSIONS) {
    const existing = await connection.execute(
      `SELECT COUNT(*) FROM role_permissions
       WHERE roleId = 'role-admin' AND permissionId = :permissionId`,
      { permissionId: permission.id }
    );
    if (existing.rows[0][0] > 0) {
      continue;
    }
    await connection.execute(
      `INSERT INTO role_permissions (id, roleId, permissionId)
       VALUES (:id, 'role-admin', :permissionId)`,
      { id: `rp-admin-${permission.id}`, permissionId: permission.id }
    );
  }
}

async function ensureRoleDefaultPermissions(connection, roleName) {
  const permissionIds = roleDefaultPermissionIds(roleName);
  const roleId = `role-${roleName}`;

  for (const permissionId of permissionIds) {
    const existing = await connection.execute(
      `SELECT COUNT(*) FROM role_permissions
       WHERE roleId = :roleId AND permissionId = :permissionId`,
      { roleId, permissionId }
    );
    if (existing.rows[0][0] > 0) {
      continue;
    }

    await connection.execute(
      `INSERT INTO role_permissions (id, roleId, permissionId)
       VALUES (:id, :roleId, :permissionId)`,
      { id: `rp-${roleName}-${permissionId}`, roleId, permissionId }
    );
  }
}

async function ensureWorkflowSeed(connection) {
  const statusCountResult = await connection.execute(
    `SELECT COUNT(*) FROM workflow_statuses WHERE flowKey = :flowKey`,
    { flowKey: FLOW_KEY_REQUIREMENT }
  );
  const statusCount = Number(statusCountResult.rows[0][0]);

  if (statusCount === 0) {
    for (const status of DEFAULT_STATUSES) {
      await connection.execute(
        `INSERT INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt)
         VALUES (SYS_GUID(), :flowKey, :statusCode, :statusName, :sortOrder, :isTerminal, :enabled, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          flowKey: FLOW_KEY_REQUIREMENT,
          statusCode: status.statusCode,
          statusName: status.statusName,
          sortOrder: status.sortOrder,
          isTerminal: status.isTerminal,
          enabled: status.enabled
        }
      );
    }
  }

  const transitionCountResult = await connection.execute(
    `SELECT COUNT(*) FROM workflow_transitions WHERE flowKey = :flowKey`,
    { flowKey: FLOW_KEY_REQUIREMENT }
  );
  const transitionCount = Number(transitionCountResult.rows[0][0]);

  if (transitionCount === 0) {
    for (const transition of DEFAULT_TRANSITIONS) {
      await connection.execute(
        `INSERT INTO workflow_transitions (id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome, createdAt, updatedAt)
         VALUES (SYS_GUID(), :flowKey, :fromStatus, :toStatus, :allowedRoles, :requireApproval, :notifyEnabled, :enabled, :approvalOutcome, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          flowKey: FLOW_KEY_REQUIREMENT,
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          allowedRoles: JSON.stringify(transition.allowedRoles),
          requireApproval: transition.requireApproval,
          notifyEnabled: transition.notifyEnabled,
          enabled: transition.enabled,
          approvalOutcome: transition.approvalOutcome
        }
      );
    }
  }
}

async function ensureDeveloperUserMapping(connection) {
  try {
    await connection.execute('SELECT userId FROM developers WHERE 1 = 0');
  } catch (error) {
    if (!error.message.includes('ORA-00904')) throw error;
    await connection.execute('ALTER TABLE developers ADD (userId VARCHAR2(36))');
  }

  try {
    await connection.execute('CREATE UNIQUE INDEX idx_developers_userId ON developers(userId)');
  } catch (error) {
    if (!error.message.includes('ORA-00955')) throw error;
  }

  await connection.execute(`
    UPDATE developers d
    SET userId = (
      SELECT u.id FROM users u
      WHERE u.role = 'developer'
        AND (
          (d.email IS NOT NULL AND u.email = d.email)
          OR (d.name IS NOT NULL AND u.name = d.name)
        )
        AND ROWNUM = 1
    )
    WHERE d.userId IS NULL
  `);

  await connection.execute(`
    MERGE INTO developers d
    USING (
      SELECT u.id AS userId, u.name, u.email
      FROM users u
      WHERE u.role = 'developer'
    ) src
    ON (d.userId = src.userId)
    WHEN NOT MATCHED THEN INSERT
      (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
      VALUES
      (SYS_GUID(), src.userId, src.name, src.email, NULL, NULL, 5, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
}

function roleDefaultPermissionIds(roleName) {
  const codes = ROLE_DEFAULT_PERMISSION_CODES[roleName] || [];
  return codes
    .map(code => PERMISSIONS.find(permission => permission.code === code))
    .filter(Boolean)
    .map(permission => permission.id);
}

async function initialize() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('\n[DB Migration] 检查表结构...');

    // 检查并创建表
    for (const [tableName, createSql] of Object.entries(TABLES)) {
      try {
        await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`  ✓ ${tableName} 已存在`);
      } catch (e) {
        if (e.message.includes('ORA-00942')) {
          await connection.execute(createSql);
          console.log(`  ✓ ${tableName} 创建成功`);
        } else {
          throw e;
        }
      }
    }

    // 创建索引
    for (const idxSql of INDEXES) {
      try {
        await connection.execute(idxSql);
      } catch (e) {
        if (!e.message.includes('ORA-00955') && !e.message.includes('ORA-00942')) {
          console.warn(`  ⚠ 索引创建警告: ${e.message.substring(0, 50)}`);
        }
      }
    }

    // 插入种子数据
    for (const seed of SEED_DATA) {
      try {
        await connection.execute(seed);
      } catch (e) {
        if (!e.message.includes('ORA-00001')) {
          console.warn(`  ⚠ 数据插入警告: ${e.message.substring(0, 50)}`);
        }
      }
    }

    // 同步权限目录，确保旧库里的权限码也会被升级到当前规范
    await syncPermissions(connection);
    await ensureAdminPermissions(connection);
    await ensureRoleDefaultPermissions(connection, 'user');
    await ensureRoleDefaultPermissions(connection, 'developer');
    await ensureDeveloperUserMapping(connection);
    await ensureWorkflowSeed(connection);

    await connection.commit();
    console.log('[DB Migration] 完成\n');
  } catch (error) {
    console.error('[DB Migration] 失败:', error.message);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { initialize };

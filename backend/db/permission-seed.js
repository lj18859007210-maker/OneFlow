const { v4: uuidv4 } = require('uuid');
const { PERMISSIONS, ROLE_DEFAULT_PERMISSION_CODES } = require('../utils/permissionCatalog');

function isUniqueConstraintError(error) {
  const message = String(error?.message || error || '');
  return message.includes('ORA-00001') || message.includes('-6602') || message.includes('唯一性约束');
}

async function upsertPermission(connection, permission) {
  const existing = await connection.execute(
    'SELECT COUNT(*) FROM permissions WHERE id = :id OR code = :code',
    { id: permission.id, code: permission.code }
  );

  if (Number(existing.rows[0][0]) > 0) {
    await connection.execute(
      `UPDATE permissions
       SET id = :id,
           code = :code,
           name = :name,
           module = :module,
           description = :description
       WHERE id = :id OR code = :code`,
      permission
    );
    return;
  }

  try {
    await connection.execute(
      `INSERT INTO permissions (id, code, name, module, description)
       VALUES (:id, :code, :name, :module, :description)`,
      permission
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
}

function roleDefaultPermissionIds(roleName) {
  const codes = ROLE_DEFAULT_PERMISSION_CODES[roleName] || [];
  return codes
    .map(code => PERMISSIONS.find(permission => permission.code === code))
    .filter(Boolean)
    .map(permission => permission.id);
}

async function ensureRolePermissions(connection, roleName) {
  const roleId = `role-${roleName}`;
  for (const permissionId of roleDefaultPermissionIds(roleName)) {
    const existing = await connection.execute(
      `SELECT COUNT(*) FROM role_permissions
       WHERE roleId = :roleId AND permissionId = :permissionId`,
      { roleId, permissionId }
    );

    if (Number(existing.rows[0][0]) > 0) continue;

    try {
      await connection.execute(
        `INSERT INTO role_permissions (id, roleId, permissionId)
         VALUES (:id, :roleId, :permissionId)`,
        { id: uuidv4(), roleId, permissionId }
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
}

async function seedPermissions(connection) {
  for (const permission of PERMISSIONS) {
    await upsertPermission(connection, permission);
  }

  await ensureRolePermissions(connection, 'admin');
  await ensureRolePermissions(connection, 'user');
  await ensureRolePermissions(connection, 'developer');
  await connection.commit();
}

module.exports = {
  seedPermissions
};

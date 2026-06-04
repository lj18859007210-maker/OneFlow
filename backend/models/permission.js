const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');
const { normalizeRoleId } = require('../utils/roleAccess');

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

async function getAll() {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT * FROM permissions ORDER BY module, code`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows.map(row => ({
      id: row.ID,
      code: row.CODE,
      name: row.NAME,
      module: row.MODULE,
      description: row.DESCRIPTION,
      createdAt: row.CREATEDAT
    }));
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) {
      console.warn('permissions table does not exist yet, returning an empty list.');
      return [];
    }
    throw e;
  } finally {
    if (connection) await connection.close();
  }
}

async function getByRoleId(roleId) {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (!normalizedRoleId) {
    return [];
  }

  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT DISTINCT p.id, p.code, p.name, p.module, p.description FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permissionId
       WHERE rp.roleId = :roleId
       ORDER BY p.module, p.code`,
      { roleId: normalizedRoleId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows.map(row => ({
      id: row.ID,
      code: row.CODE,
      name: row.NAME,
      module: row.MODULE,
      description: row.DESCRIPTION
    }));
  } finally {
    if (connection) await connection.close();
  }
}

async function checkPermission(roleId, permissionCode) {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (!normalizedRoleId) {
    return false;
  }

  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) as cnt FROM role_permissions rp
       INNER JOIN permissions p ON rp.permissionId = p.id
       WHERE rp.roleId = :roleId AND p.code = :permissionCode`,
      { roleId: normalizedRoleId, permissionCode }
    );
    return result.rows[0][0] > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function assignPermissions(roleId, permissionIds) {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (!normalizedRoleId) {
    throw new Error(`Invalid role: ${roleId}`);
  }

  let connection;
  try {
    connection = await db.getConnection();

    // Remove existing permissions first.
    await connection.execute(
      `DELETE FROM role_permissions WHERE roleId = :roleId`,
      { roleId: normalizedRoleId }
    );

    // Insert the new permissions.
    const uniquePermissionIds = uniqueValues(permissionIds || []);
    if (uniquePermissionIds.length > 0) {
      for (const permId of uniquePermissionIds) {
        await connection.execute(
          `INSERT INTO role_permissions (id, roleId, permissionId) VALUES (:id, :roleId, :permissionId)`,
          { id: uuidv4(), roleId: normalizedRoleId, permissionId: permId }
        );
      }
    }

    await connection.commit();
    return true;
  } finally {
    if (connection) await connection.close();
  }
}

async function getModules() {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT DISTINCT module FROM permissions WHERE module IS NOT NULL ORDER BY module`
    );
    return result.rows.map(row => row[0]);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getAll,
  getByRoleId,
  checkPermission,
  assignPermissions,
  getModules,
  normalizeRoleId,
  uniqueValues
};

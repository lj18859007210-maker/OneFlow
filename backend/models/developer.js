const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');

async function readLobContent(lob) {
  if (!lob) return null;
  if (typeof lob === 'string') return lob;
  return new Promise((resolve, reject) => {
    let data = '';
    lob.on('data', (chunk) => { data += chunk; });
    lob.on('end', () => resolve(data));
    lob.on('error', reject);
  });
}

function isLegacySchemaError(error) {
  const msg = String(error?.message || '');
  return msg.includes('ORA-00904') || msg.includes('ORA-00942');
}

function toView(row, skills) {
  return {
    id: row.USERID,
    userId: row.USERID,
    profileId: row.PROFILEID || null,
    name: row.NAME,
    username: row.USERNAME,
    email: row.EMAIL,
    department: row.DEPARTMENT || '',
    skills: skills || [],
    maxLoad: row.MAXLOAD ?? 5,
    currentLoad: row.CURRENTLOAD ?? 0,
    status: row.STATUS,
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

async function parseRows(rows) {
  const result = [];
  for (const row of rows) {
    const skillsJson = await readLobContent(row.SKILLS);
    result.push(toView(row, skillsJson ? JSON.parse(skillsJson) : []));
  }
  return result;
}

function buildFilters(filters = {}, useAlias = true) {
  let whereClause = `WHERE (u.role = 'developer' OR u.role = 'role-developer')`;
  const params = {};
  const deptCol = useAlias ? 'NVL(d.department, \'\')' : 'NVL(d.department, \'\')';
  const statusCol = 'u.status';

  if (filters.department) {
    whereClause += ` AND ${deptCol} = :department`;
    params.department = filters.department;
  }
  if (filters.status !== undefined && filters.status !== null) {
    whereClause += ` AND ${statusCol} = :status`;
    params.status = filters.status;
  }
  return { whereClause, params };
}

async function queryAll(connection, filters = {}) {
  const { whereClause, params } = buildFilters(filters);
  try {
    const result = await connection.execute(
      `SELECT
         u.id AS userId,
         u.username,
         u.name,
         u.email,
         u.status,
         u.createdAt,
         u.updatedAt,
         d.id AS profileId,
         d.department,
         d.skills,
         NVL(d.maxLoad, 5) AS maxLoad,
         NVL(d.currentLoad, 0) AS currentLoad
       FROM users u
       LEFT JOIN developers d ON d.userId = u.id
       ${whereClause}
       ORDER BY u.name ASC`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return parseRows(result.rows || []);
  } catch (error) {
    if (!isLegacySchemaError(error)) throw error;
    const legacyResult = await connection.execute(
      `SELECT
         u.id AS userId,
         u.username,
         u.name,
         u.email,
         u.status,
         u.createdAt,
         u.updatedAt,
         d.id AS profileId,
         d.department,
         d.skills,
         NVL(d.maxLoad, 5) AS maxLoad,
         NVL(d.currentLoad, 0) AS currentLoad
       FROM users u
       LEFT JOIN developers d ON (d.email = u.email OR d.name = u.name)
       ${whereClause}
       ORDER BY u.name ASC`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return parseRows(legacyResult.rows || []);
  }
}

async function getAll(filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    return await queryAll(connection, filters);
  } finally {
    if (connection) await connection.close();
  }
}

async function getById(userId) {
  const rows = await getAll({});
  return rows.find((row) => row.userId === userId) || null;
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    if (!data.email) throw new Error('创建开发人员需要提供邮箱');

    const userResult = await connection.execute(
      `SELECT id, name, email, status FROM users WHERE email = :email AND (role = 'developer' OR role = 'role-developer')`,
      { email: data.email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = userResult.rows?.[0];
    if (!user) throw new Error('未找到开发人员角色账号，请先在用户角色管理中设置');

    try {
      await connection.execute(
        `INSERT INTO developers
         (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
         VALUES
         (:id, :userId, :name, :email, :department, :skills, :maxLoad, 0, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          id: uuidv4(),
          userId: user.ID,
          name: user.NAME,
          email: user.EMAIL,
          department: data.department || null,
          skills: data.skills ? JSON.stringify(data.skills) : null,
          maxLoad: data.maxLoad || 5,
          status: data.status !== undefined ? data.status : user.STATUS
        }
      );
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      await connection.execute(
        `INSERT INTO developers
         (id, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
         VALUES
         (:id, :name, :email, :department, :skills, :maxLoad, 0, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          id: uuidv4(),
          name: user.NAME,
          email: user.EMAIL,
          department: data.department || null,
          skills: data.skills ? JSON.stringify(data.skills) : null,
          maxLoad: data.maxLoad || 5,
          status: data.status !== undefined ? data.status : user.STATUS
        }
      );
    }

    await connection.commit();
    return await getById(user.ID);
  } finally {
    if (connection) await connection.close();
  }
}

async function update(userId, data) {
  let connection;
  try {
    connection = await db.getConnection();
    const userResult = await connection.execute(
      `SELECT id, name, email, status FROM users WHERE id = :id AND (role = 'developer' OR role = 'role-developer')`,
      { id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = userResult.rows?.[0];
    if (!user) return null;

    await connection.execute(
      `UPDATE users SET
         name = NVL(:name, name),
         email = NVL(:email, email),
         status = NVL(:status, status),
         updatedAt = CURRENT_TIMESTAMP
       WHERE id = :id`,
      {
        id: userId,
        name: data.name || null,
        email: data.email || null,
        status: data.status !== undefined ? data.status : null
      }
    );

    try {
      await connection.execute(
        `MERGE INTO developers d
         USING (SELECT :userId AS userId FROM dual) src
         ON (d.userId = src.userId)
         WHEN MATCHED THEN UPDATE SET
           d.department = NVL(:department, d.department),
           d.skills = NVL(:skills, d.skills),
           d.maxLoad = NVL(:maxLoad, d.maxLoad),
           d.status = NVL(:profileStatus, d.status),
           d.name = NVL(:name, d.name),
           d.email = NVL(:email, d.email),
           d.updatedAt = CURRENT_TIMESTAMP
         WHEN NOT MATCHED THEN INSERT
           (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
           VALUES
           (:id, :userId, :name, :email, :department, :skills, :maxLoad, 0, :profileStatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          id: uuidv4(),
          userId,
          name: data.name || null,
          email: data.email || null,
          department: data.department || null,
          skills: data.skills ? JSON.stringify(data.skills) : null,
          maxLoad: data.maxLoad !== undefined ? data.maxLoad : null,
          profileStatus: data.status !== undefined ? data.status : 1
        }
      );
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      await connection.execute(
        `UPDATE developers
         SET department = NVL(:department, department),
             skills = NVL(:skills, skills),
             maxLoad = NVL(:maxLoad, maxLoad),
             status = NVL(:profileStatus, status),
             name = NVL(:name, name),
             email = NVL(:email, email),
             updatedAt = CURRENT_TIMESTAMP
         WHERE email = :email OR name = :name`,
        {
          name: data.name || user.NAME,
          email: data.email || user.EMAIL,
          department: data.department || null,
          skills: data.skills ? JSON.stringify(data.skills) : null,
          maxLoad: data.maxLoad !== undefined ? data.maxLoad : null,
          profileStatus: data.status !== undefined ? data.status : null
        }
      );
    }

    await connection.commit();
    return await getById(userId);
  } finally {
    if (connection) await connection.close();
  }
}

async function remove(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const userRes = await connection.execute(
      `SELECT email, name FROM users WHERE id = :id`,
      { id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = userRes.rows?.[0];

    try {
      await connection.execute(`DELETE FROM developers WHERE userId = :userId`, { userId });
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      if (user) {
        await connection.execute(
          `DELETE FROM developers WHERE email = :email OR name = :name`,
          { email: user.EMAIL, name: user.NAME }
        );
      }
    }

    const result = await connection.execute(
      `UPDATE users SET role = 'user', updatedAt = CURRENT_TIMESTAMP WHERE id = :id AND (role = 'developer' OR role = 'role-developer')`,
      { id: userId }
    );
    await connection.commit();
    return result.rowsAffected > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateLoad(userId, increment = 1) {
  let connection;
  try {
    connection = await db.getConnection();
    try {
      await connection.execute(
        `UPDATE developers SET currentLoad = NVL(currentLoad, 0) + :increment, updatedAt = CURRENT_TIMESTAMP WHERE userId = :userId`,
        { increment, userId }
      );
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      const userRes = await connection.execute(
        `SELECT email, name FROM users WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const user = userRes.rows?.[0];
      if (user) {
        await connection.execute(
          `UPDATE developers SET currentLoad = NVL(currentLoad, 0) + :increment, updatedAt = CURRENT_TIMESTAMP
           WHERE email = :email OR name = :name`,
          { increment, email: user.EMAIL, name: user.NAME }
        );
      }
    }
    await connection.commit();
    return await getById(userId);
  } finally {
    if (connection) await connection.close();
  }
}

async function getLoadStats() {
  const list = await getAll({ status: 1 });
  return list.map((item) => {
    const percent = item.maxLoad ? Math.round((item.currentLoad / item.maxLoad) * 1000) / 10 : 0;
    return {
      id: item.id,
      name: item.name,
      department: item.department,
      maxLoad: item.maxLoad,
      currentLoad: item.currentLoad,
      loadPercent: percent
    };
  }).sort((a, b) => b.loadPercent - a.loadPercent);
}

async function getDepartments() {
  const list = await getAll({ status: 1 });
  return [...new Set(list.map((item) => item.department).filter(Boolean))].sort();
}

module.exports = { getAll, getById, create, update, remove, updateLoad, getLoadStats, getDepartments };

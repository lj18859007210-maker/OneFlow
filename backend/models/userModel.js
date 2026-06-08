const { driver: oracledb } = require('../db/oracle');
const db = require('../db/oracle');
const bcrypt = require('bcryptjs');
const { ROLE_ID_MAP, normalizeRoleName } = require('../utils/roleAccess');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizePageOptions(options = {}) {
  const page = toPositiveInteger(options.page, DEFAULT_PAGE);
  const requestedPageSize = toPositiveInteger(options.pageSize, DEFAULT_PAGE_SIZE);
  return {
    page,
    pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE)
  };
}

function toSearchKeyword(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

function buildUserListFilters(filters = {}) {
  const clauses = [];
  const params = {};

  const roleName = normalizeRoleName(filters.role);
  if (roleName) {
    params.role0 = roleName;
    params.role1 = ROLE_ID_MAP[roleName];
    clauses.push('role IN (:role0, :role1)');
  }

  const keyword = toSearchKeyword(filters.keyword);
  if (keyword) {
    params.keyword = `%${keyword}%`;
    clauses.push('(LOWER(name) LIKE :keyword OR LOWER(username) LIKE :keyword OR LOWER(email) LIKE :keyword)');
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

module.exports = {
  async login(username, password) {
    const startedAt = Date.now();
    console.log(`[Login] userModel.login getConnection-start username=${username}`);
    const connection = await db.getConnection();
    console.log(`[Login] userModel.login getConnection-done username=${username} elapsed=${Date.now() - startedAt}ms`);
    try {
      console.log(`[Login] userModel.login query-users-start username=${username} elapsed=${Date.now() - startedAt}ms`);
      const result = await connection.execute(
        `SELECT id, username, password, name, email, role FROM users 
         WHERE username = :username AND status = 1`,
        { username },
        { outFormat: oracledb.OBJECT }
      );
      console.log(`[Login] userModel.login query-users-done username=${username} elapsed=${Date.now() - startedAt}ms`);
      const user = result.rows[0];
      if (!user) {
        console.log('[Login] User not found:', username);
        return null;
      }
      
      console.log('[Login] User found, password field:', typeof user.PASSWORD, user.PASSWORD ? user.PASSWORD.substring(0, 10) + '...' : 'null');
      
      const valid = await bcrypt.compare(password, user.PASSWORD);
      if (!valid) {
        console.log('[Login] Password mismatch');
        return null;
      }
      
      return user;
    } finally {
      console.log(`[Login] userModel.login close-start username=${username} elapsed=${Date.now() - startedAt}ms`);
      await connection.close();
      console.log(`[Login] userModel.login close-done username=${username} elapsed=${Date.now() - startedAt}ms`);
    }
  },

  async getAll(options = {}) {
    const { page, pageSize } = normalizePageOptions(options);
    const connection = await db.getConnection();
    try {
      const { whereClause, params } = buildUserListFilters(options);
      const offset = (page - 1) * pageSize;
      const result = await connection.execute(
        `SELECT id, username, name, email, role, status, createdAt, updatedAt
         FROM (
           SELECT sorted_users.*, ROWNUM AS rn
           FROM (
             SELECT id, username, name, email, role, status, createdAt, updatedAt
             FROM users
             ${whereClause}
             ORDER BY createdAt DESC
           ) sorted_users
           WHERE ROWNUM <= :limit
         )
         WHERE rn > :offset`,
        { ...params, offset, limit: offset + pageSize },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const totalResult = await connection.execute(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        params
      );

      return {
        data: result.rows || [],
        total: Number(totalResult.rows?.[0]?.[0]) || 0,
        page,
        pageSize
      };
    } finally {
      connection.close();
    }
  },

  async getById(userId) {
    const connection = await db.getConnection();
    try {
      const result = await connection.execute(
        `SELECT id, username, name, email, role, status, createdAt, updatedAt
         FROM users
         WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows?.[0] || null;
    } finally {
      connection.close();
    }
  },

  async updateRole(userId, role) {
    const normalizedRole = normalizeRoleName(role);
    if (!normalizedRole) {
      throw new Error('Invalid role');
    }

    const connection = await db.getConnection();
    try {
      const existing = await connection.execute(
        `SELECT id FROM users WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!existing.rows || existing.rows.length === 0) {
        return null;
      }

      await connection.execute(
        `UPDATE users SET role = :role WHERE id = :id`,
        { role: normalizedRole, id: userId }
      );

      try {
        if (normalizedRole === 'developer') {
          await connection.execute(
            `MERGE INTO developers d
             USING (SELECT id, name, email FROM users WHERE id = :id) src
             ON (d.userId = src.id)
             WHEN NOT MATCHED THEN
               INSERT (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
               VALUES (:profileId, src.id, src.name, src.email, NULL, NULL, 5, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            { id: userId, profileId: uuidv4() }
          );
        } else {
          await connection.execute(
            `DELETE FROM developers WHERE userId = :id`,
            { id: userId }
          );
        }
      } catch (mappingError) {
        const mappingErrorText = String(mappingError.message || '');
        if (mappingErrorText.includes('ORA-00904')) {
          const userResult = await connection.execute(
            `SELECT name, email FROM users WHERE id = :id`,
            { id: userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const currentUser = userResult.rows?.[0];
          if (normalizedRole === 'developer' && currentUser) {
            await connection.execute(
              `MERGE INTO developers d
               USING (SELECT :email AS email, :name AS name FROM dual) src
               ON (d.email = src.email OR d.name = src.name)
               WHEN NOT MATCHED THEN
                 INSERT (id, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
                 VALUES (:profileId, :name, :email, NULL, NULL, 5, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              { profileId: uuidv4(), name: currentUser.NAME, email: currentUser.EMAIL }
            );
          }
          if (normalizedRole !== 'developer' && currentUser) {
            await connection.execute(
              `DELETE FROM developers WHERE email = :email OR name = :name`,
              { email: currentUser.EMAIL, name: currentUser.NAME }
            );
          }
        } else if (!mappingErrorText.includes('ORA-00942')) {
          throw mappingError;
        }
      }

      await connection.commit();

      const result = await connection.execute(
        `SELECT id, username, name, email, role, status, createdAt, updatedAt
         FROM users
         WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows?.[0] || null;
    } finally {
      connection.close();
    }
  },

  async updateEmail(userId, email) {
    const nextEmail = typeof email === 'string' ? email.trim() : '';
    if (!EMAIL_PATTERN.test(nextEmail)) {
      throw new Error('Invalid email');
    }

    const connection = await db.getConnection();
    try {
      const existing = await connection.execute(
        `SELECT id, name, email FROM users WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const user = existing.rows?.[0];
      if (!user) {
        return null;
      }

      await connection.execute(
        `UPDATE users SET email = :email, updatedAt = CURRENT_TIMESTAMP WHERE id = :id`,
        { id: userId, email: nextEmail }
      );

      try {
        await connection.execute(
          `UPDATE developers
           SET email = :email, updatedAt = CURRENT_TIMESTAMP
           WHERE userId = :id OR email = :previousEmail OR name = :name`,
          {
            id: userId,
            email: nextEmail,
            previousEmail: user.EMAIL,
            name: user.NAME
          }
        );
      } catch (mappingError) {
        const mappingErrorText = String(mappingError.message || '');
        if (!mappingErrorText.includes('ORA-00904') && !mappingErrorText.includes('ORA-00942')) {
          throw mappingError;
        }

        if (mappingErrorText.includes('ORA-00904')) {
          await connection.execute(
            `UPDATE developers
             SET email = :email, updatedAt = CURRENT_TIMESTAMP
             WHERE email = :previousEmail OR name = :name`,
            {
              email: nextEmail,
              previousEmail: user.EMAIL,
              name: user.NAME
            }
          );
        }
      }

      await connection.commit();

      const result = await connection.execute(
        `SELECT id, username, name, email, role, status, createdAt, updatedAt
         FROM users
         WHERE id = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows?.[0] || null;
    } finally {
      connection.close();
    }
  }
};

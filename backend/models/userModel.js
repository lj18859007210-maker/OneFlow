const oracledb = require('oracledb');
const db = require('../db/oracle');
const bcrypt = require('bcryptjs');
const { normalizeRoleName } = require('../utils/roleAccess');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async login(username, password) {
    const connection = await db.getConnection();
    try {
      const result = await connection.execute(
        `SELECT id, username, password, name, email, role FROM users 
         WHERE username = :username AND status = 1`,
        { username },
        { outFormat: oracledb.OBJECT }
      );
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
      connection.close();
    }
  },

  async getAll() {
    const connection = await db.getConnection();
    try {
      const result = await connection.execute(
        `SELECT id, username, name, email, role, status, createdAt, updatedAt
         FROM users
         ORDER BY createdAt DESC`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows || [];
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
  }
};

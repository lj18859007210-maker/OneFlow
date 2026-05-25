const oracledb = require('oracledb');
const db = require('../db/oracle');
const bcrypt = require('bcryptjs');

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
  }
};

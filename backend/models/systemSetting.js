const oracledb = require('oracledb');
const db = require('../db/oracle');

async function getValue(key, defaultValue = null) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT settingValue FROM system_settings WHERE settingKey = :key`,
      { key },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0]?.SETTINGVALUE ?? defaultValue;
  } catch (error) {
    if (error.message && error.message.includes('ORA-00942')) {
      return defaultValue;
    }
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function setValue(key, value) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `MERGE INTO system_settings s
       USING (SELECT :key AS settingKey, :value AS settingValue FROM dual) src
       ON (s.settingKey = src.settingKey)
       WHEN MATCHED THEN UPDATE SET s.settingValue = src.settingValue, s.updatedAt = CURRENT_TIMESTAMP
       WHEN NOT MATCHED THEN INSERT (id, settingKey, settingValue, createdAt, updatedAt)
         VALUES (SYS_GUID(), src.settingKey, src.settingValue, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      { key, value: String(value) }
    );
    await connection.commit();
    return { key, value: String(value) };
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getValue,
  setValue
};

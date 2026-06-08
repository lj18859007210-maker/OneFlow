const { v4: uuidv4 } = require('uuid');
const { driver: oracledb } = require('../db/oracle');
const db = require('../db/oracle');

async function readLobContent(lob) {
  if (!lob) return null;
  if (typeof lob === 'string') return lob;
  return new Promise((resolve, reject) => {
    let data = '';
    lob.on('data', chunk => { data += chunk; });
    lob.on('end', () => resolve(data));
    lob.on('error', reject);
  });
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();
    await connection.execute(`INSERT INTO notifications (id, userId, userName, type, title, content, resourceId, resourceType, isRead, createdAt) VALUES (:id, :userId, :userName, :type, :title, :content, :resourceId, :resourceType, 0, CURRENT_TIMESTAMP)`, { id, userId: data.userId, userName: data.userName || null, type: data.type, title: data.title, content: data.content || null, resourceId: data.resourceId || null, resourceType: data.resourceType || null });
    await connection.commit();
    return { id, ...data, isRead: false, createdAt: new Date() };
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { console.warn('notifications table not found, skipping'); return null; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getByUserId(userId, filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    let whereClause = 'WHERE userId = :userId';
    const params = { userId };
    if (filters.isRead !== undefined) { whereClause += ' AND isRead = :isRead'; params.isRead = filters.isRead ? 1 : 0; }
    if (filters.type) { whereClause += ' AND type = :type'; params.type = filters.type; }
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(`SELECT * FROM (SELECT n.*, ROW_NUMBER() OVER (ORDER BY createdAt DESC) as rn FROM notifications n ${whereClause}) WHERE rn > :offset AND rn <= :limit`, { ...params, offset, limit: offset + pageSize }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const notifications = [];
    for (const row of result.rows) { const content = await readLobContent(row.CONTENT); notifications.push({ id: row.ID, userId: row.USERID, userName: row.USERNAME, type: row.TYPE, title: row.TITLE, content, resourceId: row.RESOURCEID, resourceType: row.RESOURCETYPE, isRead: row.ISREAD === 1, readAt: row.READAT, createdAt: row.CREATEDAT }); }
    const totalResult = await connection.execute(`SELECT COUNT(*) FROM notifications n ${whereClause}`, params);
    return { data: notifications, total: totalResult.rows[0][0], page, pageSize };
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return { data: [], total: 0, page: filters.page || 1, pageSize: filters.pageSize || 20 }; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getUnreadCount(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`SELECT COUNT(*) FROM notifications WHERE userId = :userId AND isRead = 0`, { userId });
    return result.rows[0][0];
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return 0; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function markAsRead(id) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`UPDATE notifications SET isRead = 1, readAt = CURRENT_TIMESTAMP WHERE id = :id`, { id });
    await connection.commit();
    return true;
  } finally { if (connection) await connection.close(); }
}

async function markAllAsRead(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`UPDATE notifications SET isRead = 1, readAt = CURRENT_TIMESTAMP WHERE userId = :userId AND isRead = 0`, { userId });
    await connection.commit();
    return true;
  } finally { if (connection) await connection.close(); }
}

async function remove(id, userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`DELETE FROM notifications WHERE id = :id AND userId = :userId`, { id, userId });
    await connection.commit();
    return result.rowsAffected > 0;
  } finally { if (connection) await connection.close(); }
}

module.exports = { create, getByUserId, getUnreadCount, markAsRead, markAllAsRead, remove };

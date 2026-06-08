const { v4: uuidv4 } = require('uuid');
const { driver: oracledb } = require('../db/oracle');
const db = require('../db/oracle');
const logger = require('../utils/logger');
const { enrichAuditLog, getActionLabel } = require('../utils/auditLogPresenter');

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
    await connection.execute(
      `INSERT INTO audit_logs (id, userId, userName, userRole, action, "resource", resourceId, details, ipAddress, userAgent, status, createdAt) VALUES (:id, :userId, :userName, :userRole, :action, :res, :resourceId, :details, :ipAddress, :userAgent, :status, CURRENT_TIMESTAMP)`,
      { id, userId: data.userId || null, userName: data.userName || 'anonymous', userRole: data.userRole || null, action: data.action, res: data.resource || null, resourceId: data.resourceId || null, details: data.details ? JSON.stringify(data.details) : null, ipAddress: data.ipAddress || null, userAgent: data.userAgent || null, status: data.status || 'success' }
    );
    await connection.commit();
    const enrichedLog = enrichAuditLog(data);
    logger.audit(enrichedLog.summary, { action: data.action, resource: data.resource, userId: data.userId, status: data.status });
    return { id, ...data };
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { console.warn('audit_logs table not found, skipping'); return null; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getList(filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    let whereClause = 'WHERE 1=1';
    const params = {};
    if (filters.userId) { whereClause += ' AND userId = :userId'; params.userId = filters.userId; }
    if (filters.action) { whereClause += ' AND action = :action'; params.action = filters.action; }
    if (filters.resource) { whereClause += ' AND "resource" = :res'; params.res = filters.resource; }
    if (filters.startDate) { whereClause += ' AND createdAt >= :startDate'; params.startDate = new Date(filters.startDate); }
    if (filters.endDate) { whereClause += ' AND createdAt <= :endDate'; params.endDate = new Date(filters.endDate); }
    if (filters.status) { whereClause += ' AND status = :status'; params.status = filters.status; }
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(`SELECT * FROM (SELECT a.*, ROW_NUMBER() OVER (ORDER BY createdAt DESC) as rn FROM audit_logs a ${whereClause}) WHERE rn > :offset AND rn <= :limit`, { ...params, offset, limit: offset + pageSize }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const logs = [];
    for (const row of result.rows) {
      const details = await readLobContent(row.DETAILS);
      logs.push(enrichAuditLog({ id: row.ID, userId: row.USERID, userName: row.USERNAME, userRole: row.USERROLE, action: row.ACTION, resource: row.RESOURCE, resourceId: row.RESOURCEID, details: details ? JSON.parse(details) : null, ipAddress: row.IPADDRESS, userAgent: row.USERAGENT, status: row.STATUS, createdAt: row.CREATEDAT }));
    }
    const totalResult = await connection.execute(`SELECT COUNT(*) FROM audit_logs a ${whereClause}`, params);
    return { data: logs, total: totalResult.rows[0][0], page, pageSize };
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return { data: [], total: 0, page: filters.page || 1, pageSize: filters.pageSize || 20 }; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getActions() {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`SELECT DISTINCT action FROM audit_logs ORDER BY action`);
    return result.rows.map(row => ({ value: row[0], label: getActionLabel(row[0]) }));
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return []; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

module.exports = { create, getList, getActions };

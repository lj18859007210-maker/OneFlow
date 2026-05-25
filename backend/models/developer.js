const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
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

async function parseRow(row) {
  const skillsJson = await readLobContent(row.SKILLS);
  return { id: row.ID, name: row.NAME, email: row.EMAIL, department: row.DEPARTMENT, skills: skillsJson ? JSON.parse(skillsJson) : [], maxLoad: row.MAXLOAD, currentLoad: row.CURRENTLOAD, status: row.STATUS, createdAt: row.CREATEDAT, updatedAt: row.UPDATEDAT };
}

async function getAll(filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    let whereClause = 'WHERE 1=1';
    const params = {};
    if (filters.department) { whereClause += ' AND department = :department'; params.department = filters.department; }
    if (filters.status !== undefined) { whereClause += ' AND status = :status'; params.status = filters.status; }
    const result = await connection.execute(`SELECT * FROM developers ${whereClause} ORDER BY name ASC`, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const developers = [];
    for (const row of result.rows) { developers.push(await parseRow(row)); }
    return developers;
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return []; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getById(id) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`SELECT * FROM developers WHERE id = :id`, [id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return null;
    return await parseRow(result.rows[0]);
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return null; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();
    await connection.execute(`INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt) VALUES (:id, :name, :email, :department, :skills, :maxLoad, 0, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, { id, name: data.name, email: data.email || null, department: data.department || null, skills: data.skills ? JSON.stringify(data.skills) : null, maxLoad: data.maxLoad || 5, status: data.status !== undefined ? data.status : 1 });
    await connection.commit();
    return await getById(id);
  } finally { if (connection) await connection.close(); }
}

async function update(id, data) {
  let connection;
  try {
    connection = await db.getConnection();
    const current = await connection.execute(`SELECT * FROM developers WHERE id = :id`, [id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (current.rows.length === 0) return null;
    const skills = data.skills !== undefined ? JSON.stringify(data.skills) : await readLobContent(current.rows[0].SKILLS);
    await connection.execute(`UPDATE developers SET name = NVL(:name, name), email = NVL(:email, email), department = NVL(:department, department), skills = NVL(:skills, skills), maxLoad = NVL(:maxLoad, maxLoad), status = NVL(:status, status), updatedAt = CURRENT_TIMESTAMP WHERE id = :id`, { id, name: data.name || null, email: data.email || null, department: data.department || null, skills, maxLoad: data.maxLoad !== undefined ? data.maxLoad : null, status: data.status !== undefined ? data.status : null });
    await connection.commit();
    return await getById(id);
  } finally { if (connection) await connection.close(); }
}

async function remove(id) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`DELETE FROM developers WHERE id = :id`, [id]);
    await connection.commit();
    return result.rowsAffected > 0;
  } finally { if (connection) await connection.close(); }
}

async function updateLoad(id, increment = 1) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`UPDATE developers SET currentLoad = currentLoad + :increment, updatedAt = CURRENT_TIMESTAMP WHERE id = :id`, { increment, id });
    await connection.commit();
    return await getById(id);
  } finally { if (connection) await connection.close(); }
}

async function getLoadStats() {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`SELECT id, name, department, maxLoad, currentLoad, ROUND((currentLoad / NULLIF(maxLoad, 0)) * 100, 1) as loadPercent FROM developers WHERE status = 1 ORDER BY loadPercent DESC`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const stats = [];
    for (const row of result.rows) { stats.push({ id: row.ID, name: row.NAME, department: row.DEPARTMENT, maxLoad: row.MAXLOAD, currentLoad: row.CURRENTLOAD, loadPercent: row.LOADPERCENT || 0 }); }
    return stats;
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return []; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

async function getDepartments() {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(`SELECT DISTINCT department FROM developers WHERE status = 1 ORDER BY department`);
    return result.rows.map(row => row[0]);
  } catch (e) {
    if (e.message && e.message.includes('ORA-00942')) { return []; }
    throw e;
  } finally { if (connection) await connection.close(); }
}

module.exports = { getAll, getById, create, update, remove, updateLoad, getLoadStats, getDepartments };

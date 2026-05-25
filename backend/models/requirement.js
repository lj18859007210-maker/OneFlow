const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');

const STATUS = {
  PENDING_APPROVAL: '待审批',
  PENDING_REVIEW: '待评审',
  PENDING_DEV: '待开发',
  IN_DEV: '开发中',
  IN_TEST: '测试中',
  RELEASED: '已发布'
};

const STATUS_ORDER = [
  STATUS.PENDING_APPROVAL,
  STATUS.PENDING_REVIEW,
  STATUS.PENDING_DEV,
  STATUS.IN_DEV,
  STATUS.IN_TEST,
  STATUS.RELEASED
];

const VALID_TRANSITIONS = {
  [STATUS.PENDING_APPROVAL]: [],
  [STATUS.PENDING_REVIEW]: [STATUS.PENDING_DEV],
  [STATUS.PENDING_DEV]: [STATUS.IN_DEV],
  [STATUS.IN_DEV]: [STATUS.IN_TEST],
  [STATUS.IN_TEST]: [STATUS.RELEASED],
  [STATUS.RELEASED]: []
};

function getNextStatuses(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

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
  const [desc, ccJson, stepsJson, noteJson, approvalJson] = await Promise.all([
    readLobContent(row.DESCRIPTION),
    readLobContent(row.CCEMAILS),
    readLobContent(row.STEPS),
    readLobContent(row.NOTEIMAGES),
    readLobContent(row.APPROVALCOMMENT)
  ]);
  
  return {
    id: row.ID,
    title: row.TITLE,
    description: desc,
    submitter: row.SUBMITTER,
    developer: row.DEVELOPER,
    platform: row.PLATFORM,
    capability: row.CAPABILITY,
    expectedDate: row.EXPECTEDDATE,
    actualDate: row.ACTUALDATE,
    avgDevTime: row.AVGDEVTIME,
    avgMonthlyCalls: row.AVGMONTHLYCALLS,
    senderEmail: row.SENDEREMAIL,
    ccEmails: ccJson ? JSON.parse(ccJson) : [],
    priority: row.PRIORITY,
    score: row.SCORE,
    status: row.STATUS,
    isDraft: row.ISDRAFT,
    steps: stepsJson ? JSON.parse(stepsJson) : [],
    noteImages: noteJson ? JSON.parse(noteJson) : [],
    approvalStatus: row.APPROVALSTATUS,
    approvalComment: approvalJson,
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

async function parseRows(rows) {
  return Promise.all(rows.map(parseRow));
}

async function getAll(page = 1, pageSize = 20) {
  let connection;
  try {
    connection = await db.getConnection();
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(
      `SELECT * FROM (
        SELECT r.*, ROW_NUMBER() OVER (ORDER BY CREATEDAT DESC) as rn
        FROM requirements r
        WHERE isDraft = 0
      ) WHERE rn > :offset AND rn <= :limit`,
      { offset, limit: offset + pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseRows(result.rows);
    
    const totalResult = await connection.execute(
      `SELECT COUNT(*) FROM requirements WHERE isDraft = 0`
    );
    const total = totalResult.rows[0][0];

    const statusStatsResult = await connection.execute(
      `SELECT status as req_status, COUNT(*) as cnt FROM requirements WHERE isDraft = 0 GROUP BY status`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusStats = {};
    console.log('=== 数据库状态统计 ===');
    console.log('rows:', JSON.stringify(statusStatsResult.rows));
    statusStatsResult.rows.forEach(row => {
      const keys = Object.keys(row);
      console.log('row keys:', keys, 'row:', row);
      const statusKey = keys.find(k => k.toUpperCase() === 'REQ_STATUS') || keys.find(k => k.toUpperCase() === 'STATUS');
      const countKey = keys.find(k => k.toUpperCase() === 'CNT') || keys.find(k => k.toUpperCase() === 'COUNT');
      const status = statusKey ? String(row[statusKey]).trim() : null;
      const count = countKey ? Number(row[countKey]) : 0;
      console.log('解析 - statusKey:', statusKey, 'status:', status, 'count:', count);
      if (status) {
        statusStats[status] = count;
      }
    });
    console.log('最终 statusStats:', JSON.stringify(statusStats));
    console.log('========================');

    const avgScoreResult = await connection.execute(
      `SELECT AVG(score) as avgScore FROM requirements WHERE isDraft = 0 AND score > 0`
    );
    const avgScore = Number(avgScoreResult.rows[0][0]) || 0;
    
    return { data, total, page, pageSize, statusStats, avgScore };
  } finally {
    if (connection) await connection.close();
  }
}

async function getBySubmitter(submitter, page = 1, pageSize = 20) {
  let connection;
  try {
    connection = await db.getConnection();
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(
      `SELECT * FROM (
        SELECT r.*, ROW_NUMBER() OVER (ORDER BY CREATEDAT DESC) as rn
        FROM requirements r
        WHERE isDraft = 0 AND submitter = :submitter
      ) WHERE rn > :offset AND rn <= :limit`,
      { submitter, offset, limit: offset + pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseRows(result.rows);

    const totalResult = await connection.execute(
      `SELECT COUNT(*) FROM requirements WHERE isDraft = 0 AND submitter = :submitter`,
      { submitter }
    );
    const total = totalResult.rows[0][0];

    return { data, total, page, pageSize };
  } finally {
    if (connection) await connection.close();
  }
}

async function getDrafts(submitter) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
       `SELECT * FROM requirements WHERE isDraft = 1 AND submitter = :submitter ORDER BY UPDATEDAT DESC`,
      [submitter],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return await parseRows(result.rows);
  } finally {
    if (connection) await connection.close();
  }
}

async function getLatestDraft(submitter) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
       `SELECT * FROM (SELECT * FROM requirements WHERE isDraft = 1 AND submitter = :submitter ORDER BY UPDATEDAT DESC) WHERE ROWNUM = 1`,
      [submitter],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return null;
    return await parseRow(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function getById(id) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT * FROM requirements WHERE id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return null;
    return await parseRow(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();
    
    await connection.execute(
      `INSERT INTO requirements (
        id, title, description, submitter, developer, platform, capability,
        expectedDate, actualDate, avgDevTime, avgMonthlyCalls, senderEmail, ccEmails,
        priority, score, status, isDraft, steps, noteImages,
        approvalStatus, approvalComment, CREATEDAT, UPDATEDAT
      ) VALUES (
        :id, :title, :description, :submitter, :developer, :platform,
        :capability, :expectedDate, :actualDate, :avgDevTime, :avgMonthlyCalls, :senderEmail,
        :ccEmails, :priority, :score, :status, :isDraft, :steps, :noteImages,
        :approvalStatus, :approvalComment, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      {
        id,
        title: data.title,
        description: data.description || null,
        submitter: data.submitter,
        developer: data.developer,
        platform: data.platform,
        capability: data.capability,
        expectedDate: data.expectedDate ? (data.expectedDate instanceof Date ? data.expectedDate : new Date(data.expectedDate)) : null,
        actualDate: data.actualDate ? (data.actualDate instanceof Date ? data.actualDate : new Date(data.actualDate)) : null,
        avgDevTime: data.avgDevTime || null,
        avgMonthlyCalls: data.avgMonthlyCalls || null,
        senderEmail: data.senderEmail || null,
        ccEmails: data.ccEmails && data.ccEmails.length ? JSON.stringify(data.ccEmails) : null,
        priority: data.priority || '中',
        score: data.score ?? 0,
        status: data.status || STATUS.PENDING_APPROVAL,
        isDraft: data.isDraft ? 1 : 0,
        steps: data.steps ? JSON.stringify(data.steps) : null,
        noteImages: data.noteImages && data.noteImages.length ? JSON.stringify(data.noteImages) : null,
        approvalStatus: data.approvalStatus || 'pending',
        approvalComment: data.approvalComment || null
      }
    );
    await connection.commit();
    
    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function update(id, data) {
  let connection;
  try {
    connection = await db.getConnection();
    
    // First get current data
    const current = await connection.execute(
      `SELECT * FROM requirements WHERE id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (current.rows.length === 0) return null;
    
    const row = current.rows[0];
    const ccEmails = data.ccEmails !== undefined ? JSON.stringify(data.ccEmails) : await readLobContent(row.CCEMAILS);
    const steps = data.steps !== undefined ? JSON.stringify(data.steps) : await readLobContent(row.STEPS);
    const noteImages = data.noteImages !== undefined ? JSON.stringify(data.noteImages) : await readLobContent(row.NOTEIMAGES);
    
    await connection.execute(
      `UPDATE requirements SET 
        title = NVL(:title, title),
        description = NVL(:description, description),
        submitter = NVL(:submitter, submitter),
        developer = NVL(:developer, developer),
        platform = NVL(:platform, platform),
        capability = NVL(:capability, capability),
        priority = NVL(:priority, priority),
        score = NVL(:score, score),
        status = NVL(:status, status),
        isDraft = NVL(:isDraft, isDraft),
        ccEmails = NVL(:ccEmails, ccEmails),
        steps = NVL(:steps, steps),
        noteImages = NVL(:noteImages, noteImages),
        approvalStatus = NVL(:approvalStatus, approvalStatus),
        approvalComment = NVL(:approvalComment, approvalComment),
        UPDATEDAT = CURRENT_TIMESTAMP
      WHERE id = :id`,
      {
        id,
        title: data.title || null,
        description: data.description || null,
        submitter: data.submitter || null,
        developer: data.developer || null,
        platform: data.platform || null,
        capability: data.capability || null,
        priority: data.priority || null,
        score: data.score ?? null,
        status: data.status || null,
        isDraft: data.isDraft !== undefined ? (data.isDraft ? 1 : 0) : null,
        ccEmails,
        steps,
        noteImages,
        approvalStatus: data.approvalStatus || null,
        approvalComment: data.approvalComment || null
      }
    );
    await connection.commit();
    
    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function remove(id) {
  let connection;
  try {
    connection = await db.getConnection();
    // 先删除关联的评论记录
    await connection.execute(
      `DELETE FROM requirement_comments WHERE requirementId = :id`,
      [id]
    );
    // 再删除需求记录
    const result = await connection.execute(
      `DELETE FROM requirements WHERE id = :id`,
      [id]
    );
    await connection.commit();
    return result.rowsAffected > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateStatus(id, status) {
  const current = await getById(id);
  if (!current) return null;

  const nextStatuses = getNextStatuses(current.status);
  if (!nextStatuses.includes(status)) {
    throw new Error(`非法状态流转: 当前状态为"${current.status}"，仅允许流转到${nextStatuses.length ? nextStatuses.map(s => `"${s}"`).join('、') : '最终状态'}`);
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `UPDATE requirements SET status = :status, UPDATEDAT = CURRENT_TIMESTAMP WHERE id = :id`,
      { status, id }
    );
    await connection.commit();
    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function approve(id, approved, comment, actualDate) {
  const current = await getById(id);
  if (!current) return null;
  if (current.approvalStatus !== 'pending') {
    throw new Error('该需求已审批过，不能重复审批');
  }
  const newStatus = approved ? STATUS.PENDING_REVIEW : STATUS.PENDING_APPROVAL;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `UPDATE requirements SET 
        approvalStatus = :approvalStatus,
        approvalComment = :approvalComment,
        actualDate = NVL(:actualDate, actualDate),
        status = :status,
        UPDATEDAT = CURRENT_TIMESTAMP
      WHERE id = :id`,
      {
        approvalStatus: approved ? 'approved' : 'rejected',
        approvalComment: comment,
        actualDate: actualDate ? new Date(actualDate) : null,
        status: newStatus,
        id
      }
    );
    await connection.commit();
    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function score(id, score) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `UPDATE requirements SET score = :score, UPDATEDAT = CURRENT_TIMESTAMP WHERE id = :id`,
      { score, id }
    );
    await connection.commit();
    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function getApprovalList(userId, userRole, page = 1, pageSize = 50) {
  let connection;
  try {
    connection = await db.getConnection();

    if (userRole === 'admin') {
      return await getAll(page, pageSize);
    }

    const userResult = await connection.execute(
      `SELECT name FROM users WHERE id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (userResult.rows.length === 0) return { data: [], total: 0, page, pageSize };

    const developerName = userResult.rows[0].NAME;
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(
      `SELECT * FROM (
        SELECT r.*, ROW_NUMBER() OVER (ORDER BY CREATEDAT DESC) as rn
        FROM requirements r
        WHERE isDraft = 0 AND developer = :developerName
      ) WHERE rn > :offset AND rn <= :limit`,
      { developerName, offset, limit: offset + pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseRows(result.rows);

    const totalResult = await connection.execute(
      `SELECT COUNT(*) FROM requirements WHERE isDraft = 0 AND developer = :developerName`,
      { developerName }
    );
    const total = totalResult.rows[0][0];

    return { data, total, page, pageSize };
  } finally {
    if (connection) await connection.close();
  }
}

async function getGanttData(filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    
    let whereClause = 'WHERE isDraft = 0';
    const params = {};
    
    if (filters.userRole !== 'admin') {
      const userResult = await connection.execute(
        `SELECT name FROM users WHERE id = :userId`,
        { userId: filters.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (userResult.rows.length > 0) {
        const userName = userResult.rows[0].NAME;
        whereClause += ' AND (submitter = :submitter OR developer = :developer)';
        params.submitter = userName;
        params.developer = userName;
      }
    }
    
    if (filters.platform) {
      whereClause += ' AND platform = :platform';
      params.platform = filters.platform;
    }
    if (filters.status) {
      whereClause += ' AND status = :status';
      params.status = filters.status;
    }
    if (filters.developer) {
      whereClause += ' AND developer = :developer';
      params.developer = filters.developer;
    }
    
    const result = await connection.execute(
      `SELECT id, title, submitter, developer, platform, capability, 
              expectedDate, actualDate, priority, score, status, 
              createdAt, updatedAt
       FROM requirements
       ${whereClause}
       ORDER BY platform, createdAt ASC`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const data = await parseRows(result.rows);
    
    const platformStats = {};
    data.forEach(req => {
      const platform = req.platform || '未分类';
      if (!platformStats[platform]) {
        platformStats[platform] = { total: 0, completed: 0 };
      }
      platformStats[platform].total++;
      if (req.status === '已发布') {
        platformStats[platform].completed++;
      }
    });
    
    return { 
      data, 
      platformStats,
      total: data.length
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function getAIContext() {
  let connection;
  try {
    connection = await db.getConnection();

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const parseSimpleRow = (row) => {
      const fmt = (v) => {
        if (!v) return null;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        const s = String(v).trim().substring(0, 10);
        return s || null;
      };
      return {
        id: row.ID,
        title: row.TITLE,
        submitter: row.SUBMITTER,
        developer: row.DEVELOPER,
        platform: row.PLATFORM,
        capability: row.CAPABILITY,
        priority: row.PRIORITY,
        status: row.STATUS,
        score: row.SCORE,
        expectedDate: fmt(row.EXPECTEDDATE),
        actualDate: fmt(row.ACTUALDATE),
        createdAt: fmt(row.CREATEDAT),
        updatedAt: fmt(row.UPDATEDAT)
      };
    };

    const fields = 'ID, TITLE, SUBMITTER, DEVELOPER, PLATFORM, CAPABILITY, PRIORITY, STATUS, SCORE, EXPECTEDDATE, ACTUALDATE, CREATEDAT, UPDATEDAT';

    const recentNewResult = await connection.execute(
      `SELECT ${fields} FROM requirements WHERE isDraft = 0 AND CREATEDAT >= SYSDATE - 7 ORDER BY CREATEDAT DESC`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const recentChangesResult = await connection.execute(
      `SELECT ${fields} FROM requirements WHERE isDraft = 0 AND UPDATEDAT >= SYSDATE - 7 AND CREATEDAT < SYSDATE - 7 ORDER BY UPDATEDAT DESC`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const activeResult = await connection.execute(
      `SELECT ${fields} FROM requirements WHERE isDraft = 0 AND STATUS != '已发布' ORDER BY PRIORITY DESC, CREATEDAT ASC`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const overdueResult = await connection.execute(
      `SELECT ${fields} FROM requirements WHERE isDraft = 0 AND EXPECTEDDATE IS NOT NULL AND EXPECTEDDATE <= SYSDATE + 3 AND STATUS != '已发布' ORDER BY EXPECTEDDATE ASC`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const allResult = await connection.execute(
      `SELECT ${fields} FROM requirements WHERE isDraft = 0 ORDER BY CREATEDAT DESC`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const recentNew = recentNewResult.rows.map(parseSimpleRow);
    const recentChanges = recentChangesResult.rows.map(parseSimpleRow);
    const active = activeResult.rows.map(parseSimpleRow);
    const overdue = overdueResult.rows.map(parseSimpleRow);
    const all = allResult.rows.map(parseSimpleRow);

    const byDeveloper = {};
    all.forEach(r => {
      const dev = r.developer || '未分配';
      if (!byDeveloper[dev]) byDeveloper[dev] = [];
      byDeveloper[dev].push(r);
    });

    const byPlatform = {};
    all.forEach(r => {
      const p = r.platform || '未分类';
      if (!byPlatform[p]) byPlatform[p] = [];
      byPlatform[p].push(r);
    });

    const statusStats = {};
    all.forEach(r => {
      statusStats[r.status] = (statusStats[r.status] || 0) + 1;
    });

let recentActivities = [];
    try {
      const recentActivitiesResult = await connection.execute(
        `SELECT c.REQUIREMENTID, c.USERNAME, c.TYPE, c.CREATEDAT
         FROM requirement_comments c
         WHERE c.CREATEDAT >= SYSDATE - 30
         ORDER BY c.CREATEDAT DESC`,
        {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const reqMap = {};
      all.forEach(r => { reqMap[r.id] = r.title; });
      recentActivities = recentActivitiesResult.rows.map(row => {
        let createdAt = null;
        if (row.CREATEDAT) {
          const d = new Date(row.CREATEDAT);
          if (!isNaN(d.getTime())) createdAt = d.toISOString().slice(0, 10);
        }
        const typeMap = {
          approval: '审批操作',
          review: '评审操作',
          dev_message: '状态更新',
          user_message: '用户留言'
        };
        return {
          title: reqMap[row.REQUIREMENTID] || '',
          userName: row.USERNAME || '',
          type: row.TYPE || '',
          content: typeMap[row.TYPE] || row.TYPE || '',
          createdAt
        };
      });
    } catch (e) {
      console.error('AI context: failed to load activities:', e.message);
    }

    return {
      today: todayStr,
      recentNew,
      recentChanges,
      active,
      overdue,
      byDeveloper,
      byPlatform,
      statusStats,
      total: all.length,
      all,
      recentActivities
    };
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getAll,
  getApprovalList,
  getBySubmitter,
  getDrafts,
  getLatestDraft,
  getById,
  create,
  update,
  remove,
  updateStatus,
  approve,
  score,
  getGanttData,
  getAIContext,
  STATUS,
  STATUS_ORDER,
  VALID_TRANSITIONS,
  getNextStatuses
};

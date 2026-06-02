const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');
const workflowModel = require('./workflow');
const { FLOW_KEY_REQUIREMENT } = require('../utils/workflowDefaults');

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

function getConsistentRequirementState({ status, approvalStatus }) {
  if (approvalStatus === 'approved' && status === STATUS.PENDING_APPROVAL) {
    return {
      status: STATUS.PENDING_REVIEW,
      approvalStatus,
      repaired: true
    };
  }

  if (approvalStatus !== 'approved' && status !== STATUS.PENDING_APPROVAL) {
    return {
      status: STATUS.PENDING_APPROVAL,
      approvalStatus,
      repaired: true
    };
  }

  return {
    status,
    approvalStatus,
    repaired: false
  };
}

function resolveApprovalListScope(user = {}) {
  const role = typeof user.role === 'string' ? user.role.trim() : '';
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (role === 'admin' || role === 'role-admin') {
    return { type: 'all' };
  }

  if (role === 'developer' || role === 'role-developer') {
    return { type: 'assigned' };
  }

  if (permissions.includes('requirement:approve')) {
    return { type: 'all' };
  }

  return { type: 'none' };
}

async function getNextStatuses(currentStatus) {
  const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT);
  return workflowModel.listNextStatuses(flow, currentStatus, 'none');
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
  
  const consistentState = getConsistentRequirementState({
    status: row.STATUS,
    approvalStatus: row.APPROVALSTATUS
  });

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
    status: consistentState.status,
    isDraft: row.ISDRAFT,
    steps: stepsJson ? JSON.parse(stepsJson) : [],
    noteImages: noteJson ? JSON.parse(noteJson) : [],
    approvalStatus: consistentState.approvalStatus,
    approvalComment: approvalJson,
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

async function parseRows(rows) {
  return Promise.all(rows.map(parseRow));
}

function parseGanttRow(row) {
  return {
    id: row.ID,
    title: row.TITLE,
    submitter: row.SUBMITTER,
    developer: row.DEVELOPER,
    platform: row.PLATFORM,
    capability: row.CAPABILITY,
    expectedDate: row.EXPECTEDDATE,
    actualDate: row.ACTUALDATE,
    priority: row.PRIORITY,
    score: row.SCORE,
    status: row.STATUS,
    approvalStatus: row.APPROVALSTATUS,
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

function parseGanttRows(rows = []) {
  return rows.map(parseGanttRow);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundToOne(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function toMonthLabel(value) {
  const date = toDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getAuditDetails(log = {}) {
  const details = log.details !== undefined ? log.details : log.DETAILS;
  if (!details) return {};
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch (error) {
      return {};
    }
  }
  return details;
}

function getAuditBody(log = {}) {
  const details = getAuditDetails(log);
  return details.body || details || {};
}

function getAuditAction(log = {}) {
  return log.action || log.ACTION || '';
}

function getAuditResourceId(log = {}) {
  return log.resourceId || log.RESOURCEID || log.requirementId || log.REQUIREMENTID || null;
}

function getAuditCreatedAt(log = {}) {
  return toDate(log.createdAt || log.CREATEDAT);
}

function averageByMonth(samples) {
  const grouped = new Map();
  samples.forEach((sample) => {
    const label = toMonthLabel(sample.date);
    if (!label) return;
    const current = grouped.get(label) || { total: 0, count: 0 };
    current.total += sample.value;
    current.count += 1;
    grouped.set(label, current);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, item]) => ({
      label,
      value: roundToOne(item.total / item.count)
    }));
}

function buildDashboardMetrics({ requirements = [], auditLogs = [], developerLoadStats = [], today = new Date() } = {}) {
  const todayDate = toDate(today) || new Date();
  todayDate.setHours(0, 0, 0, 0);

  const logsByRequirement = new Map();
  auditLogs.forEach((log) => {
    const resourceId = getAuditResourceId(log);
    const createdAt = getAuditCreatedAt(log);
    if (!resourceId || !createdAt) return;
    const list = logsByRequirement.get(resourceId) || [];
    list.push(log);
    logsByRequirement.set(resourceId, list);
  });
  logsByRequirement.forEach((logs) => logs.sort((a, b) => getAuditCreatedAt(a) - getAuditCreatedAt(b)));

  const throughputMap = new Map();
  const approvalSamples = [];
  const developmentSamples = [];
  const platformMap = new Map();

  let overdueCount = 0;
  const total = requirements.length;

  requirements.forEach((requirement) => {
    const createdAt = toDate(requirement.createdAt);
    const updatedAt = toDate(requirement.updatedAt);
    const expectedDate = toDate(requirement.expectedDate);
    const status = requirement.status;
    const logs = logsByRequirement.get(requirement.id) || [];

    const createdMonth = toMonthLabel(createdAt);
    if (createdMonth) {
      const item = throughputMap.get(createdMonth) || { label: createdMonth, createdCount: 0, releasedCount: 0 };
      item.createdCount += 1;
      throughputMap.set(createdMonth, item);
    }

    const approvalLog = logs.find((log) => {
      const body = getAuditBody(log);
      return getAuditAction(log) === 'approve' && body.approved === true;
    });
    const approvalDate = getAuditCreatedAt(approvalLog);
    if (createdAt && approvalDate && approvalDate >= createdAt) {
      approvalSamples.push({
        date: approvalDate,
        value: (approvalDate - createdAt) / (1000 * 60 * 60)
      });
    }

    const developmentStartLog = logs.find((log) => {
      const body = getAuditBody(log);
      return getAuditAction(log) === 'update_status' && [STATUS.PENDING_DEV, STATUS.IN_DEV].includes(body.status);
    });
    const releaseLog = logs.find((log) => {
      const body = getAuditBody(log);
      return getAuditAction(log) === 'update_status' && body.status === STATUS.RELEASED;
    });
    const developmentStartDate = getAuditCreatedAt(developmentStartLog);
    const releaseDate = getAuditCreatedAt(releaseLog) || (status === STATUS.RELEASED ? updatedAt : null);

    if (developmentStartDate && releaseDate && releaseDate >= developmentStartDate) {
      developmentSamples.push({
        date: releaseDate,
        value: (releaseDate - developmentStartDate) / (1000 * 60 * 60 * 24)
      });
    }

    const releasedMonth = toMonthLabel(releaseDate);
    if (releasedMonth) {
      const item = throughputMap.get(releasedMonth) || { label: releasedMonth, createdCount: 0, releasedCount: 0 };
      item.releasedCount += 1;
      throughputMap.set(releasedMonth, item);
    }

    if (expectedDate && expectedDate < todayDate && status !== STATUS.RELEASED) {
      overdueCount += 1;
    }

    const platform = requirement.platform || '未分类';
    const platformItem = platformMap.get(platform) || { platform, total: 0, released: 0, releaseRate: 0 };
    platformItem.total += 1;
    if (status === STATUS.RELEASED) {
      platformItem.released += 1;
    }
    platformMap.set(platform, platformItem);
  });

  const throughput = [...throughputMap.values()].sort((a, b) => a.label.localeCompare(b.label));
  const platformRanking = [...platformMap.values()]
    .map((item) => ({
      ...item,
      releaseRate: item.total ? roundToOne((item.released / item.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total || b.released - a.released || a.platform.localeCompare(b.platform));

  const developerHeatmap = developerLoadStats
    .map((item) => {
      const loadPercent = roundToOne(item.loadPercent);
      return {
        ...item,
        loadPercent,
        loadLevel: loadPercent >= 80 ? 'high' : loadPercent >= 60 ? 'medium' : 'normal'
      };
    })
    .sort((a, b) => b.loadPercent - a.loadPercent);

  const approvalTotal = approvalSamples.reduce((sum, item) => sum + item.value, 0);
  const developmentTotal = developmentSamples.reduce((sum, item) => sum + item.value, 0);

  return {
    throughput,
    approvalCycle: {
      averageHours: approvalSamples.length ? roundToOne(approvalTotal / approvalSamples.length) : 0,
      sampleCount: approvalSamples.length,
      trend: averageByMonth(approvalSamples)
    },
    developmentCycle: {
      averageDays: developmentSamples.length ? roundToOne(developmentTotal / developmentSamples.length) : 0,
      sampleCount: developmentSamples.length,
      trend: averageByMonth(developmentSamples)
    },
    overdue: {
      count: overdueCount,
      total,
      rate: total ? roundToOne((overdueCount / total) * 100) : 0
    },
    platformRanking,
    developerHeatmap
  };
}

async function reconcileRequirementState(connection, row) {
  const consistentState = getConsistentRequirementState({
    status: row.STATUS,
    approvalStatus: row.APPROVALSTATUS
  });

  if (!consistentState.repaired) {
    return row;
  }

  await connection.execute(
    `UPDATE requirements
     SET status = :status,
         UPDATEDAT = CURRENT_TIMESTAMP
     WHERE id = :id`,
    {
      id: row.ID,
      status: consistentState.status
    }
  );

  return {
    ...row,
    STATUS: consistentState.status
  };
}

async function reconcileRequirementStates(connection, rows) {
  let repaired = false;
  const normalizedRows = [];

  for (const row of rows || []) {
    const normalizedRow = await reconcileRequirementState(connection, row);
    if (normalizedRow !== row) {
      repaired = true;
    }
    normalizedRows.push(normalizedRow);
  }

  if (repaired) {
    await connection.commit();
  }

  return normalizedRows;
}

function buildRequirementListFilters(filters = {}) {
  const clauses = ['WHERE isDraft = 0'];
  const params = {};

  if (filters.status) {
    clauses.push('AND status = :status');
    params.status = filters.status;
  }
  if (filters.platform) {
    clauses.push('AND platform = :platform');
    params.platform = filters.platform;
  }
  if (filters.developer) {
    clauses.push('AND developer = :developer');
    params.developer = filters.developer;
  }
  if (filters.priority) {
    clauses.push('AND priority = :priority');
    params.priority = filters.priority;
  }
  if (filters.dateStart) {
    clauses.push('AND createdAt >= :dateStart');
    params.dateStart = filters.dateStart;
  }
  if (filters.dateEndExclusive) {
    clauses.push('AND createdAt < :dateEndExclusive');
    params.dateEndExclusive = filters.dateEndExclusive;
  }
  if (filters.minScore !== null && filters.minScore !== undefined) {
    clauses.push('AND score >= :minScore');
    params.minScore = filters.minScore;
  }
  if (filters.maxScore !== null && filters.maxScore !== undefined) {
    clauses.push('AND score <= :maxScore');
    params.maxScore = filters.maxScore;
  }
  if (filters.isOverdue === 'true') {
    clauses.push('AND expectedDate IS NOT NULL');
    clauses.push('AND expectedDate < TRUNC(SYSDATE)');
    clauses.push('AND status != :releasedStatus');
    params.releasedStatus = STATUS.RELEASED;
  }
  if (filters.isOverdue === 'false') {
    clauses.push('AND (expectedDate IS NULL OR expectedDate >= TRUNC(SYSDATE) OR status = :releasedStatus)');
    params.releasedStatus = STATUS.RELEASED;
  }

  return {
    whereClause: clauses.join(' '),
    params
  };
}

function buildSummaryQueryParts(filters = {}) {
  return buildRequirementListFilters(filters);
}

async function getFilterOptions(connection) {
  const platformResult = await connection.execute(
          `SELECT DISTINCT platform
       FROM requirements
       WHERE isDraft = 0 AND platform IS NOT NULL AND TRIM(platform) IS NOT NULL
       ORDER BY platform ASC`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return {
    platforms: (platformResult.rows || []).map(row => row.PLATFORM).filter(Boolean)
  };
}

async function getAll(page = 1, pageSize = 20, filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    const { whereClause, params } = buildRequirementListFilters(filters);
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(
              `SELECT * FROM (
          SELECT r.*, ROW_NUMBER() OVER (ORDER BY CREATEDAT DESC) as rn
          FROM requirements r
          ${whereClause}
        ) WHERE rn > :offset AND rn <= :limit`,
      { ...params, offset, limit: offset + pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseRows(await reconcileRequirementStates(connection, result.rows));

    const totalResult = await connection.execute(
              `SELECT COUNT(*) FROM requirements ${whereClause}`,
      params
    );
    const total = totalResult.rows[0][0];

    const statusStatsResult = await connection.execute(
              `SELECT status as req_status, COUNT(*) as cnt
         FROM requirements
         ${whereClause}
         GROUP BY status`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const statusStats = {};
    statusStatsResult.rows.forEach(row => {
      const keys = Object.keys(row);
      const statusKey = keys.find(k => k.toUpperCase() === 'REQ_STATUS') || keys.find(k => k.toUpperCase() === 'STATUS');
      const countKey = keys.find(k => k.toUpperCase() === 'CNT') || keys.find(k => k.toUpperCase() === 'COUNT');
      const status = statusKey ? String(row[statusKey]).trim() : null;
      const count = countKey ? Number(row[countKey]) : 0;
      if (status) {
        statusStats[status] = count;
      }
    });

    const priorityStatsResult = await connection.execute(
      `SELECT priority, COUNT(*) AS cnt
       FROM requirements
       ${whereClause}
       GROUP BY priority`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const priorityStats = {};
    (priorityStatsResult.rows || []).forEach(row => {
      if (row.PRIORITY) {
        priorityStats[String(row.PRIORITY).trim()] = Number(row.CNT) || 0;
      }
    });

    const scoreStatsResult = await connection.execute(
      `SELECT
         SUM(CASE WHEN score > 0 AND score <= 60 THEN 1 ELSE 0 END) AS bucket_0_60,
         SUM(CASE WHEN score >= 61 AND score <= 80 THEN 1 ELSE 0 END) AS bucket_61_80,
         SUM(CASE WHEN score >= 81 AND score <= 100 THEN 1 ELSE 0 END) AS bucket_81_100
       FROM requirements
       ${whereClause}`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const scoreRow = scoreStatsResult.rows?.[0] || {};
    const scoreStats = {
      '0-60': Number(scoreRow.BUCKET_0_60) || 0,
      '61-80': Number(scoreRow.BUCKET_61_80) || 0,
      '81-100': Number(scoreRow.BUCKET_81_100) || 0
    };

    const avgScoreResult = await connection.execute(
      `SELECT AVG(score) as avgScore
       FROM requirements
       ${whereClause}
       AND score > 0`,
      params
    );
    const avgScore = Number(avgScoreResult.rows[0][0]) || 0;
    const filterOptions = await getFilterOptions(connection);

    return { data, total, page, pageSize, statusStats, priorityStats, scoreStats, avgScore, filterOptions };
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
    const data = await parseRows(await reconcileRequirementStates(connection, result.rows));

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
    const [row] = await reconcileRequirementStates(connection, result.rows);
    return await parseRow(row);
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

async function updateStatus(id, status, actorRole) {
  const current = await getById(id);
  if (!current) return null;
  if (current.approvalStatus !== 'approved') {
    throw new Error('该需求尚未审批通过，不能更新状态');
  }

  const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT);
  const transition = workflowModel.findTransition(flow, current.status, status, 'none');
  workflowModel.assertTransitionAllowed(transition, actorRole, false);
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `UPDATE requirements SET status = :status, UPDATEDAT = CURRENT_TIMESTAMP WHERE id = :id`,
      { status, id }
    );
    await connection.commit();
    const requirement = await getById(id);
    return { requirement, transition };
  } finally {
    if (connection) await connection.close();
  }
}

async function approve(id, approved, comment, actualDate, actorRole) {
  const current = await getById(id);
  if (!current) return null;
  if (current.approvalStatus !== 'pending') {
    throw new Error('该需求已审批过，不能重复审批');
  }
  const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT);
  const approvalOutcome = approved ? 'approved' : 'rejected';
  const transition = flow.transitions.find(item =>
    item.enabled &&
    item.fromStatus === current.status &&
    (item.approvalOutcome || 'none') === approvalOutcome
  );
  workflowModel.assertTransitionAllowed(transition, actorRole, true);
  const newStatus = transition.toStatus;
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
    const requirement = await getById(id);
    return { requirement, transition };
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

async function getApprovalList(userId, userRole, permissions = [], page = 1, pageSize = 50) {
  let connection;
  try {
    connection = await db.getConnection();

    const scope = resolveApprovalListScope({ role: userRole, permissions });
    if (scope.type === 'none') {
      return { data: [], total: 0, page, pageSize };
    }

    if (scope.type === 'all') {
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
              expectedDate, actualDate, priority, score, status, approvalStatus,
              createdAt, updatedAt
       FROM requirements
       ${whereClause}
       ORDER BY platform, createdAt ASC`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const data = parseGanttRows(result.rows);
    
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

async function getDashboardMetrics() {
  let connection;
  try {
    connection = await db.getConnection();

    const fields = 'ID, DEVELOPER, PLATFORM, STATUS, EXPECTEDDATE, CREATEDAT, UPDATEDAT';
    const requirementsResult = await connection.execute(
      `SELECT ${fields}
       FROM requirements
       WHERE isDraft = 0`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const requirements = (requirementsResult.rows || []).map((row) => ({
      id: row.ID,
      developer: row.DEVELOPER,
      platform: row.PLATFORM,
      status: row.STATUS,
      expectedDate: row.EXPECTEDDATE,
      createdAt: row.CREATEDAT,
      updatedAt: row.UPDATEDAT
    }));

    let auditLogs = [];
    try {
      let auditResult;
      try {
        auditResult = await connection.execute(
          `SELECT action, resourceId, details, createdAt
           FROM audit_logs
           WHERE "resource" = 'requirement'
             AND action IN ('approve', 'update_status')
           ORDER BY createdAt ASC`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        if (!String(error?.message || '').includes('ORA-00904')) {
          throw error;
        }
        auditResult = await connection.execute(
          `SELECT action, resourceId, details, createdAt
           FROM audit_logs
           WHERE resource = 'requirement'
             AND action IN ('approve', 'update_status')
           ORDER BY createdAt ASC`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      }

      for (const row of auditResult.rows || []) {
        const details = await readLobContent(row.DETAILS);
        auditLogs.push({
          action: row.ACTION,
          resourceId: row.RESOURCEID,
          details: details ? JSON.parse(details) : null,
          createdAt: row.CREATEDAT
        });
      }
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00942')) {
        throw error;
      }
    }

    let developerLoadStats = [];
    try {
      const developerResult = await connection.execute(
        `SELECT
           u.id,
           u.name,
           NVL(d.department, '') AS department,
           NVL(d.maxLoad, 5) AS maxLoad,
           NVL(d.currentLoad, 0) AS currentLoad
         FROM users u
         LEFT JOIN developers d ON d.userId = u.id
         WHERE (u.role = 'developer' OR u.role = 'role-developer')
           AND u.status = 1
         ORDER BY u.name ASC`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      developerLoadStats = (developerResult.rows || []).map((row) => {
        const maxLoad = Number(row.MAXLOAD) || 0;
        const currentLoad = Number(row.CURRENTLOAD) || 0;
        return {
          id: row.ID,
          name: row.NAME,
          department: row.DEPARTMENT || '',
          maxLoad,
          currentLoad,
          loadPercent: maxLoad ? roundToOne((currentLoad / maxLoad) * 100) : 0
        };
      });
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00942') && !String(error?.message || '').includes('ORA-00904')) {
        throw error;
      }
      developerLoadStats = [];
    }

    return buildDashboardMetrics({
      requirements,
      auditLogs,
      developerLoadStats,
      today: new Date()
    });
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
  getDashboardMetrics,
  getAIContext,
  buildDashboardMetrics,
  resolveApprovalListScope,
  getConsistentRequirementState,
  STATUS,
  STATUS_ORDER,
  getNextStatuses,
  buildRequirementListFilters,
  buildSummaryQueryParts
};

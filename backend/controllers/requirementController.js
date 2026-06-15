const requirementModel = require('../models/requirement');
const commentModel = require('../models/comment');
const notificationService = require('../utils/notificationService');
const autoEmailService = require('../utils/autoEmailService');
const db = require('../db/oracle');
const { driver: oracledb } = require('../db/oracle');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ASSIGNABLE_DEVELOPER_MESSAGE = '请选择用户角色管理中的启用开发人员或管理员';

function toOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseDateOnly(value, fieldName) {
  const normalized = toOptionalString(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(fieldName + ' format is invalid');
  }
  const date = new Date(normalized + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime())) {
    throw new Error(fieldName + ' format is invalid');
  }
  return date;
}

function parseScore(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(fieldName + ' must be between 0 and 100');
  }
  return score;
}

function parseRequirementListQuery(query = {}) {
  const page = toPositiveInteger(query.page, 1);
  const requestedPageSize = toPositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  const dateStart = parseDateOnly(query.dateStart, 'dateStart');
  const dateEnd = parseDateOnly(query.dateEnd, 'dateEnd');
  const minScore = parseScore(query.minScore, 'minScore');
  const maxScore = parseScore(query.maxScore, 'maxScore');
  const isOverdue = ['true', 'early', 'false'].includes(query.isOverdue) ? query.isOverdue : null;

  if (dateStart && dateEnd && dateStart.getTime() > dateEnd.getTime()) {
    throw new Error('dateStart cannot be later than dateEnd');
  }
  if (minScore !== null && maxScore !== null && minScore > maxScore) {
    throw new Error('minScore cannot be greater than maxScore');
  }

  const dateEndExclusive = dateEnd ? new Date(dateEnd.getTime() + 24 * 60 * 60 * 1000) : null;

  return {
    page,
    pageSize,
    status: toOptionalString(query.status),
    platform: toOptionalString(query.platform),
    developer: toOptionalString(query.developer),
    keyword: toOptionalString(query.keyword),
    priority: toOptionalString(query.priority),
    dateStart,
    dateEnd,
    dateEndExclusive,
    minScore,
    maxScore,
    isOverdue
  };
}

function isBadFilterRequest(error) {
  if (!error?.message) return false;
  return (
    error.message.includes('format is invalid') ||
    error.message.includes('cannot be later than') ||
    error.message.includes('cannot be greater than') ||
    error.message.includes('must be between 0 and 100')
  );
}

async function resolveAssignableDeveloper(developerName) {
  const normalizedName = toOptionalString(developerName);
  if (!normalizedName) return null;

  let connection;
  try {
    connection = await db.getConnection();
    const devResult = await connection.execute(
      `SELECT id, username, name
       FROM users
       WHERE (id = :devName OR username = :devName OR name = :devName)
         AND role IN ('developer', 'role-developer', 'admin', 'role-admin')
         AND status = 1`,
      { devName: normalizedName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const developer = devResult.rows?.[0];
    if (!developer) {
      throw new Error(ASSIGNABLE_DEVELOPER_MESSAGE);
    }

    return { id: developer.ID, name: developer.NAME, username: developer.USERNAME };
  } finally {
    if (connection) await connection.close();
  }
}

async function resolveAssignableDevelopers(developerValue) {
  const inputs = Array.isArray(developerValue) ? developerValue : [developerValue];
  const selected = [];
  const seen = new Set();

  inputs.forEach((item) => {
    if (item === undefined || item === null) return;
    if (item && typeof item === 'object') {
      const id = toOptionalString(item.userId || item.id || item.value);
      const username = toOptionalString(item.username);
      const name = toOptionalString(item.name || item.label);
      const key = id ? `id:${id}` : username ? `username:${username}` : name ? `name:${name}` : null;
      if (key && !seen.has(key)) {
        seen.add(key);
        selected.push({ id, username, name });
      }
      return;
    }

    String(item)
      .split(/[,;，；]+/)
      .map(value => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        const key = `raw:${value}`;
        if (!seen.has(key)) {
          seen.add(key);
          selected.push({ id: value, username: value, name: value });
        }
      });
  });

  if (!selected.length) return [];

  let connection;
  try {
    connection = await db.getConnection();
    const binds = {};
    const clauses = selected.map((developer, index) => {
      const parts = [];
      if (developer.id) {
        const key = `devId${index}`;
        binds[key] = developer.id;
        parts.push(`id = :${key}`);
      }
      if (developer.username) {
        const key = `devUsername${index}`;
        binds[key] = developer.username;
        parts.push(`username = :${key}`);
      }
      if (developer.name) {
        const key = `devName${index}`;
        binds[key] = developer.name;
        parts.push(`name = :${key}`);
      }
      return `(${parts.join(' OR ')})`;
    }).filter(Boolean);

    const devResult = await connection.execute(
      `SELECT id, username, name
       FROM users
       WHERE (${clauses.join(' OR ')})
         AND role IN ('developer', 'role-developer', 'admin', 'role-admin')
         AND status = 1`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const developerById = new Map();
    const developerByUsername = new Map();
    const developerByName = new Map();
    (devResult.rows || []).forEach((row) => {
      const developer = {
        id: String(row.ID || '').trim(),
        username: String(row.USERNAME || '').trim(),
        name: String(row.NAME || '').trim()
      };
      if (developer.id && !developerById.has(developer.id)) {
        developerById.set(developer.id, developer);
      }
      if (developer.username && !developerByUsername.has(developer.username)) {
        developerByUsername.set(developer.username, developer);
      }
      if (developer.name && !developerByName.has(developer.name)) {
        developerByName.set(developer.name, developer);
      }
    });

    const developers = selected.map((developer) => {
      if (developer.id && developerById.has(developer.id)) {
        return developerById.get(developer.id);
      }
      if (developer.username && developerByUsername.has(developer.username)) {
        return developerByUsername.get(developer.username);
      }
      if (developer.name && developerByName.has(developer.name)) {
        return developerByName.get(developer.name);
      }
      return null;
    }).filter(Boolean);

    if (developers.length !== selected.length) {
      throw new Error(ASSIGNABLE_DEVELOPER_MESSAGE);
    }

    return developers;
  } finally {
    if (connection) await connection.close();
  }
}

function applyResolvedRequirementUsers(body = {}, reqUser = {}, developers = [], options = {}) {
  const next = { ...body };
  if (options.includeSubmitterId) {
    next.submitterId = reqUser.id || body.submitterId || null;
  }
  next.developer = developers.map(developer => ({
    id: developer.id,
    userId: developer.id,
    username: developer.username,
    name: developer.name
  }));
  next.developerIds = developers.map(developer => developer.id);
  return next;
}

async function getApprovalList(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const approvalStatus = ['pending', 'approved', 'rejected'].includes(req.query.approvalStatus)
      ? req.query.approvalStatus
      : null;
    const keyword = toOptionalString(req.query.keyword);
    const { id, role, permissions = [] } = req.user;
    const result = await requirementModel.getApprovalList(id, role, permissions, page, pageSize, { approvalStatus, keyword });
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getApprovalList error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getAll(req, res) {
  try {
    const filters = {
      ...parseRequirementListQuery(req.query),
      viewer: req.user
    };
    const result = await requirementModel.getAll(filters.page, filters.pageSize, filters);
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      statusStats: result.statusStats,
      priorityStats: result.priorityStats,
      scoreStats: result.scoreStats,
      avgScore: result.avgScore,
      filterOptions: result.filterOptions
    });
  } catch (error) {
    if (isBadFilterRequest(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('getAll error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getBySubmitter(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'role-admin';
    const submitter = isAdmin ? req.query.submitter : (req.user?.name || req.user?.username);
    if (!submitter) return res.status(400).json({ success: false, message: 'submitter is required' });
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = isAdmin
      ? await requirementModel.getBySubmitter(submitter, page, pageSize)
      : await requirementModel.getBySubmitterUser(req.user, page, pageSize);
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getBySubmitter error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getDrafts(req, res) {
  try {
    const isAdmin = requirementModel.isAdminUser(req.user);
    const submitter = toOptionalString(req.query.submitter);
    if (isAdmin && !submitter) {
      return res.status(400).json({ success: false, message: 'submitter is required' });
    }
    const drafts = isAdmin
      ? await requirementModel.getDraftsBySubmitter(submitter)
      : await requirementModel.getDraftsByUser(req.user);
    res.json({ success: true, data: drafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getLatestDraft(req, res) {
  try {
    const isAdmin = requirementModel.isAdminUser(req.user);
    const submitter = toOptionalString(req.query.submitter);
    if (isAdmin && !submitter) {
      return res.status(400).json({ success: false, message: 'submitter is required' });
    }
    const draft = isAdmin
      ? await requirementModel.getLatestDraftBySubmitter(submitter)
      : await requirementModel.getLatestDraftByUser(req.user);
    if (!draft) return res.status(404).json({ success: false, message: 'draft not found' });
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getById(req, res) {
  try {
    const requirement = await requirementModel.getById(req.params.id);
    if (!requirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    if (!requirementModel.canUserViewRequirement(req.user, requirement)) {
      return res.status(403).json({ success: false, message: '当前账号不能查看该需求' });
    }
    res.json({ success: true, data: requirement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function create(req, res) {
  try {
    const developers = await resolveAssignableDevelopers(req.body.developer);
    const requirementBody = applyResolvedRequirementUsers(req.body, req.user, developers, { includeSubmitterId: true });
    const requirement = await requirementModel.create(requirementBody);
    for (const developer of developers) {
      await notificationService.notifyAssignDev(developer, requirement);
    }
    if (!req.body.isDraft) {
      try {
        await autoEmailService.enqueueRequirementCreatedEvent({
          requirement,
          actorId: req.user.id,
          actorName: req.user.name || req.user.username || requirement.submitter,
          summary: `新需求已提交：${requirement.title}`
        });
      } catch (emailError) {
        console.error('queue requirement created email error:', emailError.message);
      }
    }
    res.status(201).json({ success: true, data: requirement, message: 'requirement created' });
  } catch (error) {
    const status = error.message === ASSIGNABLE_DEVELOPER_MESSAGE ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
}

async function update(req, res) {
  try {
    const currentRequirement = await requirementModel.getById(req.params.id);
    if (!currentRequirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    if (!requirementModel.canUserEditRequirement(req.user, currentRequirement)) {
      return res.status(403).json({ success: false, message: '当前账号不能修改该需求' });
    }

    const safeBody = requirementModel.sanitizeRequirementUpdatePayload(req.body, req.user, currentRequirement);
    const developers = safeBody.developer !== undefined
      ? await resolveAssignableDevelopers(safeBody.developer)
      : [];
    const requirementBody = safeBody.developer !== undefined
      ? applyResolvedRequirementUsers(safeBody, req.user, developers)
      : safeBody;
    const requirement = await requirementModel.update(req.params.id, requirementBody);
    if (!requirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    for (const developer of developers) {
      await notificationService.notifyAssignDev(developer, requirement);
    }
    res.json({ success: true, data: requirement, message: 'requirement updated' });
  } catch (error) {
    const status = error.message === ASSIGNABLE_DEVELOPER_MESSAGE ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
}

async function remove(req, res) {
  try {
    const requirement = await requirementModel.getById(req.params.id);
    if (!requirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    if (!requirementModel.canUserDeleteRequirement(req.user, requirement)) {
      return res.status(403).json({ success: false, message: '当前账号不能删除该需求' });
    }

    const success = await requirementModel.remove(req.params.id);
    if (!success) return res.status(404).json({ success: false, message: 'requirement not found' });
    res.json({ success: true, message: 'requirement removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });
    const currentRequirement = await requirementModel.getById(req.params.id);
    if (!currentRequirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    if (!requirementModel.canUserUpdateRequirementStatus(req.user, currentRequirement)) {
      return res.status(403).json({ success: false, message: '当前账号不能流转该需求' });
    }
    const statusResult = await requirementModel.updateStatus(req.params.id, status, req.user.role);
    if (!statusResult) return res.status(404).json({ success: false, message: 'requirement not found' });

    const { requirement, transition } = statusResult;
    const { id: userId, username: userName, role: userRole } = req.user;
    await commentModel.create({
      requirementId: req.params.id,
      userId,
      userName,
      userRole,
      type: 'dev_message',
      content: `状态更新为：${status}`
    });

    if (transition?.notifyEnabled !== false) {
      let connection;
      try {
        connection = await db.getConnection();
        const submitterResult = await connection.execute(
          `SELECT id, name FROM users WHERE name = :submitter`,
          { submitter: requirement.submitter },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (submitterResult.rows.length > 0) {
          const submitter = submitterResult.rows[0];
          await notificationService.notifyStatusChange({ id: submitter.ID, name: submitter.NAME }, requirement, status);
        }
      } finally {
        if (connection) await connection.close();
      }
    }

    try {
      await autoEmailService.enqueueRequirementEvent({
        requirement,
        eventType: 'status_updated',
        actorId: req.user.id,
        actorName: req.user.name || req.user.username,
        summary: `状态更新为：${status}`
      });
    } catch (emailError) {
      console.error('queue status email error:', emailError.message);
    }

    res.json({ success: true, data: requirement, message: 'status updated' });
  } catch (error) {
    if (error.message && error.message.startsWith('非法状态流转')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function approve(req, res) {
  try {
    const { approved, comment, actualDate } = req.body;
    const approvalResult = await requirementModel.approve(req.params.id, approved, comment, actualDate, req.user.role);
    if (!approvalResult) return res.status(404).json({ success: false, message: 'requirement not found' });

    const { requirement, transition } = approvalResult;
    const { id: userId, username: userName, role: userRole } = req.user;
    await commentModel.create({
      requirementId: req.params.id,
      userId,
      userName,
      userRole,
      type: 'approval',
      content: `审批意见：${approved ? '通过' : '拒绝'}${comment ? ` - ${comment}` : ''}`
    });

    if (transition?.notifyEnabled !== false) {
      let connection;
      try {
        connection = await db.getConnection();
        const submitterResult = await connection.execute(
          `SELECT id, name FROM users WHERE name = :submitter`,
          { submitter: requirement.submitter },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (submitterResult.rows.length > 0) {
          const submitter = submitterResult.rows[0];
          await notificationService.notifyApprovalResult(
            { id: submitter.ID, name: submitter.NAME },
            requirement,
            approved,
            comment
          );
        }
      } finally {
        if (connection) await connection.close();
      }
    }

    try {
      await autoEmailService.enqueueRequirementEvent({
        requirement,
        eventType: 'approval_updated',
        actorId: req.user.id,
        actorName: req.user.name || req.user.username,
        summary: `审批${approved ? '通过' : '拒绝'}${comment ? `：${comment}` : ''}`
      });
    } catch (emailError) {
      console.error('queue approval email error:', emailError.message);
    }

    res.json({ success: true, data: requirement, message: approved ? 'approved' : 'rejected' });
  } catch (error) {
    if (error.message && (error.message.startsWith('该需求已审批过') || error.message.startsWith('非法状态流转'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function score(req, res) {
  try {
    const { score } = req.body;
    const currentRequirement = await requirementModel.getById(req.params.id);
    if (!currentRequirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    if (!requirementModel.canUserScoreRequirement(req.user, currentRequirement)) {
      return res.status(403).json({ success: false, message: '当前账号不能评分该需求' });
    }
    const requirement = await requirementModel.score(req.params.id, score);
    if (!requirement) return res.status(404).json({ success: false, message: 'requirement not found' });
    res.json({ success: true, data: requirement, message: 'score updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getGanttData(req, res) {
  try {
    const filters = {
      platform: req.query.platform || null,
      status: req.query.status || null,
      developer: req.query.developer || null,
      viewer: req.user,
      userId: req.user.id,
      userRole: req.user.role
    };
    const result = await requirementModel.getGanttData(filters);
    res.json({ success: true, data: result.data, platformStats: result.platformStats, total: result.total });
  } catch (error) {
    console.error('getGanttData error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getDashboard(req, res) {
  try {
    const dashboard = await requirementModel.getDashboardMetrics(req.user);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('getDashboard error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  parseRequirementListQuery,
  resolveAssignableDeveloper,
  resolveAssignableDevelopers,
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
  getDashboard
};

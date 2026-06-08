const { v4: uuidv4 } = require('uuid');
const { driver: oracledb } = require('../db/oracle');
const db = require('../db/oracle');
const { normalizeRoleName } = require('../utils/roleAccess');
const {
  FLOW_KEY_REQUIREMENT,
  DEFAULT_STATUSES,
  DEFAULT_TRANSITIONS
} = require('../utils/workflowDefaults');

const cache = new Map();
const VALID_ROLES = new Set(['admin', 'developer', 'user']);

function normalizeApprovalOutcomeValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeTransitionPayload(payload = {}, current = {}) {
  const requireApproval = payload.requireApproval === undefined
    ? !!current.requireApproval
    : !!payload.requireApproval;
  const rawApprovalOutcome = payload.approvalOutcome !== undefined
    ? payload.approvalOutcome
    : current.approvalOutcome;
  const approvalOutcome = requireApproval
    ? (normalizeApprovalOutcomeValue(rawApprovalOutcome) || 'approved')
    : 'none';

  return {
    fromStatus: payload.fromStatus || current.fromStatus,
    toStatus: payload.toStatus || current.toStatus,
    allowedRoles: normalizeRoles(
      payload.allowedRoles !== undefined ? payload.allowedRoles : current.allowedRoles
    ),
    requireApproval,
    notifyEnabled: payload.notifyEnabled === undefined
      ? current.notifyEnabled !== false
      : !!payload.notifyEnabled,
    enabled: payload.enabled === undefined
      ? current.enabled !== false
      : !!payload.enabled,
    approvalOutcome
  };
}

function validateTransitionPayload(payload) {
  if (!payload.fromStatus || !payload.toStatus) {
    throw new Error('流转配置缺少状态定义');
  }
  if (!payload.allowedRoles.length) {
    throw new Error('流转配置至少需要一个执行角色');
  }
  if (payload.requireApproval) {
    if (!['approved', 'rejected'].includes(payload.approvalOutcome)) {
      throw new Error('需要审批的流转只能使用 approved 或 rejected 作为审批结果');
    }
    return;
  }
  if (payload.approvalOutcome !== 'none') {
    throw new Error('无需审批的流转审批结果必须为 none');
  }
}

async function readLobContent(lob) {
  if (!lob) return null;
  if (typeof lob === 'string') return lob;
  return new Promise((resolve, reject) => {
    let data = '';
    lob.setEncoding('utf8');
    lob.on('data', chunk => { data += chunk; });
    lob.on('end', () => resolve(data));
    lob.on('error', reject);
  });
}

function normalizeRoleValue(value) {
  if (value && typeof value === 'object') {
    if (typeof value.value === 'string') return normalizeRoleValue(value.value);
    if (typeof value.role === 'string') return normalizeRoleValue(value.role);
    if (typeof value.code === 'string') return normalizeRoleValue(value.code);
    return null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[object Object]') return null;

  const normalizedRoleName = normalizeRoleName(trimmed) || trimmed;
  return VALID_ROLES.has(normalizedRoleName) ? normalizedRoleName : null;
}

function normalizeRoles(value) {
  if (!value) return [];

  const normalizeList = (list) => {
    const normalized = list
      .map(normalizeRoleValue)
      .filter(Boolean);
    return [...new Set(normalized)];
  };

  if (Array.isArray(value)) return normalizeList(value);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeList(parsed);
    }
  } catch (_error) {}
  return normalizeList(
    String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  );
}

function rowToStatus(row) {
  return {
    id: row.ID,
    flowKey: row.FLOWKEY,
    statusCode: row.STATUSCODE,
    statusName: row.STATUSNAME,
    sortOrder: Number(row.SORTORDER),
    isTerminal: Number(row.ISTERMINAL) === 1,
    enabled: Number(row.ENABLED) === 1
  };
}

async function rowToTransition(row) {
  const allowedRoles = await readLobContent(row.ALLOWEDROLES);
  return {
    id: row.ID,
    flowKey: row.FLOWKEY,
    fromStatus: row.FROMSTATUS,
    toStatus: row.TOSTATUS,
    allowedRoles: normalizeRoles(allowedRoles),
    requireApproval: Number(row.REQUIREAPPROVAL) === 1,
    notifyEnabled: Number(row.NOTIFYENABLED) === 1,
    enabled: Number(row.ENABLED) === 1,
    approvalOutcome: row.APPROVALOUTCOME || 'none'
  };
}

async function queryFlow(flowKey, connection) {
  const statusResult = await connection.execute(
    `SELECT id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled
     FROM workflow_statuses
     WHERE flowKey = :flowKey
     ORDER BY sortOrder ASC`,
    { flowKey },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const transitionResult = await connection.execute(
    `SELECT id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome
     FROM workflow_transitions
     WHERE flowKey = :flowKey
     ORDER BY fromStatus ASC, toStatus ASC`,
    { flowKey },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return {
    statuses: statusResult.rows.map(rowToStatus),
    transitions: await Promise.all(transitionResult.rows.map(rowToTransition))
  };
}

async function insertDefaultStatuses(connection, flowKey) {
  for (const status of DEFAULT_STATUSES) {
    const params = {
      flowKey,
      statusCode: status.statusCode,
      statusName: status.statusName,
      sortOrder: status.sortOrder,
      isTerminal: status.isTerminal,
      enabled: status.enabled
    };
    const existing = await connection.execute(
      `SELECT id FROM workflow_statuses WHERE flowKey = :flowKey AND statusCode = :statusCode`,
      { flowKey, statusCode: status.statusCode },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length) {
      await connection.execute(
        `UPDATE workflow_statuses
         SET statusName = :statusName,
             sortOrder = :sortOrder,
             isTerminal = :isTerminal,
             enabled = :enabled,
             updatedAt = CURRENT_TIMESTAMP
         WHERE flowKey = :flowKey AND statusCode = :statusCode`,
        params
      );
    } else {
      await connection.execute(
        `INSERT INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt)
         VALUES (:id, :flowKey, :statusCode, :statusName, :sortOrder, :isTerminal, :enabled, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        { id: uuidv4(), ...params }
      );
    }
  }
}

async function insertDefaultTransitions(connection, flowKey) {
  for (const transition of DEFAULT_TRANSITIONS) {
    const params = {
      flowKey,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      allowedRoles: JSON.stringify(transition.allowedRoles),
      requireApproval: transition.requireApproval,
      notifyEnabled: transition.notifyEnabled,
      enabled: transition.enabled,
      approvalOutcome: transition.approvalOutcome
    };
    const existing = await connection.execute(
      `SELECT id FROM workflow_transitions
       WHERE flowKey = :flowKey
         AND fromStatus = :fromStatus
         AND toStatus = :toStatus
         AND approvalOutcome = :approvalOutcome`,
      {
        flowKey,
        fromStatus: transition.fromStatus,
        toStatus: transition.toStatus,
        approvalOutcome: transition.approvalOutcome
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length) {
      await connection.execute(
        `UPDATE workflow_transitions
         SET allowedRoles = :allowedRoles,
             requireApproval = :requireApproval,
             notifyEnabled = :notifyEnabled,
             enabled = :enabled,
             updatedAt = CURRENT_TIMESTAMP
         WHERE flowKey = :flowKey
           AND fromStatus = :fromStatus
           AND toStatus = :toStatus
           AND approvalOutcome = :approvalOutcome`,
        params
      );
    } else {
      await connection.execute(
        `INSERT INTO workflow_transitions (id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome, createdAt, updatedAt)
         VALUES (:id, :flowKey, :fromStatus, :toStatus, :allowedRoles, :requireApproval, :notifyEnabled, :enabled, :approvalOutcome, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        { id: uuidv4(), ...params }
      );
    }
  }
}

async function ensureDefaultFlowData(connection, flowKey, flow) {
  let changed = false;

  if (!flow.statuses.length) {
    await insertDefaultStatuses(connection, flowKey);
    changed = true;
  }

  if (!flow.transitions.length) {
    await insertDefaultTransitions(connection, flowKey);
    changed = true;
  }

  if (!changed) return flow;

  await connection.commit();
  return queryFlow(flowKey, connection);
}

async function getFlow(flowKey = FLOW_KEY_REQUIREMENT, options = {}) {
  if (!options.forceRefresh && cache.has(flowKey)) {
    return cache.get(flowKey);
  }
  let connection;
  try {
    connection = await db.getConnection();
    const queriedFlow = await queryFlow(flowKey, connection);
    const flow = await ensureDefaultFlowData(connection, flowKey, queriedFlow);
    cache.set(flowKey, flow);
    return flow;
  } finally {
    if (connection) await connection.close();
  }
}

function findTransition(flow, fromStatus, toStatus, approvalOutcome = 'none') {
  return flow.transitions.find(item =>
    item.enabled &&
    item.fromStatus === fromStatus &&
    item.toStatus === toStatus &&
    (item.approvalOutcome || 'none') === (approvalOutcome || 'none')
  ) || null;
}

function listNextStatuses(flow, fromStatus, approvalOutcome = 'none') {
  return flow.transitions
    .filter(item =>
      item.enabled &&
      item.fromStatus === fromStatus &&
      (item.approvalOutcome || 'none') === (approvalOutcome || 'none')
    )
    .map(item => item.toStatus);
}

function assertTransitionAllowed(transition, actorRole, isApprovalAction = false) {
  if (!transition) {
    throw new Error('非法状态流转: 未找到有效流转配置');
  }
  if (!transition.allowedRoles.includes(actorRole)) {
    throw new Error(`非法状态流转: 角色"${actorRole}"无权限执行该流转`);
  }
  if (transition.requireApproval && !isApprovalAction) {
    throw new Error('该流转需要审批，请通过审批接口执行');
  }
}

async function replaceStatuses(flowKey, statuses) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`DELETE FROM workflow_statuses WHERE flowKey = :flowKey`, { flowKey });
    for (const status of statuses) {
      await connection.execute(
        `INSERT INTO workflow_statuses (id, flowKey, statusCode, statusName, sortOrder, isTerminal, enabled, createdAt, updatedAt)
         VALUES (:id, :flowKey, :statusCode, :statusName, :sortOrder, :isTerminal, :enabled, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          id: uuidv4(),
          flowKey,
          statusCode: status.statusCode,
          statusName: status.statusName || status.statusCode,
          sortOrder: Number(status.sortOrder || 0),
          isTerminal: status.isTerminal ? 1 : 0,
          enabled: status.enabled === false ? 0 : 1
        }
      );
    }
    await connection.commit();
    cache.delete(flowKey);
    return getFlow(flowKey, { forceRefresh: true });
  } finally {
    if (connection) await connection.close();
  }
}

async function createTransition(flowKey, payload) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();
    const normalizedPayload = normalizeTransitionPayload(payload);
    validateTransitionPayload(normalizedPayload);
    await connection.execute(
      `INSERT INTO workflow_transitions (id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome, createdAt, updatedAt)
       VALUES (:id, :flowKey, :fromStatus, :toStatus, :allowedRoles, :requireApproval, :notifyEnabled, :enabled, :approvalOutcome, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      {
        id,
        flowKey,
        fromStatus: normalizedPayload.fromStatus,
        toStatus: normalizedPayload.toStatus,
        allowedRoles: JSON.stringify(normalizedPayload.allowedRoles),
        requireApproval: normalizedPayload.requireApproval ? 1 : 0,
        notifyEnabled: normalizedPayload.notifyEnabled ? 1 : 0,
        enabled: normalizedPayload.enabled ? 1 : 0,
        approvalOutcome: normalizedPayload.approvalOutcome
      }
    );
    await connection.commit();
    cache.delete(flowKey);
    const flow = await getFlow(flowKey, { forceRefresh: true });
    return flow.transitions.find(item => item.id === id) || null;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateTransition(id, payload) {
  let connection;
  try {
    connection = await db.getConnection();
    const currentResult = await connection.execute(
      `SELECT id, flowKey, fromStatus, toStatus, allowedRoles, requireApproval, notifyEnabled, enabled, approvalOutcome
       FROM workflow_transitions WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!currentResult.rows.length) return null;
    const current = await rowToTransition(currentResult.rows[0]);
    const normalizedPayload = normalizeTransitionPayload(payload, current);
    validateTransitionPayload(normalizedPayload);

    await connection.execute(
      `UPDATE workflow_transitions SET
        fromStatus = :fromStatus,
        toStatus = :toStatus,
        allowedRoles = :allowedRoles,
        requireApproval = :requireApproval,
        notifyEnabled = :notifyEnabled,
        enabled = :enabled,
        approvalOutcome = :approvalOutcome,
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = :id`,
      {
        id,
        fromStatus: normalizedPayload.fromStatus,
        toStatus: normalizedPayload.toStatus,
        allowedRoles: JSON.stringify(normalizedPayload.allowedRoles),
        requireApproval: normalizedPayload.requireApproval ? 1 : 0,
        notifyEnabled: normalizedPayload.notifyEnabled ? 1 : 0,
        enabled: normalizedPayload.enabled ? 1 : 0,
        approvalOutcome: normalizedPayload.approvalOutcome
      }
    );
    await connection.commit();
    cache.delete(current.flowKey);
    const flow = await getFlow(current.flowKey, { forceRefresh: true });
    return flow.transitions.find(item => item.id === id) || null;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getFlow,
  findTransition,
  listNextStatuses,
  assertTransitionAllowed,
  replaceStatuses,
  createTransition,
  updateTransition,
  normalizeRoles,
  normalizeTransitionPayload,
  validateTransitionPayload
};

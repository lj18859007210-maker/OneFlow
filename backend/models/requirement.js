const { v4: uuidv4 } = require('uuid');
const { driver: oracledb } = require('../db/oracle');
const db = require('../db/oracle');
const workflowModel = require('./workflow');
const { FLOW_KEY_REQUIREMENT } = require('../utils/workflowDefaults');
const { calculateRequirementScore } = require('../utils/requirementScoring');

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

const SCORING_FIELDS = [
  'avgMonthlyCalls',
  'capability',
  'priority',
  'avgDevTime',
  'postDevAvgTime',
  'expectedDate',
  'actualDate',
  'status',
  'publishedAt',
  'publishDate',
  'releaseAt',
  'releaseDate'
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

function resolveRequirementViewScope(user = {}) {
  const role = typeof user.role === 'string' ? user.role.trim() : '';

  if (role === 'admin' || role === 'role-admin') {
    return { type: 'all' };
  }

  return { type: 'own' };
}

function isAdminRole(role) {
  const normalizedRole = String(role || '').trim();
  return normalizedRole === 'admin' || normalizedRole === 'role-admin';
}

function isDeveloperRole(role) {
  const normalizedRole = String(role || '').trim();
  return normalizedRole === 'developer' || normalizedRole === 'role-developer';
}

function isAdminUser(user = {}) {
  return isAdminRole(user.role);
}

function uniqueTrimmed(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function getUserScopeKeys(user = {}) {
  return {
    id: String(user.id || user.userId || '').trim(),
    username: String(user.username || '').trim(),
    name: String(user.name || user.username || '').trim()
  };
}

function getUserStructuredKeys(user = {}) {
  return uniqueTrimmed([user.id, user.userId, user.username]);
}

function getUserLegacyKeys(user = {}) {
  const keys = getUserScopeKeys(user);
  return uniqueTrimmed([keys.name, keys.username]);
}

function appendRequirementScopeFilter(clauses, params, user = {}, paramPrefix = 'scope') {
  const scope = resolveRequirementViewScope(user);
  if (scope.type === 'all') return;

  appendRequirementScopeFilterWithAlias(clauses, params, user, paramPrefix);
}

function appendRequirementScopeFilterWithAlias(clauses, params, user = {}, paramPrefix = 'scope', alias = '') {
  if (isDeveloperRole(user.role)) {
    appendOwnRequirementScopeFilterWithAlias(clauses, params, user, paramPrefix, alias);
    return;
  }

  appendSubmitterScopeFilterWithAlias(clauses, params, user, paramPrefix, alias);
}

function qualifyRequirementScopeClause(clause, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return clause
    .replace(/\bsubmitterId\b/g, `${prefix}submitterId`)
    .replace(/\bdeveloperIds\b/g, `${prefix}developerIds`)
    .replace(/\bsubmitter\b/g, `${prefix}submitter`)
    .replace(/\bdeveloper\b/g, `${prefix}developer`);
}

function appendOwnRequirementScopeFilter(clauses, params, user = {}, paramPrefix = 'scope') {
  return appendOwnRequirementScopeFilterWithAlias(clauses, params, user, paramPrefix);
}

function appendOwnRequirementScopeFilterWithAlias(clauses, params, user = {}, paramPrefix = 'scope', alias = '') {
  const keys = getUserScopeKeys(user);
  const userNames = [...new Set([keys.name, keys.username].filter(Boolean))];
  const structuredKeys = getUserStructuredKeys(user);
  const scopeParts = [];

  structuredKeys.forEach((key, index) => {
    params[`${paramPrefix}UserId${index}`] = key;
    params[`${paramPrefix}DeveloperId${index}`] = `%,${key.replace(/\s+/g, '')},%`;
    scopeParts.push(`submitterId = :${paramPrefix}UserId${index}`);
    scopeParts.push(`(',' || REPLACE(NVL(developerIds, ''), ' ', '') || ',') LIKE :${paramPrefix}DeveloperId${index}`);
  });

  userNames.forEach((name, index) => {
    params[`${paramPrefix}Name${index}`] = name;
    params[`${paramPrefix}Developer${index}`] = `%,${name.replace(/\s+/g, '')},%`;
    scopeParts.push(`((submitterId IS NULL OR TRIM(submitterId) IS NULL) AND submitter = :${paramPrefix}Name${index})`);
    scopeParts.push(`((developerIds IS NULL OR TRIM(developerIds) IS NULL) AND (',' || REPLACE(developer, ' ', '') || ',') LIKE :${paramPrefix}Developer${index})`);
  });

  const qualifiedScopeParts = alias
    ? scopeParts.map(part => qualifyRequirementScopeClause(part, alias))
    : scopeParts;
  clauses.push(qualifiedScopeParts.length ? `AND (${qualifiedScopeParts.join(' OR ')})` : 'AND 1 = 0');
}

function appendSubmitterScopeFilter(clauses, params, user = {}, paramPrefix = 'submitterScope') {
  return appendSubmitterScopeFilterWithAlias(clauses, params, user, paramPrefix);
}

function appendSubmitterScopeFilterWithAlias(clauses, params, user = {}, paramPrefix = 'submitterScope', alias = '') {
  const structuredKeys = getUserStructuredKeys(user);
  const userNames = getUserLegacyKeys(user);
  const scopeParts = [];

  structuredKeys.forEach((key, index) => {
    params[`${paramPrefix}UserId${index}`] = key;
    scopeParts.push(`submitterId = :${paramPrefix}UserId${index}`);
  });

  userNames.forEach((name, index) => {
    params[`${paramPrefix}Name${index}`] = name;
    scopeParts.push(`((submitterId IS NULL OR TRIM(submitterId) IS NULL) AND submitter = :${paramPrefix}Name${index})`);
  });

  const qualifiedScopeParts = alias
    ? scopeParts.map(part => qualifyRequirementScopeClause(part, alias))
    : scopeParts;
  clauses.push(qualifiedScopeParts.length ? `AND (${qualifiedScopeParts.join(' OR ')})` : 'AND 1 = 0');
}

function isDraftRequirement(requirement = {}) {
  const draftValue = requirement.isDraft ?? requirement.ISDRAFT;
  return draftValue === true || Number(draftValue) === 1;
}

function isRequirementSubmitter(user = {}, requirement = {}) {
  const submitterId = String(requirement.submitterId || requirement.SUBMITTERID || '').trim();
  if (submitterId) {
    return getUserStructuredKeys(user).includes(submitterId);
  }

  const submitter = String(requirement.submitter || requirement.SUBMITTER || '').trim();
  return Boolean(submitter) && getUserLegacyKeys(user).includes(submitter);
}

function isRequirementAssignedDeveloper(user = {}, requirement = {}) {
  const developerIds = normalizeDeveloperIdentifiers(requirement.developerIds || requirement.DEVELOPERIDS);
  const developerNames = normalizeDeveloperNames(requirement.developer || requirement.DEVELOPER);
  const structuredKeys = getUserStructuredKeys(user);
  const legacyKeys = getUserLegacyKeys(user);

  return developerIds.some(developerId => structuredKeys.includes(developerId))
    || developerNames.some(developerName => legacyKeys.includes(developerName));
}

function canUserViewRequirement(user = {}, requirement = {}) {
  const scope = resolveRequirementViewScope(user);
  if (scope.type === 'all') return true;

  if (isDraftRequirement(requirement)) {
    return isRequirementSubmitter(user, requirement);
  }

  if (isDeveloperRole(user.role)) {
    return isRequirementSubmitter(user, requirement) || isRequirementAssignedDeveloper(user, requirement);
  }

  return isRequirementSubmitter(user, requirement);
}

function canUserEditRequirement(user = {}, requirement = {}) {
  if (isAdminUser(user)) return true;
  return isRequirementSubmitter(user, requirement);
}

function canUserUpdateRequirementStatus(user = {}, requirement = {}) {
  if (isAdminUser(user)) return true;
  return isDeveloperRole(user.role) && isRequirementAssignedDeveloper(user, requirement);
}

function canUserScoreRequirement(user = {}, requirement = {}) {
  return canUserUpdateRequirementStatus(user, requirement);
}

function canUserManageRequirementAttachment(user = {}, requirement = {}) {
  return canUserUpdateRequirementStatus(user, requirement) || isRequirementSubmitter(user, requirement);
}

function sanitizeRequirementUpdatePayload(data = {}, user = {}, currentRequirement = {}) {
  if (isAdminUser(user)) return { ...data };

  const next = { ...data };
  const restrictedFields = [
    'submitter',
    'submitterId',
    'status',
    'approvalStatus',
    'approvalComment',
    'score',
    'publishedAt',
    'actualDate'
  ];

  if (!isDraftRequirement(currentRequirement)) {
    restrictedFields.push('isDraft');
  }

  restrictedFields.forEach((field) => {
    delete next[field];
  });

  return next;
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
    submitterId: row.SUBMITTERID,
    developer: row.DEVELOPER,
    developerIds: row.DEVELOPERIDS,
    platform: row.PLATFORM,
    capability: row.CAPABILITY,
    expectedDate: row.EXPECTEDDATE,
    actualDate: row.ACTUALDATE,
    avgDevTime: row.AVGDEVTIME,
    postDevAvgTime: row.POSTDEVAVGTIME,
    avgMonthlyCalls: row.AVGMONTHLYCALLS,
    senderEmail: row.SENDEREMAIL,
    ccEmails: ccJson ? JSON.parse(ccJson) : [],
    priority: row.PRIORITY,
    score: resolveStoredRequirementScore(row, consistentState.status),
    status: consistentState.status,
    isDraft: row.ISDRAFT,
    steps: stepsJson ? JSON.parse(stepsJson) : [],
    noteImages: noteJson ? JSON.parse(noteJson) : [],
    approvalStatus: consistentState.approvalStatus,
    approvalComment: approvalJson,
    publishedAt: row.PUBLISHEDAT,
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

async function parseRows(rows) {
  return Promise.all(rows.map(parseRow));
}

async function parseApprovalRow(row) {
  const [desc, approvalComment] = await Promise.all([
    readLobContent(row.DESCRIPTION),
    readLobContent(row.APPROVALCOMMENT)
  ]);

  const consistentState = getConsistentRequirementState({
    status: row.STATUS,
    approvalStatus: row.APPROVALSTATUS
  });

  return {
    id: row.ID,
    title: row.TITLE || '',
    description: desc || '',
    submitter: row.SUBMITTER || '',
    submitterId: row.SUBMITTERID || '',
    developer: row.DEVELOPER || '',
    developerIds: row.DEVELOPERIDS || '',
    expectedDate: row.EXPECTEDDATE,
    actualDate: row.ACTUALDATE,
    priority: row.PRIORITY || '低',
    status: consistentState.status,
    approvalStatus: consistentState.approvalStatus || 'pending',
    approvalComment: approvalComment || '',
    createdAt: row.CREATEDAT,
    updatedAt: row.UPDATEDAT
  };
}

async function parseApprovalRows(rows = []) {
  return Promise.all(rows.map(parseApprovalRow));
}

function parseGanttRow(row) {
  const status = row.STATUS;

  return {
    id: row.ID,
    title: row.TITLE,
    submitter: row.SUBMITTER,
    submitterId: row.SUBMITTERID,
    developer: row.DEVELOPER,
    developerIds: row.DEVELOPERIDS,
    platform: row.PLATFORM,
    capability: row.CAPABILITY,
    expectedDate: row.EXPECTEDDATE,
    actualDate: row.ACTUALDATE,
    priority: row.PRIORITY,
    score: resolveStoredRequirementScore(row, status),
    status,
    approvalStatus: row.APPROVALSTATUS,
    publishedAt: row.PUBLISHEDAT,
    approvedAt: row.APPROVEDAT,
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

function valueOrCurrent(value, currentValue) {
  if (value === undefined || value === null || value === '') return currentValue;
  return value;
}

function rowValue(row = {}, ...fields) {
  for (const field of fields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      return row[field];
    }
  }
  return null;
}

function resolveStoredRequirementScore(row = {}, status) {
  const normalizedStatus = String(status || rowValue(row, 'STATUS', 'status') || '').trim();
  return normalizedStatus === STATUS.RELEASED ? (rowValue(row, 'SCORE', 'score') ?? 0) : 0;
}

function getScoringInputFromRow(row = {}) {
  return {
    avgMonthlyCalls: rowValue(row, 'AVGMONTHLYCALLS', 'avgMonthlyCalls'),
    capability: rowValue(row, 'CAPABILITY', 'capability'),
    priority: rowValue(row, 'PRIORITY', 'priority'),
    avgDevTime: rowValue(row, 'AVGDEVTIME', 'avgDevTime'),
    postDevAvgTime: rowValue(row, 'POSTDEVAVGTIME', 'postDevAvgTime'),
    expectedDate: rowValue(row, 'EXPECTEDDATE', 'expectedDate'),
    actualDate: rowValue(row, 'ACTUALDATE', 'actualDate'),
    status: rowValue(row, 'STATUS', 'status'),
    publishedAt: rowValue(row, 'PUBLISHEDAT', 'publishedAt'),
    updatedAt: rowValue(row, 'UPDATEDAT', 'updatedAt')
  };
}

function getNextScoringInput(row = {}, data = {}) {
  const current = getScoringInputFromRow(row);
  return {
    avgMonthlyCalls: valueOrCurrent(data.avgMonthlyCalls, current.avgMonthlyCalls),
    capability: valueOrCurrent(data.capability, current.capability),
    priority: valueOrCurrent(data.priority, current.priority),
    avgDevTime: valueOrCurrent(data.avgDevTime, current.avgDevTime),
    postDevAvgTime: valueOrCurrent(data.postDevAvgTime, current.postDevAvgTime),
    expectedDate: valueOrCurrent(data.expectedDate, current.expectedDate),
    actualDate: valueOrCurrent(data.actualDate, current.actualDate),
    status: valueOrCurrent(data.status, current.status),
    publishedAt: valueOrCurrent(data.publishedAt, current.publishedAt),
    updatedAt: valueOrCurrent(data.updatedAt, current.updatedAt),
    publishDate: data.publishDate,
    releaseAt: data.releaseAt,
    releaseDate: data.releaseDate
  };
}

function hasScoringFieldChange(data = {}) {
  return SCORING_FIELDS.some((field) => data[field] !== undefined);
}

function isReleasedScoringInput(input = {}) {
  const status = rowValue(input, 'STATUS', 'status');
  return String(status || '').trim() === STATUS.RELEASED;
}

function hasKnownStatus(input = {}) {
  return rowValue(input, 'STATUS', 'status') !== null;
}

function resolveRequirementScore(data = {}, row = null) {
  if (data.score !== undefined && data.score !== null && data.score !== '') {
    return data.score;
  }
  const rowIsDraft = rowValue(row || {}, 'ISDRAFT', 'isDraft');
  const rowScore = rowValue(row || {}, 'SCORE', 'score');
  if (data.isDraft === true) {
    return row ? (rowScore ?? 0) : 0;
  }
  if (rowIsDraft && data.isDraft !== false) {
    return rowScore ?? 0;
  }
  const scoringInput = row ? getNextScoringInput(row, data) : data;
  if (!row || rowIsDraft || hasScoringFieldChange(data)) {
    if (!isReleasedScoringInput(scoringInput)) {
      return 0;
    }
    return calculateRequirementScore(scoringInput);
  }
  if (hasKnownStatus(scoringInput) && !isReleasedScoringInput(scoringInput)) {
    return 0;
  }
  return rowScore ?? 0;
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

function buildRequirementLifecycleTiming({ requirement = {}, auditLogs = [] } = {}) {
  const logs = (auditLogs || [])
    .filter((log) => getAuditCreatedAt(log))
    .sort((a, b) => getAuditCreatedAt(a) - getAuditCreatedAt(b));

  const approvalLog = logs.find((log) => {
    const body = getAuditBody(log);
    return getAuditAction(log) === 'approve' && body.approved === true;
  });
  const testingLog = logs.find((log) => {
    const body = getAuditBody(log);
    return getAuditAction(log) === 'update_status' && body.status === STATUS.IN_TEST;
  });
  const releaseLog = logs.find((log) => {
    const body = getAuditBody(log);
    return getAuditAction(log) === 'update_status' && body.status === STATUS.RELEASED;
  });

  const approvedAt = getAuditCreatedAt(approvalLog);
  const testingAt = getAuditCreatedAt(testingLog);
  const releasedAt = getAuditCreatedAt(releaseLog) ||
    (requirement.status === STATUS.RELEASED ? toDate(requirement.publishedAt) || toDate(requirement.updatedAt) : null);

  return {
    approvedAt,
    testingAt,
    releasedAt,
    preDevelopmentHours: approvedAt && testingAt && testingAt >= approvedAt
      ? (testingAt - approvedAt) / (1000 * 60 * 60)
      : null,
    postDevelopmentHours: testingAt && releasedAt && releasedAt >= testingAt
      ? (releasedAt - testingAt) / (1000 * 60 * 60)
      : null
  };
}

async function parseDashboardAuditRows(rows = []) {
  return Promise.all((rows || []).map(async (row) => {
    const details = row.DETAILSTEXT || await readLobContent(row.DETAILS);
    return {
      action: row.ACTION,
      resourceId: row.RESOURCEID,
      details: details ? JSON.parse(details) : null,
      createdAt: row.CREATEDAT
    };
  }));
}

function isActiveRequirementStatus(status) {
  return Boolean(status) && status !== STATUS.RELEASED;
}

function buildDeveloperLoadMap(requirements = []) {
  const loadMap = new Map();

  requirements.forEach((requirement) => {
    if (!isActiveRequirementStatus(requirement.status)) return;

    const developerIds = normalizeDeveloperIdentifiers(requirement.developerIds);
    const developerNames = normalizeDeveloperNames(requirement.developer);
    const count = Math.max(developerIds.length, developerNames.length);

    for (let index = 0; index < count; index += 1) {
      [developerIds[index], developerNames[index]]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .forEach((key) => {
          loadMap.set(key, (loadMap.get(key) || 0) + 1);
        });
    }
  });

  return loadMap;
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

  const liveDeveloperLoadMap = buildDeveloperLoadMap(requirements);
  const developerHeatmap = developerLoadStats
    .map((item) => {
      const liveCurrentLoad = liveDeveloperLoadMap.get(String(item.id || '').trim())
        ?? liveDeveloperLoadMap.get(String(item.userId || '').trim())
        ?? liveDeveloperLoadMap.get(String(item.name || '').trim())
        ?? 0;
      const maxLoad = Number(item.maxLoad || 0);
      const loadPercent = maxLoad ? roundToOne((liveCurrentLoad / maxLoad) * 100) : 0;
      return {
        ...item,
        currentLoad: liveCurrentLoad,
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

function escapeLikeKeyword(value) {
  return String(value).trim().toLowerCase().replace(/[\\%_]/g, (match) => '\\' + match);
}

function normalizeDeveloperNames(value) {
  const values = Array.isArray(value) ? value : [value];
  const names = [];

  values.forEach((item) => {
    if (item === undefined || item === null) return;
    String(item)
      .split(/[,;，；]+/)
      .map(name => name.trim())
      .filter(Boolean)
      .forEach((name) => {
        if (!names.includes(name)) {
          names.push(name);
        }
      });
  });

  return names;
}

function getDeveloperName(item) {
  if (item && typeof item === 'object') {
    return String(item.name || item.label || item.username || item.userId || item.id || '').trim();
  }
  return String(item || '').trim();
}

function getDeveloperIdentifier(item) {
  if (item && typeof item === 'object') {
    return String(item.userId || item.id || item.username || item.value || item.name || '').trim();
  }
  return String(item || '').trim();
}

function normalizeDeveloperIdentifiers(value) {
  const values = Array.isArray(value) ? value : [value];
  const identifiers = [];

  values.forEach((item) => {
    if (item === undefined || item === null) return;
    if (item && typeof item === 'object') {
      const identifier = getDeveloperIdentifier(item);
      if (identifier && !identifiers.includes(identifier)) {
        identifiers.push(identifier);
      }
      return;
    }

    String(item)
      .split(/[,;，；]+/)
      .map(identifier => identifier.trim())
      .filter(Boolean)
      .forEach((identifier) => {
        if (!identifiers.includes(identifier)) {
          identifiers.push(identifier);
        }
      });
  });

  return identifiers;
}

function serializeDeveloperNames(value) {
  const values = Array.isArray(value) ? value : [value];
  const names = [];

  values.forEach((item) => {
    if (item === undefined || item === null) return;
    if (item && typeof item === 'object') {
      const name = getDeveloperName(item);
      if (name && !names.includes(name)) {
        names.push(name);
      }
      return;
    }

    String(item)
      .split(/[,;，；]+/)
      .map(name => name.trim())
      .filter(Boolean)
      .forEach((name) => {
        if (!names.includes(name)) {
          names.push(name);
        }
      });
  });

  return names.join(', ');
}

function serializeDeveloperIdentifiers(value) {
  return normalizeDeveloperIdentifiers(value).join(', ');
}

function canUserDeleteRequirement(user = {}, requirement = {}) {
  if (isAdminUser(user)) {
    return true;
  }

  if (isDraftRequirement(requirement)) {
    return isRequirementSubmitter(user, requirement);
  }

  return isDeveloperRole(user.role) && isRequirementAssignedDeveloper(user, requirement);
}

async function resolveRequirementContactEmails(connection, requirement = {}) {
  const submitterId = String(requirement.submitterId || '').trim();
  const submitterName = String(requirement.submitter || '').trim();
  const developerIds = normalizeDeveloperIdentifiers(requirement.developerIds);
  const developerNames = normalizeDeveloperNames(requirement.developer);
  const contactKeys = [
    submitterId,
    submitterName,
    ...developerIds,
    ...developerNames
  ];
  const uniqueContactKeys = [...new Set(contactKeys.filter(Boolean))];

  if (uniqueContactKeys.length === 0) {
    return { submitterEmail: '', developerEmails: [] };
  }

  const binds = {};
  const clauses = uniqueContactKeys.map((value, index) => {
    const key = `contactId${index}`;
    binds[key] = value;
    return `:${key}`;
  });

  const result = await connection.execute(
    `SELECT id, name, email FROM users WHERE id IN (${clauses.join(', ')}) OR name IN (${clauses.join(', ')})`,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const emailById = new Map(
    (result.rows || []).map(row => [String(row.ID || '').trim(), String(row.EMAIL || '').trim()])
  );
  const emailByName = new Map(
    (result.rows || []).map(row => [String(row.NAME || '').trim(), String(row.EMAIL || '').trim()])
  );

  return {
    submitterEmail: submitterId
      ? emailById.get(submitterId) || emailByName.get(submitterName) || ''
      : emailByName.get(submitterName) || '',
    developerEmails: developerNames
      .map((name, index) => emailById.get(developerIds[index]) || emailByName.get(name) || '')
      .filter(Boolean)
  };
}

function pickBinds(source, keys) {
  return keys.reduce((binds, key) => {
    binds[key] = source[key];
    return binds;
  }, {});
}

function appendDeveloperFilter(clauses, params, developer, paramKey = 'developerPattern') {
  const [developerName] = normalizeDeveloperNames(developer);
  if (!developerName) return;
  clauses.push(`AND (',' || REPLACE(developer, ' ', '') || ',') LIKE :${paramKey}`);
  params[paramKey] = `%,${
    developerName.replace(/\s+/g, '')
  },%`;
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
  appendDeveloperFilter(clauses, params, filters.developer);
  if (filters.keyword) {
    clauses.push(`AND (
      LOWER(title) LIKE :keyword ESCAPE '\\'
      OR LOWER(submitter) LIKE :keyword ESCAPE '\\'
      OR LOWER(developer) LIKE :keyword ESCAPE '\\'
      OR LOWER(status) LIKE :keyword ESCAPE '\\'
    )`);
    params.keyword = '%' + escapeLikeKeyword(filters.keyword) + '%';
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
  if (filters.isOverdue === 'early') {
    clauses.push('AND status = :earlyReleasedStatus');
    clauses.push('AND expectedDate IS NOT NULL');
    clauses.push('AND publishedAt IS NOT NULL');
    clauses.push('AND TRUNC(publishedAt) < TRUNC(expectedDate)');
    params.earlyReleasedStatus = STATUS.RELEASED;
  }
  if (filters.viewer) {
    appendRequirementScopeFilter(clauses, params, filters.viewer, 'viewer');
  }

  return {
    whereClause: clauses.join(' '),
    params
  };
}

function buildApprovalListFilters(filters = {}) {
  const clauses = ['WHERE isDraft = 0'];
  const params = {};

  if (filters.approvalStatus && filters.approvalStatus !== 'all') {
    clauses.push('AND approvalStatus = :approvalStatus');
    params.approvalStatus = filters.approvalStatus;
  }

  appendDeveloperFilter(clauses, params, filters.developer);

  if (filters.keyword) {
    clauses.push(`AND (
      LOWER(title) LIKE :keyword ESCAPE '\\'
      OR LOWER(submitter) LIKE :keyword ESCAPE '\\'
    )`);
    params.keyword = '%' + escapeLikeKeyword(filters.keyword) + '%';
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

async function getBySubmitterUser(user = {}, page = 1, pageSize = 20) {
  let connection;
  try {
    connection = await db.getConnection();
    const offset = (page - 1) * pageSize;
    const clauses = ['WHERE isDraft = 0'];
    const params = { offset, limit: offset + pageSize };
    appendSubmitterScopeFilter(clauses, params, user, 'submitter');
    const whereClause = clauses.join(' ');

    const result = await connection.execute(
      `SELECT * FROM (
        SELECT r.*, ROW_NUMBER() OVER (ORDER BY CREATEDAT DESC) as rn
        FROM requirements r
        ${whereClause}
      ) WHERE rn > :offset AND rn <= :limit`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseRows(await reconcileRequirementStates(connection, result.rows));

    const countParams = { ...params };
    delete countParams.offset;
    delete countParams.limit;
    const totalResult = await connection.execute(
      `SELECT COUNT(*) FROM requirements ${whereClause}`,
      countParams
    );
    const total = totalResult.rows[0][0];

    return { data, total, page, pageSize };
  } finally {
    if (connection) await connection.close();
  }
}

async function getDrafts(submitter) {
  return getDraftsBySubmitter(submitter);
}

async function getDraftsBySubmitter(submitter) {
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
  return getLatestDraftBySubmitter(submitter);
}

async function getLatestDraftBySubmitter(submitter) {
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

async function getDraftsByUser(user = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    const clauses = ['WHERE isDraft = 1'];
    const params = {};
    appendSubmitterScopeFilter(clauses, params, user, 'draftSubmitter');
    const result = await connection.execute(
      `SELECT * FROM requirements ${clauses.join(' ')} ORDER BY UPDATEDAT DESC`,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return await parseRows(result.rows);
  } finally {
    if (connection) await connection.close();
  }
}

async function getLatestDraftByUser(user = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    const clauses = ['WHERE isDraft = 1'];
    const params = {};
    appendSubmitterScopeFilter(clauses, params, user, 'draftSubmitter');
    const result = await connection.execute(
      `SELECT * FROM (SELECT * FROM requirements ${clauses.join(' ')} ORDER BY UPDATEDAT DESC) WHERE ROWNUM = 1`,
      params,
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
    const requirement = await parseRow(row);
    let auditLogs = [];

    try {
      const auditResult = await connection.execute(
        `SELECT action, resourceId, details, createdAt
         FROM audit_logs
         WHERE "resource" = 'requirement'
           AND resourceId = :id
           AND action IN ('approve', 'update_status')
         ORDER BY createdAt ASC`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      auditLogs = await parseDashboardAuditRows(auditResult.rows || []);
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00942')) {
        throw error;
      }
    }

    const contactEmails = await resolveRequirementContactEmails(connection, requirement);

    return {
      ...requirement,
      ...contactEmails,
      lifecycleTiming: buildRequirementLifecycleTiming({ requirement, auditLogs })
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();
    const developer = serializeDeveloperNames(data.developer);
    const developerIds = serializeDeveloperIdentifiers(data.developerIds ?? data.developer);
    
    const binds = {
      id,
      title: data.title,
      description: data.description || null,
      submitter: data.submitter,
      submitterId: data.submitterId || null,
      developer,
      developerIds,
      platform: data.platform,
      capability: data.capability,
      expectedDate: data.expectedDate ? (data.expectedDate instanceof Date ? data.expectedDate : new Date(data.expectedDate)) : null,
      actualDate: data.actualDate ? (data.actualDate instanceof Date ? data.actualDate : new Date(data.actualDate)) : null,
      avgDevTime: data.avgDevTime || null,
      postDevAvgTime: data.postDevAvgTime || null,
      avgMonthlyCalls: data.avgMonthlyCalls || null,
      senderEmail: data.senderEmail || null,
      ccEmails: data.ccEmails && data.ccEmails.length ? JSON.stringify(data.ccEmails) : null,
      priority: data.priority || '中',
      score: resolveRequirementScore(data),
      status: data.status || STATUS.PENDING_APPROVAL,
      isDraft: data.isDraft ? 1 : 0,
      steps: data.steps ? JSON.stringify(data.steps) : null,
      noteImages: data.noteImages && data.noteImages.length ? JSON.stringify(data.noteImages) : null,
      approvalStatus: data.approvalStatus || 'pending',
      approvalComment: data.approvalComment || null,
      publishedAt: data.publishedAt ? (data.publishedAt instanceof Date ? data.publishedAt : new Date(data.publishedAt)) : null
    };

    try {
      await connection.execute(
        `INSERT INTO requirements (
          id, title, description, submitter, submitterId, developer, developerIds, platform, capability,
          expectedDate, actualDate, avgDevTime, postDevAvgTime, avgMonthlyCalls, senderEmail, ccEmails,
          priority, score, status, isDraft, steps, noteImages,
          approvalStatus, approvalComment, publishedAt, CREATEDAT, UPDATEDAT
        ) VALUES (
          :id, :title, :description, :submitter, :submitterId, :developer, :developerIds, :platform,
          :capability, :expectedDate, :actualDate, :avgDevTime, :postDevAvgTime, :avgMonthlyCalls, :senderEmail,
          :ccEmails, :priority, :score, :status, :isDraft, :steps, :noteImages,
          :approvalStatus, :approvalComment, :publishedAt, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        pickBinds(binds, [
          'id', 'title', 'description', 'submitter', 'submitterId', 'developer',
          'developerIds', 'platform', 'capability', 'expectedDate', 'actualDate',
          'avgDevTime', 'postDevAvgTime', 'avgMonthlyCalls', 'senderEmail', 'ccEmails',
          'priority', 'score', 'status', 'isDraft', 'steps', 'noteImages',
          'approvalStatus', 'approvalComment', 'publishedAt'
        ])
      );
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00904')) {
        throw error;
      }
      await connection.execute(
        `INSERT INTO requirements (
          id, title, description, submitter, developer, platform, capability,
          expectedDate, actualDate, avgDevTime, postDevAvgTime, avgMonthlyCalls, senderEmail, ccEmails,
          priority, score, status, isDraft, steps, noteImages,
          approvalStatus, approvalComment, publishedAt, CREATEDAT, UPDATEDAT
        ) VALUES (
          :id, :title, :description, :submitter, :developer, :platform,
          :capability, :expectedDate, :actualDate, :avgDevTime, :postDevAvgTime, :avgMonthlyCalls, :senderEmail,
          :ccEmails, :priority, :score, :status, :isDraft, :steps, :noteImages,
          :approvalStatus, :approvalComment, :publishedAt, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        pickBinds(binds, [
          'id', 'title', 'description', 'submitter', 'developer', 'platform',
          'capability', 'expectedDate', 'actualDate', 'avgDevTime', 'postDevAvgTime',
          'avgMonthlyCalls', 'senderEmail', 'ccEmails', 'priority', 'score', 'status',
          'isDraft', 'steps', 'noteImages', 'approvalStatus', 'approvalComment', 'publishedAt'
        ])
      );
    }
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
    const developer = data.developer !== undefined ? serializeDeveloperNames(data.developer) : null;
    const developerIds = data.developer !== undefined || data.developerIds !== undefined
      ? serializeDeveloperIdentifiers(data.developerIds ?? data.developer)
      : null;
    
    const binds = {
      id,
      title: data.title || null,
      description: data.description || null,
      submitter: data.submitter || null,
      submitterId: data.submitterId || null,
      developer,
      developerIds,
      platform: data.platform || null,
      capability: data.capability || null,
      avgDevTime: data.avgDevTime || null,
      postDevAvgTime: data.postDevAvgTime || null,
      avgMonthlyCalls: data.avgMonthlyCalls || null,
      expectedDate: data.expectedDate ? (data.expectedDate instanceof Date ? data.expectedDate : new Date(data.expectedDate)) : null,
      actualDate: data.actualDate ? (data.actualDate instanceof Date ? data.actualDate : new Date(data.actualDate)) : null,
      priority: data.priority || null,
      score: resolveRequirementScore(data, row),
      status: data.status || null,
      isDraft: data.isDraft !== undefined ? (data.isDraft ? 1 : 0) : null,
      ccEmails,
      steps,
      noteImages,
      approvalStatus: data.approvalStatus || null,
      approvalComment: data.approvalComment || null
    };

    try {
      await connection.execute(
        `UPDATE requirements SET 
          title = NVL(:title, title),
          description = NVL(:description, description),
          submitter = NVL(:submitter, submitter),
          submitterId = NVL(:submitterId, submitterId),
          developer = NVL(:developer, developer),
          developerIds = NVL(:developerIds, developerIds),
          platform = NVL(:platform, platform),
          capability = NVL(:capability, capability),
          avgDevTime = NVL(:avgDevTime, avgDevTime),
          postDevAvgTime = NVL(:postDevAvgTime, postDevAvgTime),
          avgMonthlyCalls = NVL(:avgMonthlyCalls, avgMonthlyCalls),
          expectedDate = NVL(:expectedDate, expectedDate),
          actualDate = NVL(:actualDate, actualDate),
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
        pickBinds(binds, [
          'id', 'title', 'description', 'submitter', 'submitterId', 'developer',
          'developerIds', 'platform', 'capability', 'avgDevTime', 'postDevAvgTime',
          'avgMonthlyCalls', 'expectedDate', 'actualDate', 'priority', 'score',
          'status', 'isDraft', 'ccEmails', 'steps', 'noteImages', 'approvalStatus',
          'approvalComment'
        ])
      );
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00904')) {
        throw error;
      }
      await connection.execute(
        `UPDATE requirements SET 
          title = NVL(:title, title),
          description = NVL(:description, description),
          submitter = NVL(:submitter, submitter),
          developer = NVL(:developer, developer),
          platform = NVL(:platform, platform),
          capability = NVL(:capability, capability),
          avgDevTime = NVL(:avgDevTime, avgDevTime),
          postDevAvgTime = NVL(:postDevAvgTime, postDevAvgTime),
          avgMonthlyCalls = NVL(:avgMonthlyCalls, avgMonthlyCalls),
          expectedDate = NVL(:expectedDate, expectedDate),
          actualDate = NVL(:actualDate, actualDate),
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
        pickBinds(binds, [
          'id', 'title', 'description', 'submitter', 'developer', 'platform',
          'capability', 'avgDevTime', 'postDevAvgTime', 'avgMonthlyCalls',
          'expectedDate', 'actualDate', 'priority', 'score', 'status', 'isDraft',
          'ccEmails', 'steps', 'noteImages', 'approvalStatus', 'approvalComment'
        ])
      );
    }
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
    try {
      await connection.execute(
        `DELETE FROM requirement_attachment_versions
         WHERE attachmentId IN (
           SELECT id FROM requirement_attachments WHERE requirementId = :id
         )`,
        [id]
      );
      await connection.execute(
        `DELETE FROM requirement_attachments WHERE requirementId = :id`,
        [id]
      );
    } catch (error) {
      const message = String(error?.message || '');
      if (!message.includes('ORA-00942') && !message.includes('ORA-00904')) {
        throw error;
      }
    }
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
    if (status === STATUS.RELEASED) {
      const publishedAt = current.publishedAt || new Date();
      const nextScore = resolveRequirementScore({ status, publishedAt }, current);
      await connection.execute(
        `UPDATE requirements SET status = :status, score = :score, publishedAt = NVL(publishedAt, :publishedAt), UPDATEDAT = CURRENT_TIMESTAMP WHERE id = :id`,
        { status, score: nextScore, publishedAt, id }
      );
    } else {
      const nextScore = resolveRequirementScore({ status }, current);
      await connection.execute(
        `UPDATE requirements SET status = :status, score = :score, UPDATEDAT = CURRENT_TIMESTAMP WHERE id = :id`,
        { status, score: nextScore, id }
      );
    }
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

async function getApprovalList(userId, userRole, permissions = [], page = 1, pageSize = 50, filters = {}) {
  let connection;
  try {
    connection = await db.getConnection();

    const scope = resolveApprovalListScope({ role: userRole, permissions });
    if (scope.type === 'none') {
      return { data: [], total: 0, page, pageSize };
    }

    const normalizedFilters = {
      approvalStatus: filters.approvalStatus,
      keyword: filters.keyword
    };

    if (scope.type === 'assigned') {
      const userResult = await connection.execute(
        `SELECT name FROM users WHERE id = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (userResult.rows.length === 0) return { data: [], total: 0, page, pageSize };
      normalizedFilters.developer = userResult.rows[0].NAME;
    }

    const { whereClause, params } = buildApprovalListFilters(normalizedFilters);
    const offset = (page - 1) * pageSize;
    const result = await connection.execute(
      `SELECT id, title, description, submitter, submitterId, developer, developerIds, expectedDate, actualDate,
              priority, status, approvalStatus, approvalComment, createdAt, updatedAt
       FROM (
        SELECT r.id, r.title, r.description, r.submitter, r.submitterId, r.developer, r.developerIds, r.expectedDate, r.actualDate,
               r.priority, r.status, r.approvalStatus, r.approvalComment, r.createdAt, r.updatedAt,
               ROW_NUMBER() OVER (ORDER BY r.CREATEDAT DESC) as rn
       FROM (
          SELECT id, title, description, submitter, submitterId, developer, developerIds, expectedDate, actualDate,
                 priority, status, approvalStatus, approvalComment, createdAt, updatedAt
          FROM requirements
          ${whereClause}
        ) r
      ) WHERE rn > :offset AND rn <= :limit`,
      { ...params, offset, limit: offset + pageSize },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const data = await parseApprovalRows(await reconcileRequirementStates(connection, result.rows));

    const totalResult = await connection.execute(
      `SELECT COUNT(*) FROM requirements ${whereClause}`,
      params
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
    
    const clauses = ['WHERE isDraft = 0'];
    const params = {};
    
    if (filters.viewer) {
      const role = String(filters.viewer.role || '').trim();
      if (role !== 'admin' && role !== 'role-admin') {
        appendRequirementScopeFilterWithAlias(clauses, params, filters.viewer, 'ganttViewer', 'r');
      }
    } else if (filters.userRole !== 'admin') {
      const userResult = await connection.execute(
        `SELECT name FROM users WHERE id = :userId`,
        { userId: filters.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (userResult.rows.length > 0) {
        const userName = userResult.rows[0].NAME;
        clauses.push(`AND (submitter = :submitter OR (',' || REPLACE(developer, ' ', '') || ',') LIKE :developerPattern)`);
        params.submitter = userName;
        params.developerPattern = `%,${String(userName || '').replace(/\s+/g, '')},%`;
      } else {
        clauses.push('AND 1 = 0');
      }
    }
    
    if (filters.platform) {
      clauses.push('AND platform = :platform');
      params.platform = filters.platform;
    }
    if (filters.status) {
      clauses.push('AND status = :status');
      params.status = filters.status;
    }
    if (filters.developer) {
      const [developerName] = normalizeDeveloperNames(filters.developer);
      if (developerName) {
        clauses.push(`AND (',' || REPLACE(developer, ' ', '') || ',') LIKE :filterDeveloperPattern`);
        params.filterDeveloperPattern = `%,${developerName.replace(/\s+/g, '')},%`;
      }
    }
    
    const result = await connection.execute(
      `SELECT r.id, r.title, r.submitter, r.submitterId, r.developer, r.developerIds, r.platform, r.capability, 
              r.expectedDate, r.actualDate, r.priority, r.score, r.status, r.approvalStatus, r.publishedAt,
              (
                SELECT MIN(a.createdAt)
                FROM audit_logs a
                WHERE a.resourceId = r.id
                  AND a.action = 'approve'
                  AND DBMS_LOB.INSTR(a.details, '"approved":true') > 0
              ) AS approvedAt,
              r.createdAt, r.updatedAt
       FROM requirements r
       ${clauses.join(' ')}
       ORDER BY r.platform, r.createdAt ASC`,
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

async function getDashboardMetrics(viewer = null) {
  let connection;
  try {
    connection = await db.getConnection();

    const fields = 'ID, DEVELOPER, PLATFORM, STATUS, EXPECTEDDATE, CREATEDAT, UPDATEDAT';
    const clauses = ['WHERE isDraft = 0'];
    const params = {};
    if (viewer) {
      appendRequirementScopeFilter(clauses, params, viewer, 'dashboardViewer');
    }
    const whereClause = clauses.join(' ');
    const requirementsResult = await connection.execute(
      `SELECT ${fields}
       FROM requirements
       ${whereClause}`,
      params,
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
          `SELECT action, resourceId, DBMS_LOB.SUBSTR(details, 4000, 1) AS detailsText, createdAt
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
          `SELECT action, resourceId, DBMS_LOB.SUBSTR(details, 4000, 1) AS detailsText, createdAt
           FROM audit_logs
           WHERE resource = 'requirement'
             AND action IN ('approve', 'update_status')
           ORDER BY createdAt ASC`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      }

      auditLogs = await parseDashboardAuditRows(auditResult.rows || []);
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
         WHERE u.role IN ('developer', 'role-developer', 'admin', 'role-admin')
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

async function getAIContext(viewer = null) {
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
    score: resolveStoredRequirementScore(row, row.STATUS),
        expectedDate: fmt(row.EXPECTEDDATE),
        actualDate: fmt(row.ACTUALDATE),
        createdAt: fmt(row.CREATEDAT),
        updatedAt: fmt(row.UPDATEDAT)
      };
    };

    const fields = 'ID, TITLE, SUBMITTER, SUBMITTERID, DEVELOPER, DEVELOPERIDS, PLATFORM, CAPABILITY, PRIORITY, STATUS, SCORE, EXPECTEDDATE, ACTUALDATE, CREATEDAT, UPDATEDAT';
    const baseClauses = ['WHERE isDraft = 0'];
    const baseParams = {};
    if (viewer) {
      appendRequirementScopeFilter(baseClauses, baseParams, viewer, 'aiViewer');
    }
    const visibleWhereClause = baseClauses.join(' ');
    const visibleWhereClauseForRequirementAlias = visibleWhereClause
      .replace(/\bsubmitterId\b/g, 'r.submitterId')
      .replace(/\bdeveloperIds\b/g, 'r.developerIds')
      .replace(/\bsubmitter\b/g, 'r.submitter')
      .replace(/\bdeveloper\b/g, 'r.developer');

    const recentNewResult = await connection.execute(
      `SELECT ${fields} FROM requirements ${visibleWhereClause} AND CREATEDAT >= SYSDATE - 7 ORDER BY CREATEDAT DESC`,
      baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const recentChangesResult = await connection.execute(
      `SELECT ${fields} FROM requirements ${visibleWhereClause} AND UPDATEDAT >= SYSDATE - 7 AND CREATEDAT < SYSDATE - 7 ORDER BY UPDATEDAT DESC`,
      baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const activeResult = await connection.execute(
      `SELECT ${fields} FROM requirements ${visibleWhereClause} AND STATUS != '已发布' ORDER BY PRIORITY DESC, CREATEDAT ASC`,
      baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const overdueResult = await connection.execute(
      `SELECT ${fields} FROM requirements ${visibleWhereClause} AND EXPECTEDDATE IS NOT NULL AND EXPECTEDDATE <= SYSDATE + 3 AND STATUS != '已发布' ORDER BY EXPECTEDDATE ASC`,
      baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const allResult = await connection.execute(
      `SELECT ${fields} FROM requirements ${visibleWhereClause} ORDER BY CREATEDAT DESC`,
      baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
           AND EXISTS (
             SELECT 1 FROM requirements r
             ${visibleWhereClauseForRequirementAlias}
               AND r.id = c.REQUIREMENTID
           )
         ORDER BY c.CREATEDAT DESC`,
        baseParams, { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
  getBySubmitterUser,
  getDrafts,
  getDraftsBySubmitter,
  getDraftsByUser,
  getLatestDraft,
  getLatestDraftBySubmitter,
  getLatestDraftByUser,
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
  buildRequirementLifecycleTiming,
  parseDashboardAuditRows,
  resolveApprovalListScope,
  getConsistentRequirementState,
  normalizeDeveloperNames,
  normalizeDeveloperIdentifiers,
  serializeDeveloperNames,
  serializeDeveloperIdentifiers,
  canUserViewRequirement,
  canUserEditRequirement,
  canUserUpdateRequirementStatus,
  canUserScoreRequirement,
  canUserManageRequirementAttachment,
  canUserDeleteRequirement,
  sanitizeRequirementUpdatePayload,
  isAdminUser,
  isRequirementSubmitter,
  isRequirementAssignedDeveloper,
  resolveStoredRequirementScore,
  resolveRequirementScore,
  STATUS,
  STATUS_ORDER,
  getNextStatuses,
  buildRequirementListFilters,
  buildApprovalListFilters,
  buildSummaryQueryParts
};

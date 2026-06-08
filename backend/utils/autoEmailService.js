const db = require('../db/oracle');
const { driver: oracledb } = require('../db/oracle');
const emailSettingModel = require('../models/emailSetting');
const { createEmailDigestService, uniqueEmails } = require('./emailDigestService');
const { sendEmail } = require('./emailSender');
const { normalizeDeveloperNames } = require('../models/requirement');

const digestService = createEmailDigestService({
  getIntervalMinutes: async () => (await emailSettingModel.getSettings()).sendIntervalMinutes,
  sendEmail
});

function uniqueValues(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean))];
}

function normalizeIdentifiers(value) {
  const values = Array.isArray(value) ? value : [value];
  const identifiers = [];

  values.forEach((item) => {
    if (item === undefined || item === null) return;
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

function getRequirementParticipantIds(row = {}) {
  return uniqueValues([
    row.SUBMITTERID,
    ...normalizeIdentifiers(row.DEVELOPERIDS)
  ]);
}

function parseCcEmails(value) {
  if (!value) return [];
  if (Array.isArray(value)) return uniqueEmails(value);
  try {
    const parsed = JSON.parse(value);
    return uniqueEmails(parsed);
  } catch (error) {
    return uniqueEmails(String(value).split(/[,;，；\s]+/));
  }
}

async function getUserEmailsByNames(connection, names) {
  const uniqueNames = uniqueValues(names);
  if (!uniqueNames.length) return [];

  const binds = {};
  const placeholders = uniqueNames.map((name, index) => {
    const key = `name${index}`;
    binds[key] = name;
    return `:${key}`;
  });

  const result = await connection.execute(
    `SELECT name, email FROM users WHERE name IN (${placeholders.join(', ')}) AND email IS NOT NULL`,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const emailByName = new Map();
  (result.rows || []).forEach(row => {
    const name = String(row.NAME || '').trim();
    const email = String(row.EMAIL || '').trim();
    if (name && email && !emailByName.has(name)) {
      emailByName.set(name, email);
    }
  });
  return uniqueEmails(uniqueNames.map(name => emailByName.get(name)));
}

async function getAssignableDeveloperEmailsByNames(connection, names) {
  const uniqueNames = uniqueValues(names);
  if (!uniqueNames.length) return [];

  const binds = {};
  const placeholders = uniqueNames.map((name, index) => {
    const key = `developerName${index}`;
    binds[key] = name;
    return `:${key}`;
  });

  const result = await connection.execute(
    `SELECT name, email
     FROM users
     WHERE name IN (${placeholders.join(', ')})
       AND role IN ('developer', 'role-developer', 'admin', 'role-admin')
       AND status = 1
       AND email IS NOT NULL`,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const emailByName = new Map();
  (result.rows || []).forEach(row => {
    const name = String(row.NAME || '').trim();
    const email = String(row.EMAIL || '').trim();
    if (name && email && !emailByName.has(name)) {
      emailByName.set(name, email);
    }
  });
  return uniqueEmails(uniqueNames.map(name => emailByName.get(name)));
}

async function getUserEmailsByIds(connection, ids) {
  const uniqueIds = uniqueValues(ids);
  if (!uniqueIds.length) return [];

  const binds = {};
  const placeholders = uniqueIds.map((id, index) => {
    const key = `userId${index}`;
    binds[key] = id;
    return `:${key}`;
  });

  const result = await connection.execute(
    `SELECT id, username, email FROM users WHERE id IN (${placeholders.join(', ')}) AND email IS NOT NULL`,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const emailById = new Map();
  (result.rows || []).forEach(row => {
    const id = String(row.ID || '').trim();
    const email = String(row.EMAIL || '').trim();
    if (id && email && !emailById.has(id)) {
      emailById.set(id, email);
    }
  });
  return uniqueEmails(uniqueIds.map(id => emailById.get(id)));
}

async function getRequirementMailContext(requirementId, options = {}) {
  let connection;
  try {
    connection = await db.getConnection();
    let result;
    try {
      result = await connection.execute(
        `SELECT id, title, submitter, submitterId, developer, developerIds FROM requirements WHERE id = :id`,
        { id: requirementId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } catch (error) {
      if (!String(error?.message || '').includes('ORA-00904')) {
        throw error;
      }
      result = await connection.execute(
        `SELECT id, title, submitter, developer FROM requirements WHERE id = :id`,
        { id: requirementId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    }
    const row = result.rows?.[0];
    if (!row) return null;
    const actorId = String(options.actorId || '').trim();
    const actorName = String(options.actorName || '').trim();
    const participantIds = getRequirementParticipantIds(row)
      .filter(id => id !== actorId);
    const submitterName = String(row.SUBMITTER || '').trim();
    const developerNames = normalizeDeveloperNames(row.DEVELOPER)
      .filter(name => name !== actorName);

    const idEmails = await getUserEmailsByIds(connection, participantIds);
    const submitterFallbackEmails = row.SUBMITTERID || !submitterName || submitterName === actorName
      ? []
      : await getUserEmailsByNames(connection, [submitterName]);
    const developerFallbackEmails = await getAssignableDeveloperEmailsByNames(connection, developerNames);
    const to = uniqueEmails([
      ...idEmails,
      ...submitterFallbackEmails,
      ...developerFallbackEmails
    ]);
    return {
      id: row.ID,
      title: row.TITLE,
      to,
      cc: []
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function getRequirementCreatedMailContext(requirementId, options = {}) {
  return getRequirementMailContext(requirementId, options);
}

async function enqueueRequirementEvent({ requirement, requirementId, eventType, actorId, actorName, summary }) {
  const id = requirementId || requirement?.id;
  let context = id ? await getRequirementMailContext(id, { actorId, actorName }) : null;

  if (!context && requirement) {
    const recipientNames = uniqueValues([
      requirement.submitter,
      ...normalizeDeveloperNames(requirement.developer)
    ]).filter(name => name !== String(actorName || '').trim());
    context = {
      id: requirement.id,
      title: requirement.title,
      to: uniqueEmails(recipientNames),
      cc: []
    };
  }

  if (!context?.to?.length) {
    return { queued: false, reason: 'missing recipient' };
  }

  return digestService.enqueue({
    to: context.to,
    cc: context.cc,
    eventType,
    actorName,
    requirementTitle: context.title || requirement?.title,
    summary
  });
}

async function enqueueRequirementCreatedEvent({ requirement, requirementId, actorId, actorName, summary }) {
  const id = requirementId || requirement?.id;
  const context = await getRequirementCreatedMailContext(id, { actorId, actorName });

  if (!context?.to?.length) {
    return { queued: false, reason: 'missing recipient' };
  }

  return digestService.enqueue({
    to: context.to,
    cc: context.cc,
    eventType: 'requirement_created',
    actorName,
    requirementTitle: context.title || requirement?.title,
    summary
  });
}

module.exports = {
  digestService,
  enqueueRequirementCreatedEvent,
  enqueueRequirementEvent,
  getRequirementCreatedMailContext,
  getRequirementMailContext,
  parseCcEmails
};

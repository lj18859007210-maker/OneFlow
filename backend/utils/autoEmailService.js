const db = require('../db/oracle');
const oracledb = require('oracledb');
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

function getRequirementParticipantNames(row = {}) {
  return uniqueValues([
    row.SUBMITTER,
    ...normalizeDeveloperNames(row.DEVELOPER)
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

async function getUserEmailsByPermission(connection, permissionCode) {
  const result = await connection.execute(
    `SELECT DISTINCT u.email
     FROM users u
     INNER JOIN role_permissions rp ON rp.roleId = CASE
       WHEN u.role LIKE 'role-%' THEN u.role
       ELSE 'role-' || u.role
     END
     INNER JOIN permissions p ON p.id = rp.permissionId
     WHERE p.code = :permissionCode
       AND u.status = 1
       AND u.email IS NOT NULL`,
    { permissionCode },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return uniqueEmails((result.rows || []).map(row => row.EMAIL));
}

async function getRequirementMailContext(requirementId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT id, title, senderEmail, ccEmails, submitter, developer FROM requirements WHERE id = :id`,
      { id: requirementId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const row = result.rows?.[0];
    if (!row) return null;
    const userEmails = await getUserEmailsByNames(connection, getRequirementParticipantNames(row));
    const to = userEmails.slice(0, 1);
    const cc = uniqueEmails([
      row.SENDEREMAIL,
      ...parseCcEmails(row.CCEMAILS),
      ...userEmails.filter(email => !to.includes(email))
    ]);
    return {
      id: row.ID,
      title: row.TITLE,
      to,
      cc
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function getRequirementCreatedMailContext(requirementId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT id, title, senderEmail, ccEmails, submitter, developer FROM requirements WHERE id = :id`,
      { id: requirementId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const row = result.rows?.[0];
    if (!row) return null;
    const approverEmails = await getUserEmailsByPermission(connection, 'requirement:approve');
    const participantEmails = await getUserEmailsByNames(connection, getRequirementParticipantNames(row));
    const to = approverEmails;
    const cc = uniqueEmails([
      row.SENDEREMAIL,
      ...parseCcEmails(row.CCEMAILS),
      ...participantEmails.filter(email => !to.includes(email))
    ]);
    return {
      id: row.ID,
      title: row.TITLE,
      to,
      cc
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function enqueueRequirementEvent({ requirement, requirementId, eventType, actorName, summary }) {
  const id = requirementId || requirement?.id;
  let context = id ? await getRequirementMailContext(id) : null;

  if (!context && requirement) {
    context = {
      id: requirement.id,
      title: requirement.title,
      to: uniqueEmails(requirement.senderEmail),
      cc: parseCcEmails(requirement.ccEmails)
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

async function enqueueRequirementCreatedEvent({ requirement, requirementId, actorName, summary }) {
  const id = requirementId || requirement?.id;
  const context = await getRequirementCreatedMailContext(id);

  if (!context?.to?.length) {
    return { queued: false, reason: 'missing approver recipient' };
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

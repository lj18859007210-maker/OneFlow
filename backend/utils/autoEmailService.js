const db = require('../db/oracle');
const oracledb = require('oracledb');
const emailSettingModel = require('../models/emailSetting');
const { createEmailDigestService, uniqueEmails } = require('./emailDigestService');
const { sendEmail } = require('./emailSender');

const digestService = createEmailDigestService({
  getIntervalMinutes: async () => (await emailSettingModel.getSettings()).sendIntervalMinutes,
  sendEmail
});

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

async function getRequirementMailContext(requirementId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT id, title, senderEmail, ccEmails FROM requirements WHERE id = :id`,
      { id: requirementId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const row = result.rows?.[0];
    if (!row) return null;
    return {
      id: row.ID,
      title: row.TITLE,
      to: uniqueEmails(row.SENDEREMAIL),
      cc: parseCcEmails(row.CCEMAILS)
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function enqueueRequirementEvent({ requirement, requirementId, eventType, actorName, summary }) {
  let context = requirement
    ? {
        id: requirement.id,
        title: requirement.title,
        to: uniqueEmails(requirement.senderEmail),
        cc: parseCcEmails(requirement.ccEmails)
      }
    : null;

  if (!context?.to?.length) {
    context = await getRequirementMailContext(requirementId || requirement?.id);
  }

  if (!context?.to?.length) {
    return { queued: false, reason: 'missing recipient' };
  }

  return digestService.enqueue({
    to: context.to,
    cc: context.cc,
    eventType,
    actorName,
    requirementTitle: context.title,
    summary
  });
}

module.exports = {
  digestService,
  enqueueRequirementEvent,
  getRequirementMailContext,
  parseCcEmails
};

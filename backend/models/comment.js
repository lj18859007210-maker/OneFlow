const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');
const attachmentModel = require('./attachment');
const { splitLegacyCommentContent, mergeCommentRecord } = require('../utils/commentAttachments');

async function parseRow(row) {
  const rawContent = await db.readLob(row.CONTENT);
  const { content, legacyAttachments } = splitLegacyCommentContent(rawContent);
  return {
    id: row.ID,
    requirementId: row.REQUIREMENTID,
    userId: row.USERID,
    userName: row.USERNAME,
    userRole: row.USERROLE,
    type: row.TYPE,
    content,
    legacyAttachments,
    createdAt: row.CREATEDAT
  };
}

async function create(data) {
  let connection;
  try {
    connection = await db.getConnection();
    const id = uuidv4();

    await connection.execute(
      `INSERT INTO requirement_comments (
        id, requirementId, userId, userName, userRole, type, content, createdAt
      ) VALUES (
        :id, :requirementId, :userId, :userName, :userRole, :type, :content, CURRENT_TIMESTAMP
      )`,
      {
        id,
        requirementId: data.requirementId,
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        type: data.type,
        content: data.content
      }
    );

    await attachmentModel.attachPendingCommentAttachments(connection, {
      commentId: id,
      requirementId: data.requirementId,
      attachmentIds: data.attachmentIds || [],
      createdBy: data.userId
    });

    await connection.commit();

    return await getById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function getById(id) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT * FROM requirement_comments WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return null;
    const comment = await parseRow(result.rows[0]);
    const attachments = await attachmentModel.listCommentAttachmentsByCommentId(comment.id, connection);
    return mergeCommentRecord(comment, attachments, comment.legacyAttachments);
  } finally {
    if (connection) await connection.close();
  }
}

async function getByRequirementId(requirementId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT * FROM requirement_comments
       WHERE requirementId = :requirementId
       ORDER BY createdAt ASC`,
      { requirementId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const comments = [];
    for (const row of result.rows || []) {
      const comment = await parseRow(row);
      const attachments = await attachmentModel.listCommentAttachmentsByCommentId(comment.id, connection);
      comments.push(mergeCommentRecord(comment, attachments, comment.legacyAttachments));
    }
    return comments;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  create,
  getById,
  getByRequirementId
};

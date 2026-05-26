const { v4: uuidv4 } = require('uuid');
const oracledb = require('oracledb');
const db = require('../db/oracle');
const { ATTACHMENT_CATEGORIES, createAttachmentSummary } = require('../utils/attachmentPolicy');
const { buildAttachmentFileRoute } = require('../utils/attachmentStorage');

function ensureValidCategory(category) {
  if (!ATTACHMENT_CATEGORIES.includes(category)) {
    throw new Error(`Invalid attachment category: ${category}`);
  }
}

async function withConnection(existingConnection) {
  if (existingConnection) {
    return { connection: existingConnection, ownsConnection: false };
  }
  return { connection: await db.getConnection(), ownsConnection: true };
}

async function releaseConnection(connection, ownsConnection) {
  if (ownsConnection && connection) {
    await connection.close();
  }
}

async function parseVersionRow(row) {
  return {
    id: row.ID,
    attachmentId: row.ATTACHMENTID,
    versionNo: Number(row.VERSIONNO || 0),
    storagePath: row.STORAGEPATH,
    mimeType: row.MIMETYPE,
    fileSize: Number(row.FILESIZE || 0),
    remark: await db.readLob(row.REMARK),
    createdBy: row.CREATEDBY,
    createdAt: row.CREATEDAT,
    fileKind: 'version',
    fileId: row.ID,
    previewUrl: buildAttachmentFileRoute('version', row.ID, 'inline'),
    downloadUrl: buildAttachmentFileRoute('version', row.ID, 'download')
  };
}

async function parseCommentAttachmentRow(row) {
  return {
    id: row.ID,
    requirementId: row.REQUIREMENTID || null,
    commentId: row.COMMENTID || null,
    originalName: row.ORIGINALNAME,
    storagePath: row.STORAGEPATH,
    mimeType: row.MIMETYPE,
    fileSize: Number(row.FILESIZE || 0),
    createdBy: row.CREATEDBY,
    status: row.STATUS || 'linked',
    createdAt: row.CREATEDAT,
    previewUrl: buildAttachmentFileRoute('comment', row.ID, 'inline'),
    downloadUrl: buildAttachmentFileRoute('comment', row.ID, 'download')
  };
}

async function listVersionsByAttachmentId(connection, attachmentId) {
  const result = await connection.execute(
    `SELECT * FROM requirement_attachment_versions
     WHERE attachmentId = :attachmentId
     ORDER BY versionNo DESC`,
    { attachmentId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const versions = [];
  for (const row of result.rows || []) {
    versions.push(await parseVersionRow(row));
  }
  return versions;
}

async function getCommentAttachmentById(id, existingConnection = null) {
  const { connection, ownsConnection } = await withConnection(existingConnection);
  try {
    const result = await connection.execute(
      `SELECT * FROM comment_attachments WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!result.rows.length) return null;
    return parseCommentAttachmentRow(result.rows[0]);
  } finally {
    await releaseConnection(connection, ownsConnection);
  }
}

async function listCommentAttachmentsByCommentId(commentId, existingConnection = null) {
  const { connection, ownsConnection } = await withConnection(existingConnection);
  try {
    const result = await connection.execute(
      `SELECT * FROM comment_attachments
       WHERE commentId = :commentId
       ORDER BY createdAt ASC`,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const attachments = [];
    for (const row of result.rows || []) {
      attachments.push(await parseCommentAttachmentRow(row));
    }
    return attachments;
  } finally {
    await releaseConnection(connection, ownsConnection);
  }
}

async function getRequirementAttachmentById(id, existingConnection = null) {
  const { connection, ownsConnection } = await withConnection(existingConnection);
  try {
    const result = await connection.execute(
      `SELECT * FROM requirement_attachments WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!result.rows.length) return null;

    const row = result.rows[0];
    const versions = await listVersionsByAttachmentId(connection, row.ID);
    const linkedCommentAttachment = row.LINKEDCOMMENTATTACHMENTID
      ? await getCommentAttachmentById(row.LINKEDCOMMENTATTACHMENTID, connection)
      : null;
    const currentVersion = versions.find(version => version.id === row.CURRENTVERSIONID)
      || (linkedCommentAttachment
        ? {
            id: null,
            versionNo: null,
            storagePath: linkedCommentAttachment.storagePath,
            mimeType: linkedCommentAttachment.mimeType,
            fileSize: linkedCommentAttachment.fileSize,
            fileKind: 'comment',
            fileId: linkedCommentAttachment.id,
            previewUrl: linkedCommentAttachment.previewUrl,
            downloadUrl: linkedCommentAttachment.downloadUrl
          }
        : null);

    return {
      id: row.ID,
      requirementId: row.REQUIREMENTID,
      category: row.CATEGORY,
      originalName: row.ORIGINALNAME,
      sourceType: row.SOURCETYPE,
      sourceCommentId: row.SOURCECOMMENTID,
      linkedCommentAttachmentId: row.LINKEDCOMMENTATTACHMENTID,
      currentVersionId: row.CURRENTVERSIONID,
      status: row.STATUS,
      createdBy: row.CREATEDBY,
      createdAt: row.CREATEDAT,
      updatedAt: row.UPDATEDAT,
      currentVersion,
      versions,
      linkedCommentAttachment,
      summary: createAttachmentSummary({
        id: row.ID,
        category: row.CATEGORY,
        sourceType: row.SOURCETYPE,
        originalName: row.ORIGINALNAME,
        currentVersion
      })
    };
  } finally {
    await releaseConnection(connection, ownsConnection);
  }
}

async function listByRequirementId(requirementId) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT id FROM requirement_attachments
       WHERE requirementId = :requirementId
         AND status = 'active'
       ORDER BY createdAt DESC`,
      { requirementId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const attachments = [];
    for (const row of result.rows || []) {
      const attachment = await getRequirementAttachmentById(row.ID, connection);
      if (attachment) attachments.push(attachment);
    }
    return attachments;
  } finally {
    if (connection) await connection.close();
  }
}

async function createFormalAttachment({ requirementId, category, remark = null, createdBy, file }) {
  ensureValidCategory(category);
  let connection;
  try {
    connection = await db.getConnection();
    const attachmentId = uuidv4();
    const versionId = uuidv4();
    await connection.execute(
      `INSERT INTO requirement_attachments (
        id, requirementId, category, originalName, sourceType, sourceCommentId,
        linkedCommentAttachmentId, currentVersionId, status, createdBy, createdAt, updatedAt
      ) VALUES (
        :id, :requirementId, :category, :originalName, 'formal', NULL,
        NULL, NULL, 'active', :createdBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      {
        id: attachmentId,
        requirementId,
        category,
        originalName: file.originalName,
        createdBy
      }
    );
    await connection.execute(
      `INSERT INTO requirement_attachment_versions (
        id, attachmentId, versionNo, storagePath, mimeType, fileSize, remark, createdBy, createdAt
      ) VALUES (
        :id, :attachmentId, 1, :storagePath, :mimeType, :fileSize, :remark, :createdBy, CURRENT_TIMESTAMP
      )`,
      {
        id: versionId,
        attachmentId,
        storagePath: file.storagePath,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        remark,
        createdBy
      }
    );
    await connection.execute(
      `UPDATE requirement_attachments
       SET currentVersionId = :currentVersionId, updatedAt = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { id: attachmentId, currentVersionId: versionId }
    );
    await connection.commit();
    return getRequirementAttachmentById(attachmentId);
  } finally {
    if (connection) await connection.close();
  }
}

async function createPendingCommentAttachments({ requirementId, createdBy, files }) {
  let connection;
  try {
    connection = await db.getConnection();
    const created = [];
    for (const file of files) {
      const id = uuidv4();
      await connection.execute(
        `INSERT INTO comment_attachments (
          id, requirementId, commentId, originalName, storagePath, mimeType, fileSize, createdBy, status, createdAt
        ) VALUES (
          :id, :requirementId, NULL, :originalName, :storagePath, :mimeType, :fileSize, :createdBy, 'pending', CURRENT_TIMESTAMP
        )`,
        {
          id,
          requirementId,
          originalName: file.originalName,
          storagePath: file.storagePath,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          createdBy
        }
      );
      created.push(await getCommentAttachmentById(id, connection));
    }
    await connection.commit();
    return created;
  } finally {
    if (connection) await connection.close();
  }
}

async function attachPendingCommentAttachments(connection, { commentId, requirementId, attachmentIds, createdBy }) {
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) return [];

  const attached = [];
  for (const attachmentId of attachmentIds) {
    const result = await connection.execute(
      `UPDATE comment_attachments
       SET commentId = :commentId, status = 'linked'
       WHERE id = :id
         AND requirementId = :requirementId
         AND createdBy = :createdBy
         AND commentId IS NULL`,
      { commentId, id: attachmentId, requirementId, createdBy }
    );
    if (result.rowsAffected > 0) attached.push(attachmentId);
  }
  return attached;
}

async function addAttachmentVersion({ attachmentId, remark = null, createdBy, file }) {
  let connection;
  try {
    connection = await db.getConnection();
    const attachment = await getRequirementAttachmentById(attachmentId, connection);
    if (!attachment) return null;

    const nextVersionNo = attachment.versions.length > 0
      ? Math.max(...attachment.versions.map(version => Number(version.versionNo || 0))) + 1
      : 1;
    const versionId = uuidv4();
    await connection.execute(
      `INSERT INTO requirement_attachment_versions (
        id, attachmentId, versionNo, storagePath, mimeType, fileSize, remark, createdBy, createdAt
      ) VALUES (
        :id, :attachmentId, :versionNo, :storagePath, :mimeType, :fileSize, :remark, :createdBy, CURRENT_TIMESTAMP
      )`,
      {
        id: versionId,
        attachmentId,
        versionNo: nextVersionNo,
        storagePath: file.storagePath,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        remark,
        createdBy
      }
    );
    await connection.execute(
      `UPDATE requirement_attachments
       SET currentVersionId = :currentVersionId, updatedAt = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { id: attachmentId, currentVersionId: versionId }
    );
    await connection.commit();
    return getRequirementAttachmentById(attachmentId);
  } finally {
    if (connection) await connection.close();
  }
}

async function promoteCommentAttachment({ requirementId, commentAttachmentId, category, createdBy }) {
  ensureValidCategory(category);
  let connection;
  try {
    connection = await db.getConnection();
    const commentAttachment = await getCommentAttachmentById(commentAttachmentId, connection);
    if (!commentAttachment) return null;

    const existing = await connection.execute(
      `SELECT id FROM requirement_attachments
       WHERE linkedCommentAttachmentId = :linkedCommentAttachmentId
         AND status = 'active'`,
      { linkedCommentAttachmentId: commentAttachmentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) {
      return getRequirementAttachmentById(existing.rows[0].ID, connection);
    }

    const attachmentId = uuidv4();
    await connection.execute(
      `INSERT INTO requirement_attachments (
        id, requirementId, category, originalName, sourceType, sourceCommentId,
        linkedCommentAttachmentId, currentVersionId, status, createdBy, createdAt, updatedAt
      ) VALUES (
        :id, :requirementId, :category, :originalName, 'comment-link', :sourceCommentId,
        :linkedCommentAttachmentId, NULL, 'active', :createdBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      {
        id: attachmentId,
        requirementId,
        category,
        originalName: commentAttachment.originalName,
        sourceCommentId: commentAttachment.commentId,
        linkedCommentAttachmentId: commentAttachment.id,
        createdBy
      }
    );
    await connection.commit();
    return getRequirementAttachmentById(attachmentId);
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteRequirementAttachment(id) {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `UPDATE requirement_attachments
       SET status = 'deleted', updatedAt = CURRENT_TIMESTAMP
       WHERE id = :id AND status = 'active'`,
      { id }
    );
    await connection.commit();
    return result.rowsAffected > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function getAttachmentVersionById(id, existingConnection = null) {
  const { connection, ownsConnection } = await withConnection(existingConnection);
  try {
    const result = await connection.execute(
      `SELECT * FROM requirement_attachment_versions WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!result.rows.length) return null;
    return parseVersionRow(result.rows[0]);
  } finally {
    await releaseConnection(connection, ownsConnection);
  }
}

module.exports = {
  ATTACHMENT_CATEGORIES,
  ensureValidCategory,
  listByRequirementId,
  createFormalAttachment,
  createPendingCommentAttachments,
  attachPendingCommentAttachments,
  listCommentAttachmentsByCommentId,
  getCommentAttachmentById,
  getRequirementAttachmentById,
  addAttachmentVersion,
  promoteCommentAttachment,
  deleteRequirementAttachment,
  getAttachmentVersionById
};

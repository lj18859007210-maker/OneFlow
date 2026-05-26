const commentModel = require('../models/comment');
const notificationService = require('../utils/notificationService');
const db = require('../db/oracle');
const oracledb = require('oracledb');

async function create(req, res) {
  try {
    const { requirementId, type, content, attachmentIds } = req.body;
    const { id: userId, username: userName, role: userRole } = req.user;
    const normalizedAttachmentIds = Array.isArray(attachmentIds) ? attachmentIds.filter(Boolean) : [];
    const normalizedContent = String(content || '').trim();

    if (!requirementId || !type || (!normalizedContent && normalizedAttachmentIds.length === 0)) {
      return res.status(400).json({ success: false, message: '缂哄皯蹇呰鍙傛暟' });
    }

    const comment = await commentModel.create({
      requirementId,
      userId,
      userName,
      userRole,
      type,
      content: normalizedContent,
      attachmentIds: normalizedAttachmentIds
    });

    let connection;
    try {
      connection = await db.getConnection();
      const reqResult = await connection.execute(
        `SELECT id, title, submitter, developer FROM requirements WHERE id = :id`,
        { id: requirementId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (reqResult.rows.length > 0) {
        const requirement = {
          id: reqResult.rows[0].ID,
          title: reqResult.rows[0].TITLE,
          submitter: reqResult.rows[0].SUBMITTER,
          developer: reqResult.rows[0].DEVELOPER
        };

        if (requirement.submitter && requirement.submitter !== userName) {
          const submitterResult = await connection.execute(
            `SELECT id, name FROM users WHERE name = :submitter`,
            { submitter: requirement.submitter },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          if (submitterResult.rows.length > 0) {
            await notificationService.notifyNewComment(
              { id: submitterResult.rows[0].ID, name: submitterResult.rows[0].NAME },
              requirement,
              comment
            );
          }
        }

        if (requirement.developer && requirement.developer !== userName && requirement.developer !== requirement.submitter) {
          const devResult = await connection.execute(
            `SELECT id, name FROM users WHERE name = :devName`,
            { devName: requirement.developer },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          if (devResult.rows.length > 0) {
            await notificationService.notifyNewComment(
              { id: devResult.rows[0].ID, name: devResult.rows[0].NAME },
              requirement,
              comment
            );
          }
        }
      }
    } catch (e) {
      console.error('鍙戦€佽瘎璁洪€氱煡澶辫触:', e.message);
    } finally {
      if (connection) await connection.close();
    }

    res.status(201).json({ success: true, data: comment, message: '璇勮鍒涘缓鎴愬姛' });
  } catch (error) {
    console.error('create comment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getList(req, res) {
  try {
    const { requirementId } = req.params;
    if (!requirementId) {
      return res.status(400).json({ success: false, message: '缂哄皯闇€姹侷D鍙傛暟' });
    }

    const comments = await commentModel.getByRequirementId(requirementId);
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('get comment list error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  create,
  getList
};

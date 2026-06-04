const commentModel = require('../models/comment');
const notificationService = require('../utils/notificationService');
const autoEmailService = require('../utils/autoEmailService');
const db = require('../db/oracle');
const oracledb = require('oracledb');
const { normalizeDeveloperNames } = require('../models/requirement');

function uniqueNames(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean))];
}

async function create(req, res) {
  try {
    const { requirementId, type, content, attachmentIds } = req.body;
    const {
      id: userId,
      username,
      name,
      role: userRole
    } = req.user;
    const userName = name || username;
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

        const recipientNames = uniqueNames([
          requirement.submitter,
          ...normalizeDeveloperNames(requirement.developer)
        ]).filter(name => name !== userName);

        if (recipientNames.length) {
          const binds = {};
          const placeholders = recipientNames.map((name, index) => {
            const key = `name${index}`;
            binds[key] = name;
            return `:${key}`;
          });
          const usersResult = await connection.execute(
            `SELECT id, name FROM users WHERE name IN (${placeholders.join(', ')})`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          const recipientNameSet = new Set(recipientNames);
          for (const user of usersResult.rows || []) {
            if (!recipientNameSet.has(String(user.NAME || '').trim())) continue;
            await notificationService.notifyNewComment(
              { id: user.ID, name: user.NAME },
              requirement,
              comment
            );
          }
        }

        try {
          await autoEmailService.enqueueRequirementEvent({
            requirementId,
            eventType: 'comment_created',
            actorId: userId,
            actorName: userName,
            summary: normalizedContent || `上传了 ${normalizedAttachmentIds.length} 个评论附件`
          });
        } catch (emailError) {
          console.error('queue comment email error:', emailError.message);
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

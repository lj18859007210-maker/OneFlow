const commentModel = require('../models/comment');
const notificationService = require('../utils/notificationService');
const db = require('../db/oracle');
const oracledb = require('oracledb');

async function create(req, res) {
  try {
    const { requirementId, type, content } = req.body;
    const { id: userId, username: userName, role: userRole } = req.user;

    if (!requirementId || !type || !content) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const comment = await commentModel.create({
      requirementId,
      userId,
      userName,
      userRole,
      type,
      content
    });

    // 获取需求信息以发送通知
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
        
        // 通知提交人
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
        
        // 通知开发人员（如果不是同一个人）
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
      console.error('发送评论通知失败:', e.message);
    } finally {
      if (connection) await connection.close();
    }

    res.status(201).json({ success: true, data: comment, message: '评论创建成功' });
  } catch (error) {
    console.error('create comment error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getList(req, res) {
  try {
    const { requirementId } = req.params;
    if (!requirementId) {
      return res.status(400).json({ success: false, message: '缺少需求ID参数' });
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

const requirementModel = require('../models/requirement');
const commentModel = require('../models/comment');
const notificationService = require('../utils/notificationService');
const db = require('../db/oracle');
const oracledb = require('oracledb');

async function getApprovalList(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const { id, role } = req.user;
    const result = await requirementModel.getApprovalList(id, role, page, pageSize);
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getApprovalList error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getAll(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await requirementModel.getAll(page, pageSize);
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      statusStats: result.statusStats,
      avgScore: result.avgScore
    });
  } catch (error) {
    console.error('getAll error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getBySubmitter(req, res) {
  try {
    const { submitter } = req.query;
    if (!submitter) {
      return res.status(400).json({ success: false, message: '缺少提交人参数' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await requirementModel.getBySubmitter(submitter, page, pageSize);
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getBySubmitter error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getDrafts(req, res) {
  try {
    const { submitter } = req.query;
    if (!submitter) {
      return res.status(400).json({ success: false, message: '缺少提交人参数' });
    }
    const drafts = await requirementModel.getDrafts(submitter);
    res.json({ success: true, data: drafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getLatestDraft(req, res) {
  try {
    const { submitter } = req.query;
    if (!submitter) {
      return res.status(400).json({ success: false, message: '缺少提交人参数' });
    }
    const draft = await requirementModel.getLatestDraft(submitter);
    if (!draft) {
      return res.status(404).json({ success: false, message: '没有草稿' });
    }
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getById(req, res) {
  try {
    const requirement = await requirementModel.getById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }
    res.json({ success: true, data: requirement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function create(req, res) {
  try {
    const requirement = await requirementModel.create(req.body);
    
    // 如果分配了开发人员，发送通知
    if (req.body.developer) {
      let connection;
      try {
        connection = await db.getConnection();
        const devResult = await connection.execute(
          `SELECT id, name FROM users WHERE name = :devName`,
          { devName: req.body.developer },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (devResult.rows.length > 0) {
          const developer = devResult.rows[0];
          await notificationService.notifyAssignDev(
            { id: developer.ID, name: developer.NAME },
            requirement
          );
        }
      } catch (e) {
        console.error('获取开发人员信息失败:', e.message);
      } finally {
        if (connection) await connection.close();
      }
    }
    
    res.status(201).json({ success: true, data: requirement, message: '需求创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function update(req, res) {
  try {
    const requirement = await requirementModel.update(req.params.id, req.body);
    if (!requirement) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }
    
    // 如果更新了开发人员，发送通知
    if (req.body.developer) {
      let connection;
      try {
        connection = await db.getConnection();
        const devResult = await connection.execute(
          `SELECT id, name FROM users WHERE name = :devName`,
          { devName: req.body.developer },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (devResult.rows.length > 0) {
          const developer = devResult.rows[0];
          await notificationService.notifyAssignDev(
            { id: developer.ID, name: developer.NAME },
            requirement
          );
        }
      } catch (e) {
        console.error('获取开发人员信息失败:', e.message);
      } finally {
        if (connection) await connection.close();
      }
    }
    
    res.json({ success: true, data: requirement, message: '需求更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function remove(req, res) {
  try {
    const success = await requirementModel.remove(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }
    res.json({ success: true, message: '需求删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: '缺少状态参数' });
    }
    const requirement = await requirementModel.updateStatus(req.params.id, status);
    if (!requirement) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }

    const { id: userId, username: userName, role: userRole } = req.user;
    let commentType = 'dev_message';
    let content = `状态更新为：${status}`;

    if (status === '待审批') {
      commentType = 'approval';
      content = '审批意见：待审批';
    } else if (status === '待评审') {
      commentType = 'review';
      content = '评审结果：已通过';
    }

    await commentModel.create({
      requirementId: req.params.id,
      userId,
      userName,
      userRole,
      type: commentType,
      content
    });

    // 发送通知给提交人
    let connection;
    try {
      connection = await db.getConnection();
      const submitterResult = await connection.execute(
        `SELECT id, name FROM users WHERE name = :submitter`,
        { submitter: requirement.submitter },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (submitterResult.rows.length > 0) {
        const submitter = submitterResult.rows[0];
        await notificationService.notifyStatusChange(
          { id: submitter.ID, name: submitter.NAME },
          requirement,
          status
        );
      }
    } catch (e) {
      console.error('获取提交人信息失败:', e.message);
    } finally {
      if (connection) await connection.close();
    }

    res.json({ success: true, data: requirement, message: '状态更新成功' });
  } catch (error) {
    if (error.message && error.message.startsWith('非法状态流转')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function approve(req, res) {
  try {
    const { approved, comment, actualDate } = req.body;
    const requirement = await requirementModel.approve(req.params.id, approved, comment, actualDate);
    if (!requirement) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }

    const { id: userId, username: userName, role: userRole } = req.user;
    await commentModel.create({
      requirementId: req.params.id,
      userId,
      userName,
      userRole,
      type: 'approval',
      content: `审批意见：${approved ? '通过' : '拒绝'}${comment ? ' - ' + comment : ''}`
    });

    // 发送通知给提交人
    let connection;
    try {
      connection = await db.getConnection();
      const submitterResult = await connection.execute(
        `SELECT id, name FROM users WHERE name = :submitter`,
        { submitter: requirement.submitter },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (submitterResult.rows.length > 0) {
        const submitter = submitterResult.rows[0];
        await notificationService.notifyApprovalResult(
          { id: submitter.ID, name: submitter.NAME },
          requirement,
          approved,
          comment
        );
      }
    } catch (e) {
      console.error('获取提交人信息失败:', e.message);
    } finally {
      if (connection) await connection.close();
    }

    res.json({ success: true, data: requirement, message: approved ? '审批通过' : '审批拒绝' });
  } catch (error) {
    if (error.message && error.message.startsWith('该需求已审批过')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function score(req, res) {
  try {
    const { score } = req.body;
    const requirement = await requirementModel.score(req.params.id, score);
    if (!requirement) {
      return res.status(404).json({ success: false, message: '需求不存在' });
    }
    res.json({ success: true, data: requirement, message: '评分成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getGanttData(req, res) {
  try {
    const filters = {
      platform: req.query.platform || null,
      status: req.query.status || null,
      developer: req.query.developer || null,
      userId: req.user.id,
      userRole: req.user.role
    };
    const result = await requirementModel.getGanttData(filters);
    res.json({ 
      success: true, 
      data: result.data, 
      platformStats: result.platformStats,
      total: result.total 
    });
  } catch (error) {
    console.error('getGanttData error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getAll,
  getApprovalList,
  getBySubmitter,
  getDrafts,
  getLatestDraft,
  getById,
  create,
  update,
  remove,
  updateStatus,
  approve,
  score,
  getGanttData
};

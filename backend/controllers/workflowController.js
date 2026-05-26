const workflowModel = require('../models/workflow');
const { FLOW_KEY_REQUIREMENT } = require('../utils/workflowDefaults');

async function getStatuses(req, res) {
  try {
    const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT, { forceRefresh: true });
    res.json({ success: true, data: flow.statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function updateStatuses(req, res) {
  try {
    const statuses = Array.isArray(req.body.statuses) ? req.body.statuses : null;
    if (!statuses) {
      return res.status(400).json({ success: false, message: '缺少 statuses 参数' });
    }
    const flow = await workflowModel.replaceStatuses(FLOW_KEY_REQUIREMENT, statuses);
    res.json({ success: true, data: flow.statuses, message: '状态配置更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getTransitions(req, res) {
  try {
    const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT, { forceRefresh: true });
    res.json({ success: true, data: flow.transitions });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function createTransition(req, res) {
  try {
    const transition = await workflowModel.createTransition(FLOW_KEY_REQUIREMENT, req.body || {});
    res.status(201).json({ success: true, data: transition, message: '流转配置创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function updateTransition(req, res) {
  try {
    const transition = await workflowModel.updateTransition(req.params.id, req.body || {});
    if (!transition) {
      return res.status(404).json({ success: false, message: '流转配置不存在' });
    }
    res.json({ success: true, data: transition, message: '流转配置更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function reload(req, res) {
  try {
    const flow = await workflowModel.getFlow(FLOW_KEY_REQUIREMENT, { forceRefresh: true });
    res.json({
      success: true,
      message: '流程配置已刷新',
      data: { statuses: flow.statuses.length, transitions: flow.transitions.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getStatuses,
  updateStatuses,
  getTransitions,
  createTransition,
  updateTransition,
  reload
};

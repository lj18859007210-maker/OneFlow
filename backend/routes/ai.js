const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requirementModel = require('../models/requirement');
const config = require('../config');

router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'prompt 不能为空' });
    }

    const response = await fetch(`${config.ai.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.ai.model, prompt, stream: false })
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'AI 服务不可用' });
    }

    const data = await response.json();
    let text = data.response.trim();
    text = text.replace(/<think[\s\S]*?<\/think>/gi, '').trim();
    res.json({ success: true, data: text });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI 服务调用失败', error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: '问题不能为空' });
    }

    const currentUser = req.user ? { name: req.user.name || req.user.username, role: req.user.role } : null;
    let ctx;
    try {
      ctx = await requirementModel.getAIContext();
    } catch (e) {
      console.error('getAIContext failed:', e.message, e.stack);
      return res.status(500).json({ success: false, message: '获取数据失败: ' + e.message });
    }
    console.log('AI context loaded, total:', ctx.total, 'activities:', (ctx.recentActivities || []).length);
    const prompt = buildPrompt(question.trim(), ctx, currentUser);

    const response = await fetch(`${config.ai.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.ai.model, prompt, stream: false })
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'AI 服务不可用' });
    }

    const data = await response.json();
    let text = data.response.trim();
    text = text.replace(/<think[\s\S]*?<\/think>/gi, '').trim();
    res.json({ success: true, data: text });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI 服务调用失败', error: error.message });
  }
});

function buildPrompt(question, ctx, currentUser) {
  const { today, all, recentActivities } = ctx;
  const reqs = all || [];
  const acts = recentActivities || [];

  let userCtx = '';
  if (currentUser && currentUser.name) {
    userCtx = `\n当前登录用户：${currentUser.name}（角色：${currentUser.role === 'admin' ? '管理员' : '普通用户'}）。当用户问"我"时，指的是${currentUser.name}。`;
  }

  const header = `今天是${today}。你是OneFlow需求管理平台的AI助手。${userCtx}
下方是平台所有需求数据和近30天操作记录。你可以自由查询、统计、筛选任意字段来回答用户的问题。不允许编造数据。

需求字段说明：
title-需求标题 | status-状态(待审批/待评审/待开发/开发中/测试中/已发布) | priority-优先级(高/中/低) | score-评分(0=未评分,1-100) | developer-开发人员 | submitter-提交人 | platform-所属平台 | capability-能力类型 | expectedDate-期望日期 | actualDate-实际日期 | createdAt-创建时间 | updatedAt-更新时间

操作记录字段说明：
requirementTitle-需求标题 | userName-操作人 | type-类型(approval/review/dev_message/user_message) | content-操作内容 | date-时间

`;

  const reqRows = reqs.map(r => {
    return [
      r.title || '',
      r.status || '',
      r.priority || '',
      r.score || 0,
      r.developer || '',
      r.submitter || '',
      r.platform || '',
      r.capability || '',
      r.expectedDate || '',
      r.actualDate || '',
      r.createdAt || '',
      r.updatedAt || ''
    ].join('|');
  });

  const actRows = acts.slice(0, 200).map(a => {
    return [
      a.title || '',
      a.userName || '',
      a.type || '',
      (a.content || '').substring(0, 80),
      a.createdAt || ''
    ].join('|');
  });

  return header
    + '【需求数据】\n' + reqRows.join('\n')
    + '\n\n【操作记录(近30天)】\n' + actRows.join('\n')
    + '\n\n用户提问：' + question;
}

module.exports = router;
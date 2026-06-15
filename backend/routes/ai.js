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

    const text = await callAI(prompt);
    res.json({ success: true, data: text });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: 'AI 服务调用失败', error: error.message });
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
      ctx = await requirementModel.getAIContext(req.user);
    } catch (e) {
      console.error('getAIContext failed:', e.message, e.stack);
      return res.status(500).json({ success: false, message: '获取数据失败: ' + e.message });
    }

    console.log('AI context loaded, total:', ctx.total, 'activities:', (ctx.recentActivities || []).length);
    const prompt = buildPrompt(question.trim(), ctx, currentUser);
    const text = await callAI(prompt);
    res.json({ success: true, data: text });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: 'AI 服务调用失败', error: error.message });
  }
});

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function isOpenAICompatible(aiConfig) {
  const baseUrl = String(aiConfig.baseUrl || '');
  return aiConfig.provider === 'openai' || /\/v1\/?$/.test(baseUrl);
}

function buildAIRequest(prompt, aiConfig) {
  const baseUrl = trimTrailingSlash(aiConfig.baseUrl);
  if (isOpenAICompatible(aiConfig)) {
    const headers = { 'Content-Type': 'application/json' };
    if (aiConfig.apiKey) {
      headers.Authorization = `Bearer ${aiConfig.apiKey}`;
    }

    return {
      url: `${baseUrl}/chat/completions`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      }
    };
  }

  return {
    url: `${baseUrl}/api/generate`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: aiConfig.model, prompt, stream: false })
    }
  };
}

async function callAI(prompt) {
  const request = buildAIRequest(prompt, config.ai);
  const response = await fetch(request.url, request.options);
  const rawText = await response.text();

  if (!response.ok) {
    console.error('AI upstream error:', {
      status: response.status,
      statusText: response.statusText,
      url: request.url,
      provider: config.ai.provider || (isOpenAICompatible(config.ai) ? 'openai-compatible' : 'ollama'),
      body: rawText.slice(0, 500)
    });
    const error = new Error(`AI upstream returned ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    console.error('AI upstream invalid JSON:', {
      url: request.url,
      body: rawText.slice(0, 500)
    });
    error.statusCode = 502;
    throw error;
  }

  return extractAIText(data);
}

function extractAIText(data) {
  const text = data?.choices?.[0]?.message?.content ?? data?.response ?? '';
  return String(text).replace(/<think[\s\S]*?<\/think>/gi, '').trim();
}

function buildPrompt(question, ctx, currentUser) {
  const { today, all, recentActivities } = ctx;
  const reqs = all || [];
  const acts = recentActivities || [];

  let userCtx = '';
  if (currentUser && currentUser.name) {
    const roleName = currentUser.role === 'admin' ? '管理员' : '普通用户';
    userCtx = `\n当前登录用户：${currentUser.name}（角色：${roleName}）。当用户问“我”时，指的是 ${currentUser.name}。`;
  }

  const header = `今天是 ${today}。你是 OneFlow 需求管理平台的 AI 助手。${userCtx}
下方是平台所有需求数据和最近 30 天操作记录。你可以查询、统计、筛选任意字段来回答用户问题，不允许编造数据。

需求字段说明：
title-需求标题 | status-状态 | priority-优先级 | score-评分 | developer-开发人员 | submitter-提交人 | platform-所属平台 | capability-能力类型 | expectedDate-期望日期 | actualDate-实际日期 | createdAt-创建时间 | updatedAt-更新时间

操作记录字段说明：
requirementTitle-需求标题 | userName-操作人 | type-类型 | content-操作内容 | date-时间

`;

  const reqRows = reqs.map(r => [
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
  ].join('|'));

  const actRows = acts.slice(0, 200).map(a => [
    a.title || '',
    a.userName || '',
    a.type || '',
    (a.content || '').substring(0, 80),
    a.createdAt || ''
  ].join('|'));

  return header
    + '【需求数据】\n' + reqRows.join('\n')
    + '\n\n【操作记录（最近30天）】\n' + actRows.join('\n')
    + '\n\n用户提问：' + question;
}

module.exports = router;

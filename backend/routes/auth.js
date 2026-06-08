const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { getPublicKey, decryptPassword } = require('../crypto/rsa');
const config = require('../config');
const auditLogModel = require('../models/auditLog');
const { strictLimiter } = require('../middleware/security');
const authMiddleware = require('../middleware/auth');
const { buildCurrentUser } = require('../utils/sessionUser');
const { createCaptcha, verifyCaptcha } = require('../utils/captchaStore');

function getUpdateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(now).replace(/\//g, '/');
}

function recordLoginFailure(req, username, reason) {
  auditLogModel.create({
    userName: username || 'unknown',
    action: 'login',
    resource: 'auth',
    details: { reason },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    status: 'failed'
  }).catch(() => {});
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createLoginLogger(username) {
  const startedAt = Date.now();
  return (stage) => {
    console.log(`[Login] ${stage} username=${username || 'unknown'} elapsed=${Date.now() - startedAt}ms`);
  };
}

function sendJson(res, payload) {
  if (!res.headersSent) {
    res.json(payload);
  }
}

router.get('/public-key', (req, res) => {
  res.json({ code: 0, data: getPublicKey() });
});

router.get('/captcha', strictLimiter, (req, res) => {
  const captcha = createCaptcha();
  res.json({
    code: 0,
    data: {
      id: captcha.id,
      svg: captcha.svg,
      expiresIn: captcha.expiresIn
    }
  });
});

router.post('/login', strictLimiter, async (req, res) => {
  const updatetime = getUpdateTime();

  try {
    await withTimeout((async () => {
    const { username, encryptedPassword, captchaId, captchaCode } = req.body;
    const logLogin = createLoginLogger(username);
    logLogin('request-start');

    if (!username || !encryptedPassword) {
      recordLoginFailure(req, username, 'empty_credentials');
      return sendJson(res, { updatetime, code: 500, data: '\u8d26\u53f7\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a' });
    }

    if (!verifyCaptcha(captchaId, captchaCode)) {
      recordLoginFailure(req, username, 'invalid_captcha');
      return sendJson(res, { updatetime, code: 500, data: '\u9a8c\u8bc1\u7801\u9519\u8bef\u6216\u5df2\u8fc7\u671f' });
    }
    logLogin('captcha-ok');

    const password = decryptPassword(encryptedPassword);
    logLogin('password-decrypted');

    const user = await userModel.login(username, password);
    logLogin('user-query-finished');

    if (!user) {
      recordLoginFailure(req, username, 'invalid_credentials');
      return sendJson(res, { updatetime, code: 500, data: '\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef' });
    }

    const sessionUser = await buildCurrentUser({
      id: user.ID,
      username: user.USERNAME,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    });
    logLogin('permissions-query-finished');

    const token = jwt.sign(
      sessionUser,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    auditLogModel.create({
      userId: user.ID,
      userName: user.NAME,
      userRole: user.ROLE,
      action: 'login',
      resource: 'auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(() => {});
    logLogin('response-success');

    sendJson(res, {
      updatetime,
      code: 0,
      data: {
        user: {
          ...sessionUser
        },
        token
      }
    });
    })(), config.security.loginTimeoutMs, `登录超时：后端连接达梦或查询用户表超过 ${config.security.loginTimeoutMs}ms，请看后端控制台 [Login] 日志定位卡点`);
  } catch (error) {
    sendJson(res, { updatetime, code: 500, data: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.getById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '\u7528\u6237\u4e0d\u5b58\u5728' });
    }

    const sessionUser = await buildCurrentUser({
      id: user.ID,
      username: user.USERNAME,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    });

    res.json({ success: true, data: sessionUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/me/email', authMiddleware, async (req, res) => {
  try {
    const updated = await userModel.updateEmail(req.user.id, req.body?.email);
    if (!updated) {
      return res.status(404).json({ success: false, message: '\u7528\u6237\u4e0d\u5b58\u5728' });
    }

    const sessionUser = await buildCurrentUser({
      id: updated.ID,
      username: updated.USERNAME,
      name: updated.NAME,
      email: updated.EMAIL,
      role: updated.ROLE
    });

    res.json({ success: true, data: sessionUser, message: '\u90ae\u7bb1\u66f4\u65b0\u6210\u529f' });
  } catch (error) {
    if (String(error.message || '').includes('Invalid email')) {
      return res.status(400).json({ success: false, message: '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

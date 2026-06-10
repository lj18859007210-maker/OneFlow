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

const JKSTORE_TOKEN_SECRET = process.env.JKSTORE_TOKEN_SECRET || 'cx_swx';
const SSO_USERNAME_FIELDS = ['jkUsername', 'username', 'login_user', 'userName', 'loginName', 'account', 'name'];

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

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return cookies;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch (error) {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function getFirstString(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const hit = getFirstString(...value);
      if (hit) return hit;
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getBearerToken(authHeader) {
  const header = getFirstString(authHeader);
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function getUsernameFromDecodedToken(decoded) {
  if (!decoded || typeof decoded !== 'object') return '';
  return getFirstString(SSO_USERNAME_FIELDS.map((field) => decoded[field]), decoded.sub);
}

function addTokenCandidate(tokens, value) {
  const token = getFirstString(value);
  if (token && !tokens.includes(token)) {
    tokens.push(token);
  }
}

function getJkstoreTokenCandidates(req, cookies) {
  const tokens = [];
  addTokenCandidate(tokens, req.body?.jkToken);
  addTokenCandidate(tokens, req.body?.token);
  addTokenCandidate(tokens, req.query?.jkToken);
  addTokenCandidate(tokens, req.query?.token);
  addTokenCandidate(tokens, req.headers['x-jk-token']);
  addTokenCandidate(tokens, cookies.token);
  addTokenCandidate(tokens, getBearerToken(req.headers.authorization));
  return tokens;
}

function getRequestUsername(req, cookies) {
  return getFirstString(
    SSO_USERNAME_FIELDS.map((field) => req.body?.[field]),
    SSO_USERNAME_FIELDS.map((field) => req.query?.[field]),
    req.headers['x-jk-username'],
    req.headers['x-username'],
    req.headers['x-login-user'],
    SSO_USERNAME_FIELDS.map((field) => cookies[field])
  );
}

function resolveJkstoreLogin(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const requestUsername = getRequestUsername(req, cookies);
  if (requestUsername) {
    return { username: requestUsername, source: 'request' };
  }

  const tokens = getJkstoreTokenCandidates(req, cookies);
  if (tokens.length === 0) {
    return null;
  }

  let decodedUsername = '';
  for (const sourceToken of tokens) {
    try {
      const decoded = jwt.verify(sourceToken, JKSTORE_TOKEN_SECRET);
      const username = getUsernameFromDecodedToken(decoded);
      if (username) return { username, source: 'verified-token' };
    } catch (error) {
      const decoded = jwt.decode(sourceToken);
      const username = getUsernameFromDecodedToken(decoded);
      if (username) decodedUsername = username;
    }
  }

  return decodedUsername ? { username: decodedUsername, source: 'decoded-token' } : null;
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
    const { username, encryptedPassword, password: plainPassword, captchaId, captchaCode } = req.body;
    const logLogin = createLoginLogger(username);
    logLogin('request-start');

    if (!username || (!encryptedPassword && !plainPassword)) {
      recordLoginFailure(req, username, 'empty_credentials');
      return sendJson(res, { updatetime, code: 500, data: '\u8d26\u53f7\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a' });
    }

    if (!verifyCaptcha(captchaId, captchaCode)) {
      recordLoginFailure(req, username, 'invalid_captcha');
      return sendJson(res, { updatetime, code: 500, data: '\u9a8c\u8bc1\u7801\u9519\u8bef\u6216\u5df2\u8fc7\u671f' });
    }
    logLogin('captcha-ok');

    const password = encryptedPassword ? decryptPassword(encryptedPassword) : plainPassword;
    logLogin(encryptedPassword ? 'password-decrypted' : 'password-plain-fallback');

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

router.post('/sso', async (req, res) => {
  const updatetime = getUpdateTime();
  const login = resolveJkstoreLogin(req);
  const username = login?.username;

  if (!username) {
    return res.status(401).json({
      updatetime,
      code: 401,
      success: false,
      message: '主平台登录态无效或已过期'
    });
  }

  try {
    const user = await userModel.ensureSsoUser(username);
    if (!user) {
      return res.status(401).json({
        updatetime,
        code: 401,
        success: false,
        message: '无法创建或读取 OneFlow 用户'
      });
    }

    const sessionUser = await buildCurrentUser({
      id: user.ID,
      username: user.USERNAME,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    });

    const token = jwt.sign(
      sessionUser,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    auditLogModel.create({
      userId: user.ID,
      userName: user.NAME,
      userRole: user.ROLE,
      action: 'sso_login',
      resource: 'auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(() => {});

    res.json({
      updatetime,
      code: 0,
      success: true,
      data: {
        user: sessionUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      updatetime,
      code: 500,
      success: false,
      message: error.message || '自动登录失败'
    });
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

router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const updated = await userModel.updatePassword(req.user.id, req.body?.password);
    if (!updated) {
      return res.status(404).json({ success: false, message: '\u7528\u6237\u4e0d\u5b58\u5728' });
    }

    auditLogModel.create({
      userId: req.user.id,
      userName: req.user.name || req.user.username,
      userRole: req.user.role,
      action: 'update_password',
      resource: 'auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(() => {});

    res.json({ success: true, message: '\u5bc6\u7801\u66f4\u65b0\u6210\u529f' });
  } catch (error) {
    if (String(error.message || '').includes('Invalid password')) {
      return res.status(400).json({ success: false, message: '\u5bc6\u7801\u957f\u5ea6\u81f3\u5c11 8 \u4f4d' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

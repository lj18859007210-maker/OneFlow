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

router.get('/public-key', (req, res) => {
  res.json({ code: 0, data: getPublicKey() });
});

// 登录接口使用严格限流
router.post('/login', strictLimiter, async (req, res) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const updatetime = formatter.format(now).replace(/\//g, '/');
  
  try {
    const { username, encryptedPassword } = req.body;
    if (!username || !encryptedPassword) {
      auditLogModel.create({
        userName: username || 'unknown',
        action: 'login',
        resource: 'auth',
        details: { reason: 'empty_credentials' },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'failed'
      }).catch(() => {});
      return res.json({ updatetime, code: 500, data: '账号和密码不能为空' });
    }
    
    const password = decryptPassword(encryptedPassword);
    const user = await userModel.login(username, password);
    if (!user) {
      auditLogModel.create({
        userName: username,
        action: 'login',
        resource: 'auth',
        details: { reason: 'invalid_credentials' },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'failed'
      }).catch(() => {});
      return res.json({ updatetime, code: 500, data: '账号或密码错误' });
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
      action: 'login',
      resource: 'auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(() => {});
    
    res.json({ 
      updatetime, 
      code: 0, 
      data: { 
        user: {
          ...sessionUser
        },
        token
      } 
    });
  } catch (error) {
    res.json({ updatetime, code: 500, data: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const sessionUser = await buildCurrentUser(req.user);
    if (!sessionUser) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: sessionUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

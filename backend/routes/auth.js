const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { getPublicKey, decryptPassword } = require('../crypto/rsa');
const config = require('../config');
const auditLogModel = require('../models/auditLog');
const { strictLimiter } = require('../middleware/security');

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
    
    const token = jwt.sign(
      { id: user.ID, username: user.USERNAME, name: user.NAME, role: user.ROLE },
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
          id: user.ID,
          username: user.USERNAME,
          name: user.NAME,
          email: user.EMAIL,
          role: user.ROLE
        },
        token
      } 
    });
  } catch (error) {
    res.json({ updatetime, code: 500, data: error.message });
  }
});

module.exports = router;

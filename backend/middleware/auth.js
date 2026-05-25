const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未授权，请登录' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Token 验证失败: ${req.ip} ${req.originalUrl}`, { error: error.message });
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }
}

module.exports = authMiddleware;
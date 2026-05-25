const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  
  // 记录请求
  logger.access(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
  // 记录响应时间
  const originalEnd = res.end.bind(res);
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    logger.access(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration,
      method: req.method,
      url: req.originalUrl
    });
    originalEnd(chunk, encoding);
  };
  
  next();
}

module.exports = requestLogger;

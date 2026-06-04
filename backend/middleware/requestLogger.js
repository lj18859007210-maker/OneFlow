const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end.bind(res);

  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    logger.access(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    originalEnd(chunk, encoding);
  };

  next();
}

module.exports = requestLogger;

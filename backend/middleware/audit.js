const auditLogModel = require('../models/auditLog');

function auditMiddleware(action, resource) {
  return async (req, res, next) => {
    // 保存原始 res.json
    const originalJson = res.json.bind(res);
    
    // 重写 res.json 以捕获响应
    res.json = function(body) {
      // 记录审计日志
      const logData = {
        userId: req.user?.id || null,
        userName: req.user?.name || req.user?.username || 'anonymous',
        userRole: req.user?.role || null,
        action,
        resource,
        resourceId: req.params.id || null,
        details: {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          body: req.body ? Object.keys(req.body).reduce((acc, key) => {
            // 过滤敏感字段
            if (['password', 'encryptedPassword', 'token'].includes(key)) return acc;
            acc[key] = req.body[key];
            return acc;
          }, {}) : null
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: body?.success !== false ? 'success' : 'failed'
      };
      
      // 异步记录，不阻塞响应
      auditLogModel.create(logData).catch(err => {
        console.error('审计日志记录失败:', err.message);
      });
      
      // 调用原始 res.json
      return originalJson(body);
    };
    
    next();
  };
}

module.exports = auditMiddleware;

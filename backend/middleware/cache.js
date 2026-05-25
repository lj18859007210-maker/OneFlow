const logger = require('../utils/logger');

// 内存缓存存储
const cache = new Map();

// 缓存中间件
function cacheMiddleware(durationSeconds = 60) {
  return (req, res, next) => {
    // 仅缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < durationSeconds * 1000) {
      logger.access(`缓存命中: ${key}`);
      return res.json(cached.data);
    }

    // 保存原始 res.json
    const originalJson = res.json.bind(res);
    
    // 重写 res.json 以缓存响应
    res.json = function(body) {
      // 仅缓存成功响应
      if (body?.success !== false) {
        cache.set(key, {
          data: body,
          timestamp: Date.now()
        });
      }
      return originalJson(body);
    };

    next();
  };
}

// 清除缓存中间件
function clearCache(req, res, next) {
  // 清除所有缓存
  cache.clear();
  logger.access('缓存已清除');
  next();
}

// 清除特定路径缓存
function clearCacheByPattern(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// 定期清理过期缓存（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 300000) { // 5 分钟
      cache.delete(key);
    }
  }
}, 300000);

module.exports = {
  cacheMiddleware,
  clearCache,
  clearCacheByPattern
};

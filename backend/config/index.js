require('dotenv').config({ quiet: true });

function envInt(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  // 数据库类型：oracle 或 dm
  dbType: (process.env.DB_TYPE || 'oracle').toLowerCase(),

  // 服务器配置
  port: envInt('PORT', 8877),
  nodeEnv: process.env.NODE_ENV || 'development',

  apiProxy: {
    target: process.env.API_PROXY_TARGET || 'http://10.45.104.71:8887',
    timeoutMs: envInt('API_PROXY_TIMEOUT_MS', 30000)
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Oracle 数据库配置
  oracle: {
    host: process.env.ORACLE_HOST || 'localhost',
    port: envInt('ORACLE_PORT', 1521),
    serviceName: process.env.ORACLE_SERVICE_NAME || 'ORCL',
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD || 'oracle',
    poolMin: envInt('ORACLE_POOL_MIN', 1),
    poolMax: envInt('ORACLE_POOL_MAX', 3),
    poolIncrement: envInt('ORACLE_POOL_INCREMENT', 1)
  },

  // 达梦数据库配置
  dm: {
    host: process.env.DM_HOST || process.env.ORACLE_HOST || 'localhost',
    port: envInt('DM_PORT', envInt('ORACLE_PORT', 5236)),
    user: process.env.DM_USER || process.env.ORACLE_USER || 'ONEFLOW',
    password: process.env.DM_PASSWORD || process.env.ORACLE_PASSWORD || '',
    schema: process.env.DM_SCHEMA || process.env.DM_USER || process.env.ORACLE_USER || 'ONEFLOW',
    poolMin: envInt('DM_POOL_MIN', 0),
    poolMax: envInt('DM_POOL_MAX', 3),
    poolIncrement: envInt('DM_POOL_INCREMENT', 1),
    connectTimeoutMs: envInt('DM_CONNECT_TIMEOUT_MS', 5000),
    socketTimeoutMs: envInt('DM_SOCKET_TIMEOUT_MS', 8000),
    sessionTimeoutSec: envInt('DM_SESSION_TIMEOUT_SEC', 8),
    queueMax: envInt('DM_QUEUE_MAX', 500),
    queueTimeoutMs: envInt('DM_QUEUE_TIMEOUT_MS', 8000)
  },

  // AI 服务配置
  ai: {
    baseUrl: process.env.AI_BASE_URL || 'http://10.46.250.242:11434',
    model: process.env.AI_MODEL || 'qwen3.5'
  },

  // 邮件配置
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.cmcc.cn',
    port: envInt('SMTP_PORT', 465),
    user: process.env.SMTP_USER || 'noreply@cmcc.cn',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@cmcc.cn'
  },

  // 文件上传配置
  upload: {
    maxFileSize: envInt('UPLOAD_MAX_SIZE', 10 * 1024 * 1024),
    dir: process.env.UPLOAD_DIR || './uploads'
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs'
  },

  // 安全配置
  security: {
    rateLimit: {
      windowMs: envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      maxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 500)
    },
    strictRateLimit: {
      windowMs: envInt('STRICT_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      maxRequests: envInt('STRICT_RATE_LIMIT_MAX_REQUESTS', 100)
    },
    loginTimeoutMs: envInt('LOGIN_TIMEOUT_MS', 8000),
    bcryptRounds: envInt('BCRYPT_ROUNDS', 10)
  }
};

// 验证必要配置
const requiredEnvVars = config.dbType === 'dm'
  ? ['JWT_SECRET', 'DM_USER', 'DM_PASSWORD']
  : ['JWT_SECRET', 'ORACLE_USER', 'ORACLE_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`⚠️  缺少必要环境变量: ${missingVars.join(', ')}`);
}

module.exports = config;

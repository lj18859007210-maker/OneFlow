require('dotenv').config({ quiet: true });

const config = {
  // 服务器配置
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Oracle 数据库配置
  oracle: {
    host: process.env.ORACLE_HOST || 'localhost',
    port: parseInt(process.env.ORACLE_PORT, 10) || 1521,
    serviceName: process.env.ORACLE_SERVICE_NAME || 'ORCL',
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD || 'oracle',
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2
  },

  // AI 服务配置
  ai: {
    baseUrl: process.env.AI_BASE_URL || 'http://10.46.250.242:11434',
    model: process.env.AI_MODEL || 'qwen3.5'
  },

  // 邮件配置
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.cmcc.cn',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    user: process.env.SMTP_USER || 'noreply@cmcc.cn',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@cmcc.cn'
  },

  // 文件上传配置
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024,
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
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500
    },
    strictRateLimit: {
      windowMs: parseInt(process.env.STRICT_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      maxRequests: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10
  }
};

// 验证必要配置
const requiredEnvVars = ['JWT_SECRET', 'ORACLE_USER', 'ORACLE_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`⚠️  缺少必要环境变量: ${missingVars.join(', ')}`);
}

module.exports = config;

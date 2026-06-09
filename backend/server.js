const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const db = require('./db/oracle');
const { seedPermissions } = require('./db/permission-seed');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { helmetMiddleware, limiter, xssProtection, securityHeaders, corsConfig } = require('./middleware/security');
const { cacheMiddleware } = require('./middleware/cache');
const { createApiProxy } = require('./middleware/apiProxy');
const autoMigrate = require('./db/auto-migrate');
const requirementRoutes = require('./routes/requirements');
const emailRoutes = require('./routes/email');
const developerRoutes = require('./routes/developers');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const commentRoutes = require('./routes/comments');
const auditLogRoutes = require('./routes/auditLogs');
const notificationRoutes = require('./routes/notifications');
const permissionRoutes = require('./routes/permissions');
const userRoutes = require('./routes/users');
const workflowRoutes = require('./routes/workflows');
const attachmentRoutes = require('./routes/attachments');
const platformRoutes = require('./routes/platforms');

const app = express();
const PORT = config.port;
const apiProxy = config.apiProxy?.target ? createApiProxy(config.apiProxy) : null;

function isLoopbackProxyTarget(target, port) {
  const targetUrl = new URL(target);
  const targetPort = Number(targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80));
  return ['localhost', '127.0.0.1', '::1'].includes(targetUrl.hostname) && targetPort === port;
}

if (apiProxy && isLoopbackProxyTarget(config.apiProxy.target, PORT)) {
  throw new Error(`API_PROXY_TARGET cannot point back to localhost:${PORT}`);
}

// 安全中间件
app.use(helmetMiddleware);
app.use(corsConfig);
if (!apiProxy) {
  app.use(limiter);
}
app.use(securityHeaders);

// 请求日志中间件
app.use(requestLogger);

if (apiProxy) {
  app.use('/api', apiProxy);
  app.use('/uploads', apiProxy);
}

app.use(xssProtection);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态资源缓存
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));

// 路由（GET 请求添加缓存）
app.use('/api/requirements', cacheMiddleware(30), requirementRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', cacheMiddleware(10), commentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/platforms', platformRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '需求管理平台运行中' });
});

async function startServer() {
  try {
    if (apiProxy) {
      app.listen(PORT, () => {
        console.log(`后端代理服务运行在 http://localhost:${PORT}`);
        console.log(`API 代理目标: ${config.apiProxy.target}`);
        console.log(`环境: ${config.nodeEnv}`);
      });
      return;
    }

    await db.initialize();
    if (config.dbType === 'dm') {
      const connection = await db.getConnection();
      try {
        await seedPermissions(connection);
        console.log('DM permission seed completed');
      } finally {
        await connection.close();
      }
      console.log('达梦数据库模式：跳过 Oracle 自动迁移，请使用 backend/db/oneflow-dm-create-tables-oneflow-schema.sql 初始化表结构');
    } else {
      await autoMigrate.initialize();
    }
    app.listen(PORT, () => {
      console.log(`后端服务运行在 http://localhost:${PORT}`);
      console.log(`环境: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('无法启动服务器:', error);
    process.exit(1);
  }
}

startServer();

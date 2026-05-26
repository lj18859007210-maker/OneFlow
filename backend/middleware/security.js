const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss");
const config = require("../config");
const logger = require("../utils/logger");

// Helmet 安全头
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// 请求频率限制
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: {
    success: false,
    message: "请求过于频繁，请稍后再试",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`请求频率限制: ${req.ip} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: "请求过于频繁，请稍后再试",
    });
  },
});

// 更严格的 API 限流（登录等敏感操作）
const strictLimiter = rateLimit({
  windowMs: config.security.strictRateLimit.windowMs,
  max: config.security.strictRateLimit.maxRequests,
  message: {
    success: false,
    message: "请求过于频繁，请稍后再试",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// XSS 防护中间件
function xssProtection(req, res, next) {
  // 清理请求体中的 XSS
  if (req.body && typeof req.body === "object") {
    const cleanObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "string") {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          cleanObject(obj[key]);
        }
      }
    };
    cleanObject(req.body);
  }

  // 清理查询参数中的 XSS
  if (req.query && typeof req.query === "object") {
    const cleanObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "string") {
          obj[key] = xss(obj[key]);
        }
      }
    };
    cleanObject(req.query);
  }

  next();
}

// 安全头增强
function securityHeaders(req, res, next) {
  // 禁止 MIME 类型嗅探
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 禁止 iframe 嵌入
  res.setHeader("X-Frame-Options", "DENY");

  // 启用 XSS 保护
  res.setHeader("X-XSS-Protection", "0");

  // 限制引荐来源
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // 权限策略
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
}

// CORS 配置
function corsConfig(req, res, next) {
  const allowedOrigins =
    config.nodeEnv === "production"
      ? ["https://oneflow.cmcc.cn"]
      : ["http://localhost:5174", "http://localhost:3000"];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
}

module.exports = {
  helmetMiddleware,
  limiter,
  strictLimiter,
  xssProtection,
  securityHeaders,
  corsConfig,
};

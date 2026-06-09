const http = require('http');
const https = require('https');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const LOCAL_RESPONSE_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-max-age',
  'vary'
]);

function buildTargetUrl(targetBaseUrl, originalUrl) {
  const targetUrl = new URL(targetBaseUrl);
  const incomingUrl = new URL(originalUrl, 'http://localhost');
  const basePath = targetUrl.pathname.replace(/\/+$/, '');

  targetUrl.pathname = `${basePath}${incomingUrl.pathname}`;
  targetUrl.search = incomingUrl.search;

  return targetUrl;
}

function getForwardHeaders(req, targetUrl) {
  const headers = {};

  for (const [name, value] of Object.entries(req.headers)) {
    const normalizedName = name.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(normalizedName) &&
      normalizedName !== 'x-forwarded-for' &&
      normalizedName !== 'x-forwarded-host' &&
      normalizedName !== 'x-forwarded-proto'
    ) {
      headers[name] = value;
    }
  }

  headers.host = targetUrl.host;

  const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (remoteAddress) {
    headers['x-forwarded-for'] = remoteAddress;
  }

  if (req.headers.host) {
    headers['x-forwarded-host'] = req.headers.host;
  }
  headers['x-forwarded-proto'] = req.protocol || (req.socket?.encrypted ? 'https' : 'http');

  return headers;
}

function setResponseHeaders(res, headers) {
  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(normalizedName) &&
      !LOCAL_RESPONSE_HEADERS.has(normalizedName) &&
      value !== undefined
    ) {
      res.setHeader(name, value);
    }
  }
}

function createApiProxy({ target, timeoutMs }) {
  if (!target) {
    throw new Error('API proxy target is required');
  }

  return function apiProxy(req, res) {
    const targetUrl = buildTargetUrl(target, req.originalUrl);
    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: req.method,
        headers: getForwardHeaders(req, targetUrl),
        timeout: timeoutMs
      },
      proxyRes => {
        res.statusCode = proxyRes.statusCode || 502;
        setResponseHeaders(res, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('timeout', () => {
      proxyReq.destroy(new Error(`API proxy timed out after ${timeoutMs}ms`));
    });

    proxyReq.on('error', error => {
      if (res.headersSent) {
        res.end();
        return;
      }

      res.status(502).json({
        success: false,
        code: 'API_PROXY_ERROR',
        message: error.message
      });
    });

    req.on('aborted', () => {
      proxyReq.destroy();
    });

    req.pipe(proxyReq);
  };
}

module.exports = {
  createApiProxy,
  buildTargetUrl,
  getForwardHeaders
};

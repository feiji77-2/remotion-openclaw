const {URL} = require('url');
const dns = require('dns').promises;
const net = require('net');

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const PRIVATE_CIDR_PREFIXES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
];
const ADMIN_ROUTE_MATCHERS = [
  {methods: new Set(['GET']), pattern: /^\/api\/jobs(?:\/|$)/},
  {methods: new Set(['GET']), pattern: /^\/api\/projects(?:\/|$)/},
  {methods: new Set(['GET']), pattern: /^\/api\/render$/},
  {methods: new Set(['DELETE']), pattern: /^\/api\/render\/[^/]+$/},
  {methods: new Set(['POST']), pattern: /^\/api\/render\/[^/]+\/retry$/},
  {methods: new Set(['POST']), pattern: /^\/api\/voice\/[^/]+\/retry$/},
];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseList(value) {
  return normalizeString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getSecurityConfig() {
  const nodeEnv = normalizeString(process.env.NODE_ENV) || 'development';
  const apiKey = normalizeString(process.env.PIPELINE_API_KEY);
  const adminKey = normalizeString(process.env.PIPELINE_ADMIN_KEY);
  const allowedOrigins = parseList(
    process.env.PIPELINE_ALLOWED_ORIGINS
      || 'http://localhost:5174,http://127.0.0.1:5174',
  );
  const webhookHosts = parseList(process.env.PIPELINE_WEBHOOK_HOSTS);
  const allowRemoteMedia = normalizeString(process.env.PIPELINE_ALLOW_REMOTE_MEDIA) === 'true';
  const allowFileQueue =
    normalizeString(process.env.PIPELINE_ALLOW_FILE_QUEUE) === 'true'
    || nodeEnv === 'development';

  return {
    nodeEnv,
    isDevelopment: nodeEnv === 'development',
    apiKey,
    adminKey,
    allowedOrigins,
    webhookHosts,
    allowRemoteMedia,
    allowFileQueue,
    readRateLimit: {
      windowMs: parsePositiveInt(process.env.PIPELINE_READ_RATE_WINDOW_MS, 60_000),
      max: parsePositiveInt(process.env.PIPELINE_READ_RATE_LIMIT, 240),
    },
    writeRateLimit: {
      windowMs: parsePositiveInt(process.env.PIPELINE_WRITE_RATE_WINDOW_MS, 60_000),
      max: parsePositiveInt(process.env.PIPELINE_WRITE_RATE_LIMIT, 30),
    },
  };
}

function assertQueueModeAllowed(queueMode, securityConfig = getSecurityConfig()) {
  if (queueMode === 'file' && !securityConfig.allowFileQueue) {
    throw new Error('File queue mode is only allowed in development or when PIPELINE_ALLOW_FILE_QUEUE=true');
  }
}

function buildCorsOptions(securityConfig = getSecurityConfig()) {
  const {allowedOrigins} = securityConfig;
  const originSet = new Set(allowedOrigins);
  return {
    origin(origin, callback) {
      if (!origin || originSet.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS policy'));
    },
  };
}

function getProvidedApiKey(req) {
  const headerKey = normalizeString(req.get('x-api-key'));
  if (headerKey) {
    return headerKey;
  }
  const authHeader = normalizeString(req.get('authorization'));
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function getProvidedAdminKey(req) {
  const adminHeader = normalizeString(req.get('x-admin-key'));
  if (adminHeader) {
    return adminHeader;
  }
  return getProvidedApiKey(req);
}

function createApiAuthMiddleware(securityConfig = getSecurityConfig()) {
  return function requireApiKey(req, res, next) {
    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }
    if (req.method === 'OPTIONS') {
      next();
      return;
    }
    if (!securityConfig.apiKey) {
      if (securityConfig.isDevelopment) {
        next();
        return;
      }
      res.status(500).json({error: 'PIPELINE_API_KEY is required in non-development environments'});
      return;
    }

    if (getProvidedApiKey(req) !== securityConfig.apiKey) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }
    next();
  };
}

function createAdminAuthMiddleware(securityConfig = getSecurityConfig()) {
  return function requireAdminKey(req, res, next) {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    if (!securityConfig.adminKey) {
      if (securityConfig.isDevelopment) {
        next();
        return;
      }
      res.status(500).json({error: 'PIPELINE_ADMIN_KEY is required for admin routes in non-development environments'});
      return;
    }

    if (getProvidedAdminKey(req) !== securityConfig.adminKey) {
      res.status(403).json({error: 'Admin authorization required'});
      return;
    }

    next();
  };
}

function createRateLimitMiddleware({windowMs, max, keyPrefix}) {
  const buckets = new Map();

  const middleware = function rateLimit(req, res, next) {
    const ip = normalizeString(req.ip)
      || normalizeString(req.headers['x-forwarded-for'])
      || 'unknown';
    const bucketKey = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(bucketKey);

    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(bucketKey, {startedAt: now, count: 1});
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({error: 'Too many requests'});
      return;
    }

    bucket.count += 1;
    next();
  };

  middleware.reset = () => {
    buckets.clear();
  };

  return middleware;
}

function createReadRateLimitMiddleware(securityConfig = getSecurityConfig()) {
  const middleware = createRateLimitMiddleware({
    ...securityConfig.readRateLimit,
    keyPrefix: 'read',
  });
  return function readRateLimit(req, res, next) {
    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }
    if (isAdminRoute(req)) {
      next();
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    middleware(req, res, next);
  };
}

function createWriteRateLimitMiddleware(securityConfig = getSecurityConfig()) {
  const middleware = createRateLimitMiddleware({
    ...securityConfig.writeRateLimit,
    keyPrefix: 'write',
  });
  return function writeRateLimit(req, res, next) {
    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }
    if (isAdminRoute(req)) {
      next();
      return;
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    middleware(req, res, next);
  };
}

function createAdminReadRateLimitMiddleware(securityConfig = getSecurityConfig()) {
  return createRateLimitMiddleware({
    ...securityConfig.readRateLimit,
    keyPrefix: 'admin-read',
  });
}

function createAdminWriteRateLimitMiddleware(securityConfig = getSecurityConfig()) {
  return createRateLimitMiddleware({
    ...securityConfig.writeRateLimit,
    keyPrefix: 'admin-write',
  });
}

function isAdminRoute(req) {
  return ADMIN_ROUTE_MATCHERS.some((matcher) => matcher.methods.has(req.method) && matcher.pattern.test(req.path));
}

function isPrivateIpAddress(address) {
  if (!net.isIP(address)) {
    return false;
  }
  if (address.includes(':')) {
    return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
  }
  return PRIVATE_CIDR_PREFIXES.some((pattern) => pattern.test(address));
}

async function assertWebhookAllowed(webhookUrl, securityConfig = getSecurityConfig()) {
  const normalizedWebhook = normalizeString(webhookUrl);
  if (!normalizedWebhook) {
    return null;
  }
  if (securityConfig.webhookHosts.length === 0) {
    throw badRequest('Webhook callbacks are disabled until PIPELINE_WEBHOOK_HOSTS is configured');
  }

  let parsed;
  try {
    parsed = new URL(normalizedWebhook);
  } catch {
    throw badRequest('Invalid webhook URL');
  }

  if (parsed.protocol !== 'https:' && !(securityConfig.isDevelopment && parsed.protocol === 'http:')) {
    throw badRequest('Webhook URL must use HTTPS');
  }

  if (!securityConfig.webhookHosts.includes(parsed.hostname)) {
    throw badRequest(`Webhook host "${parsed.hostname}" is not allowlisted`);
  }

  if (LOCALHOST_HOSTS.has(parsed.hostname) || isPrivateIpAddress(parsed.hostname)) {
    throw badRequest('Webhook host must not target localhost or private addresses');
  }

  const lookup = await dns.lookup(parsed.hostname, {all: true}).catch(() => []);
  if (lookup.some((entry) => isPrivateIpAddress(entry.address))) {
    throw badRequest('Webhook host resolved to a private IP address');
  }

  return parsed.toString();
}

module.exports = {
  getSecurityConfig,
  assertQueueModeAllowed,
  buildCorsOptions,
  createApiAuthMiddleware,
  createAdminAuthMiddleware,
  createAdminReadRateLimitMiddleware,
  createAdminWriteRateLimitMiddleware,
  createReadRateLimitMiddleware,
  createWriteRateLimitMiddleware,
  assertWebhookAllowed,
  normalizeString,
  parseList,
};

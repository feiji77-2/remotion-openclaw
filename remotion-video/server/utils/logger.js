const LEVEL_WEIGHT = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL = 'info';

function normalizeLogLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVEL_WEIGHT, normalized) ? normalized : DEFAULT_LEVEL;
}

function shouldLog(level) {
  // TODO: Deprecate LOG_LEVEL in favor of PIPELINE_LOG_LEVEL
  const threshold = LEVEL_WEIGHT[normalizeLogLevel(process.env.PIPELINE_LOG_LEVEL || process.env.LOG_LEVEL)];
  return LEVEL_WEIGHT[level] >= threshold;
}

function serializeError(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.code ? {code: error.code} : {}),
    ...(error.status ? {status: error.status} : {}),
  };
}

function normalizeValue(value, seen = new WeakSet()) {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) {
        continue;
      }
      next[key] = normalizeValue(entry, seen);
    }
    seen.delete(value);
    return next;
  }

  return value;
}

function emit(level, payload) {
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

function log(level, event, data = {}) {
  if (!shouldLog(level)) {
    return;
  }

  emit(level, {
    t: new Date().toISOString(),
    level,
    event,
    pid: process.pid,
    ...normalizeValue(data),
  });
}

function createLogger(bindings = {}) {
  const base = normalizeValue(bindings);
  return {
    debug(event, data = {}) {
      log('debug', event, {...base, ...data});
    },
    info(event, data = {}) {
      log('info', event, {...base, ...data});
    },
    warn(event, data = {}) {
      log('warn', event, {...base, ...data});
    },
    error(event, data = {}) {
      log('error', event, {...base, ...data});
    },
  };
}

module.exports = {
  createLogger,
  log,
  normalizeLogLevel,
  serializeError,
};

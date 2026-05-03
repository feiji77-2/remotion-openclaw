const { createLogger } = require('../utils/logger');
const logger = createLogger({ scope: 'request-cancellation' });

const activeRequests = new Map();

function trackRequest(requestId, label) {
  const controller = new AbortController();
  activeRequests.set(requestId, { controller, label: String(label || 'unknown'), createdAt: Date.now(), jobIds: [] });
  return controller.signal;
}

function linkJobId(requestId, jobId) {
  const entry = activeRequests.get(requestId);
  if (entry && jobId) entry.jobIds.push(jobId);
}

function cancelRequest(requestId) {
  const entry = activeRequests.get(requestId);
  if (!entry) return false;
  entry.controller.abort();
  logger.info('request-cancelled', { requestId, label: entry.label, jobIds: entry.jobIds });
  activeRequests.delete(requestId);
  return true;
}

function finishRequest(requestId) {
  activeRequests.delete(requestId);
}

function cancelByJobId(jobId) {
  let count = 0;
  for (const [requestId, entry] of activeRequests.entries()) {
    if (entry.jobIds.includes(jobId)) { cancelRequest(requestId); count++; }
  }
  return count;
}

function cancellationMiddleware(req, res, next) {
  const requestId = `${req.method}-${req.path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const signal = trackRequest(requestId, `${req.method} ${req.path}`);
  req.on('close', () => { if (!res.writableEnded) cancelRequest(requestId); });
  req.requestId = requestId;
  req.cancellationSignal = signal;
  res.on('finish', () => finishRequest(requestId));
  next();
}

function getCancellationStats() {
  return {
    activeCount: activeRequests.size,
    activeRequests: Array.from(activeRequests.entries()).map(([id, entry]) => ({
      id, label: entry.label, ageMs: Date.now() - entry.createdAt, jobCount: entry.jobIds.length,
    })),
  };
}

module.exports = { trackRequest, linkJobId, cancelRequest, cancelByJobId, finishRequest, cancellationMiddleware, getCancellationStats };

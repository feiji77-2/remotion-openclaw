/**
 * OpenClaw Video Pipeline — Express API Server
 * 渲染任务接收 + 状态查询 + Webhook 回调
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  buildCorsOptions,
  createApiAuthMiddleware,
  createAdminAuthMiddleware,
  createAdminReadRateLimitMiddleware,
  createAdminWriteRateLimitMiddleware,
  createReadRateLimitMiddleware,
  createWriteRateLimitMiddleware,
  getSecurityConfig,
  assertQueueModeAllowed,
} = require('../security/apiSecurity');
const {
  normalizeRenderRequest,
  normalizeVoiceRequest,
  normalizeWorkflowRequest,
  normalizeProjectSlugParam,
} = require('../validators/requestValidators');
const {createLogger} = require('../utils/logger');
const {
  createWorkflowJob,
  readWorkflowJob,
  runWorkflowJob,
} = require('../workflow/workflowJobStore');
const {
  getQueue,
  getJob: getBullJob,
  getQueueStats,
} = require('../queue/renderQueue');
const {
  addJob: addFileJob,
  getJob: getFileJob,
  listJobs: listFileJobs,
  removeJob: removeFileJob,
  retryJob: retryFileJob,
  JOBS_DIR,
} = require('../queue/fileQueue');
const { generateWorkflowStep, getWorkflowCapabilities } = require('../workflow/workflowGenerator');
const { getSkillSpec, listSkillCatalog } = require('../workflow/skillRegistry');
const { getVoiceCapabilities } = require('../voice/voiceJob');
const {
  PROJECT_ROOT,
  PUBLIC_DIR,
  ASSETS_DIR,
  OUTPUT_ASSETS_DIR,
  IMAGE_JOBS_DIR,
  ensureRuntimePaths,
} = require('../config/runtimePaths');
const { runImageGenerationJob, readImageJob, normalizeImageRequest, createImageJob, runInlineImageGeneration, getImageJobPath } = require('./imageJob');

const app = express();
const PORT = process.env.PORT || 3001;
const QUEUE_MODE = (process.env.PIPELINE_QUEUE_MODE || 'file').toLowerCase();
const USE_REDIS = QUEUE_MODE === 'redis';
const SECURITY_CONFIG = getSecurityConfig();
const logger = createLogger({scope: 'api', queueMode: QUEUE_MODE});
const requireAdminAuth = createAdminAuthMiddleware(SECURITY_CONFIG);
const adminReadRateLimitMiddleware = createAdminReadRateLimitMiddleware(SECURITY_CONFIG);
const adminWriteRateLimitMiddleware = createAdminWriteRateLimitMiddleware(SECURITY_CONFIG);

assertQueueModeAllowed(QUEUE_MODE, SECURITY_CONFIG);
ensureRuntimePaths();

// ─── Middleware ────────────────────────────────────────────
const readRateLimitMiddleware = createReadRateLimitMiddleware(SECURITY_CONFIG);
const writeRateLimitMiddleware = createWriteRateLimitMiddleware(SECURITY_CONFIG);
app.use(cors(buildCorsOptions(SECURITY_CONFIG)));
app.use(express.static(PUBLIC_DIR));  // serve public/assets for images etc.
app.use(express.json({ limit: '10mb' }));
app.use(createApiAuthMiddleware(SECURITY_CONFIG));
app.use(readRateLimitMiddleware);
app.use(writeRateLimitMiddleware);

function normalizeQueueProgress(progress) {
  if (progress && typeof progress === 'object') {
    return {
      pct: Number(progress.pct) || 0,
      msg: typeof progress.msg === 'string' ? progress.msg : undefined,
    };
  }
  return {
    pct: Number(progress) || 0,
    msg: undefined,
  };
}

function mapQueueState(state) {
  const map = {
    waiting: 'pending',
    active: 'running',
    completed: 'done',
    failed: 'error',
    delayed: 'scheduled',
    paused: 'paused',
  };
  return map[state] || state;
}

function logRouteError(route, error, data = {}) {
  logger.error('route-failed', {
    route,
    status: error?.status || 500,
    error,
    ...data,
  });
}

function isInsideDir(targetPath, dirPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return false;
  }

  const resolvedTarget = path.resolve(targetPath);
  const resolvedDir = path.resolve(dirPath);
  return resolvedTarget === resolvedDir || resolvedTarget.startsWith(`${resolvedDir}${path.sep}`);
}

function toLocalPublicFile(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }

  if (filePath.startsWith('/assets/')) {
    return path.join(PUBLIC_DIR, filePath.replace(/^\/+/, ''));
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return null;
  }

  const resolvedPath = path.resolve(filePath);
  return isInsideDir(resolvedPath, PUBLIC_DIR) ? resolvedPath : null;
}

function toPublicAssetUrl(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  if (filePath.startsWith('/assets/')) {
    return filePath;
  }

  const localFile = toLocalPublicFile(filePath);
  if (!localFile) {
    return null;
  }

  const relativePath = path.relative(PUBLIC_DIR, localFile).split(path.sep).join('/');
  return `/${relativePath}`;
}

function guessRenderOutputFile(jobData, jobId) {
  const projectId = typeof jobData?.projectId === 'string' && jobData.projectId.trim()
    ? jobData.projectId.trim()
    : null;

  if (!projectId) {
    return null;
  }

  const outputDir = path.join(OUTPUT_ASSETS_DIR, projectId);
  if (!fs.existsSync(outputDir)) {
    return null;
  }

  let matchedFile = null;
  try {
    const files = fs.readdirSync(outputDir);
    for (const ext of ['mp4', 'webm', 'gif']) {
      const candidate = path.join(outputDir, `${jobId}.${ext}`);
      if (files.includes(`${jobId}.${ext}`)) {
        return candidate;
      }
    }
    matchedFile = files.find((file) => file.startsWith(`${jobId}.`));
  } catch {
    return null;
  }
  return matchedFile ? path.join(outputDir, matchedFile) : null;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function normalizeRenderArtifacts(rawResult, jobData, jobId) {
  const result = rawResult && typeof rawResult === 'object' ? { ...rawResult } : {};
  const localOutputFile = toLocalPublicFile(result.outputFile) || guessRenderOutputFile(jobData, jobId);
  const outputUrl = toPublicAssetUrl(result.outputUrl || localOutputFile || result.outputFile);
  const voiceUrl = toPublicAssetUrl(result.voiceUrl || result.voiceFile);
  const subtitleUrl = toPublicAssetUrl(result.subtitleUrl || result.subtitleFile);

  let outputBytes = null;
  let outputSizeLabel = null;
  if (localOutputFile) {
    try {
      const stats = fs.statSync(localOutputFile);
      outputBytes = stats.size;
      outputSizeLabel = formatFileSize(stats.size);
    } catch {
      // file may have been deleted between check and stat
    }
  }

  return {
    ...result,
    outputFile: localOutputFile || result.outputFile || null,
    outputUrl,
    downloadUrl: localOutputFile ? `/api/render/${jobId}/download` : null,
    outputFileName: localOutputFile ? path.basename(localOutputFile) : null,
    outputBytes,
    outputSizeLabel,
    voiceUrl,
    subtitleUrl,
    mediaReady: Boolean(outputUrl),
  };
}

function buildFileJobResponse(job) {
  const rawResult = job.result && typeof job.result === 'object' ? job.result : null;
  const result = job.type === 'render'
    ? normalizeRenderArtifacts(rawResult, job.data, job.id)
    : rawResult;
  return {
    jobId: job.id,
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress ?? 0,
    progressMsg: job.progressMsg ?? null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error ?? null,
    ...(result ?? {}),
    result,
  };
}

async function buildBullJobResponse(job) {
  const state = await job.getState();
  const progress = normalizeQueueProgress(job.progress);
  const rawResult = job.returnvalue && typeof job.returnvalue === 'object' ? job.returnvalue : null;
  const result = (job.name || 'render') === 'render'
    ? normalizeRenderArtifacts(rawResult, job.data, String(job.id))
    : rawResult;
  return {
    jobId: String(job.id),
    id: String(job.id),
    type: job.name || 'render',
    status: mapQueueState(state),
    progress: progress.pct,
    progressMsg: progress.msg ?? null,
    submittedAt: job.data?.submittedAt,
    startedAt: job.processedOn ?? null,
    completedAt: job.finishedOn ?? null,
    attempts: job.attemptsMade,
    error: job.failedReason ?? null,
    ...(result ?? {}),
    result,
  };
}

async function enqueueJob(jobType, payload) {
  let jobId;

  if (USE_REDIS) {
    jobId = `${jobType}_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const queue = getQueue();
    await queue.add(
      jobType,
      {
        jobId,
        ...payload,
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  } else {
    jobId = addFileJob(jobType, payload);
  }

  return jobId;
}

async function getJobResponse(jobId) {
  if (USE_REDIS) {
    const job = await getBullJob(jobId);
    if (!job) {
      return null;
    }
    return buildBullJobResponse(job);
  }

  const job = getFileJob(jobId);
  if (!job) {
    return null;
  }
  return buildFileJobResponse(job);
}

// ─── Render Job API ───────────────────────────────────────

/**
 * POST /api/render
 * 提交渲染任务
 * Body: { script, template, voice, webhook? }
 */
app.post('/api/render', async (req, res) => {
  try {
    const jobPayload = await normalizeRenderRequest(req.body, SECURITY_CONFIG);
    let jobId;

    if (USE_REDIS) {
      jobId = `render_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const queue = getQueue();
      await queue.add(
        'render',
        {
          jobId,
          ...jobPayload,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } else {
      jobId = addFileJob('render', jobPayload);
    }

    logger.info('job-queued', {
      route: 'POST /api/render',
      jobId,
      jobType: 'render',
      projectId: jobPayload.projectId,
      template: jobPayload.template,
    });
    return res.json({
      jobId,
      status: 'pending',
      message: '渲染任务已提交，请使用 GET /api/render/:jobId 查询进度',
      docs: {
        status: `GET /api/render/${jobId}`,
        cancel: `DELETE /api/render/${jobId}`,
      },
    });
  } catch (err) {
    logRouteError('POST /api/render', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/render/:jobId
 * 查询任务状态
 */
app.get('/api/render/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const response = await getJobResponse(jobId);
    if (response) {
      return res.json(response);
    }

    return res.status(404).json({ error: '任务不存在', jobId });
  } catch (err) {
    logRouteError('GET /api/render/:jobId', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/render/:jobId/download', async (req, res) => {
  try {
    const { jobId } = req.params;
    const rawJob = USE_REDIS ? await getBullJob(jobId) : getFileJob(jobId);

    if (!rawJob) {
      return res.status(404).json({ error: '任务不存在', jobId });
    }

    const jobType = USE_REDIS ? (rawJob.name || 'render') : rawJob.type;
    if (jobType !== 'render') {
      return res.status(400).json({ error: '该任务不是渲染任务', jobId });
    }

    const rawResult = USE_REDIS
      ? (rawJob.returnvalue && typeof rawJob.returnvalue === 'object' ? rawJob.returnvalue : null)
      : (rawJob.result && typeof rawJob.result === 'object' ? rawJob.result : null);
    const renderArtifacts = normalizeRenderArtifacts(rawResult, rawJob.data, jobId);
    const localOutputFile = toLocalPublicFile(renderArtifacts.outputFile);

    if (!localOutputFile || !isInsideDir(localOutputFile, OUTPUT_ASSETS_DIR)) {
      return res.status(404).json({ error: '渲染产物尚未生成', jobId });
    }

    const downloadName = renderArtifacts.outputFileName || path.basename(localOutputFile);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    try {
      return res.sendFile(localOutputFile, { dotfiles: 'allow' });
    } catch {
      return res.status(404).json({ error: '渲染产物尚未生成', jobId });
    }
  } catch (err) {
    logRouteError('GET /api/render/:jobId/download', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/render/:jobId
 * 取消任务
 */
app.delete('/api/render/:jobId', requireAdminAuth, adminWriteRateLimitMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    if (USE_REDIS) {
      const queue = getQueue();
      const job = await queue.getJob(jobId);

      if (job) {
        const state = await job.getState();
        if (state === 'completed' || state === 'failed') {
          return res.status(400).json({ error: '任务已完成，无法取消' });
        }
        await job.remove();
        logger.info('job-cancelled', {
          route: 'DELETE /api/render/:jobId',
          jobId,
          queueMode: 'redis',
        });
        return res.json({ jobId, status: 'cancelled' });
      }
      return res.status(404).json({ error: '任务不存在' });
    }

    if (!removeFileJob(jobId)) {
      return res.status(404).json({ error: '任务不存在' });
    }
    logger.info('job-cancelled', {
      route: 'DELETE /api/render/:jobId',
      jobId,
      queueMode: 'file',
    });
    return res.json({ jobId, status: 'cancelled' });
  } catch (err) {
    logRouteError('DELETE /api/render/:jobId', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/render
 * 列出所有任务（分页）
 */
app.get('/api/render', requireAdminAuth, adminReadRateLimitMiddleware, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const normalizedLimit = Number.parseInt(limit, 10);
    const normalizedOffset = Number.parseInt(offset, 10);
    let jobs;

    if (USE_REDIS) {
      const queue = getQueue();
      const states = status ? [status] : ['waiting', 'active', 'completed', 'failed', 'delayed'];
      jobs = [];
      for (const state of states) {
        const queueJobs = await queue.getJobs(state, 0, normalizedLimit);
        jobs.push(
          ...queueJobs.map((job) => ({
            jobId: String(job.id),
            status: mapQueueState(state),
            submittedAt: job.data?.submittedAt,
            projectId: job.data?.projectId,
            template: job.data?.template,
          })),
        );
      }
    } else {
      jobs = listFileJobs(status).map((job) => ({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        progressMsg: job.progressMsg,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      }));
    }

    return res.json({
      total: jobs.length,
      jobs: jobs.slice(normalizedOffset, normalizedOffset + normalizedLimit),
    });
  } catch (err) {
    logRouteError('GET /api/render', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/render/:jobId/retry
 * 重试失败任务
 */
app.post('/api/render/:jobId/retry', requireAdminAuth, adminWriteRateLimitMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (USE_REDIS) {
      const queue = getQueue();
      const job = await queue.getJob(jobId);
      if (!job) return res.status(404).json({ error: '任务不存在' });
      await job.retry();
      return res.json({ jobId, status: 'retry_scheduled' });
    }

    if (!retryFileJob(jobId)) {
      return res.status(404).json({ error: '任务不存在' });
    }
    return res.json({ jobId, status: 'retry_scheduled' });
  } catch (err) {
    logRouteError('POST /api/render/:jobId/retry', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

// ─── Workflow Generation API ──────────────────────────────

app.get('/api/skills/catalog', (req, res) => {
  try {
    return res.json({
      skills: listSkillCatalog(),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logRouteError('GET /api/skills/catalog', err);
    return res.status(500).json({
      code: 'SKILL_CATALOG_FAILED',
      error: err.message,
      details: null,
    });
  }
});

app.get('/api/skills/:skillId', (req, res) => {
  try {
    const skill = getSkillSpec(req.params.skillId);
    if (!skill) {
      return res.status(404).json({
        code: 'SKILL_NOT_FOUND',
        error: `Unknown skill: ${req.params.skillId}`,
        details: null,
      });
    }

    return res.json(skill);
  } catch (err) {
    logRouteError('GET /api/skills/:skillId', err, {skillId: req.params.skillId});
    return res.status(500).json({
      code: 'SKILL_DETAIL_FAILED',
      error: err.message,
      details: null,
    });
  }
});

app.post('/api/workflow/generate', async (req, res) => {
  try {
    const workflowInput = normalizeWorkflowRequest(req.body);
    const job = createWorkflowJob(workflowInput);
    void runWorkflowJob(job.jobId, workflowInput, generateWorkflowStep);
    logger.info('workflow-job-queued', {
      route: 'POST /api/workflow/generate',
      jobId: job.jobId,
      stepId: workflowInput.stepId,
    });

    return res.status(202).json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      progressMsg: job.progressMsg,
      docs: {
        status: `GET /api/workflow/${job.jobId}`,
      },
    });
  } catch (err) {
    logRouteError('POST /api/workflow/generate', err);
    return res.status(err.status || 500).json({
      code: err.code || 'WORKFLOW_GENERATION_FAILED',
      error: err.message,
      details: err.details || null,
    });
  }
});

app.get('/api/workflow/:jobId', (req, res) => {
  try {
    const job = readWorkflowJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({error: '任务不存在', jobId: req.params.jobId});
    }
    return res.json(job);
  } catch (err) {
    logRouteError('GET /api/workflow/:jobId', err, {jobId: req.params.jobId});
    return res.status(500).json({error: err.message});
  }
});

// ─── Voice Job API ────────────────────────────────────────

app.post('/api/voice', async (req, res) => {
  try {
    const jobPayload = normalizeVoiceRequest(req.body);

    const jobId = await enqueueJob('voice', jobPayload);
    logger.info('job-queued', {
      route: 'POST /api/voice',
      jobId,
      jobType: 'voice',
      projectId: jobPayload.projectId,
    });
    return res.json({
      jobId,
      status: 'pending',
      message: '语音任务已提交，请使用 GET /api/voice/:jobId 查询进度',
      docs: {
        status: `GET /api/voice/${jobId}`,
      },
    });
  } catch (err) {
    logRouteError('POST /api/voice', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/voice/:jobId', async (req, res) => {
  try {
    const response = await getJobResponse(req.params.jobId);
    if (!response) {
      return res.status(404).json({ error: '任务不存在', jobId: req.params.jobId });
    }
    return res.json(response);
  } catch (err) {
    logRouteError('GET /api/voice/:jobId', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/voice/:jobId/retry', requireAdminAuth, adminWriteRateLimitMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    if (USE_REDIS) {
      const queue = getQueue();
      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: '任务不存在' });
      }
      await job.retry();
      return res.json({ jobId, status: 'retry_scheduled' });
    }

    if (!retryFileJob(jobId)) {
      return res.status(404).json({ error: '任务不存在' });
    }
    return res.json({ jobId, status: 'retry_scheduled' });
  } catch (err) {
    logRouteError('POST /api/voice/:jobId/retry', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/images/generate', async (req, res) => {
  try {
    const {projectId, prompts, shots} = normalizeImageRequest(req.body);
    const job = createImageJob({ projectId, prompts, shots });
    runImageGenerationJob(job.jobId).catch(err => {
      logger.error('image-generation-failed', { jobId: job.jobId, error: err.message });
    });
    logger.info('job-queued', {
      route: 'POST /api/images/generate',
      jobId: job.jobId,
      jobType: 'images',
      projectId,
      shotCount: Array.isArray(shots) ? shots.length : 0,
    });

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      total: job.total,
      completed: job.completed,
      message: '分镜图任务已提交，请轮询 GET /api/images/:jobId 查看进度',
      docs: {
        status: `GET /api/images/${job.jobId}`,
      },
    });
  } catch (err) {
    logRouteError('POST /api/images/generate', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/images/:jobId', async (req, res) => {
  try {
    const job = readImageJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: '任务不存在', jobId: req.params.jobId });
    }

    return res.json(job);
  } catch (err) {
    logRouteError('GET /api/images/:jobId', err, {jobId: req.params.jobId});
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs', requireAdminAuth, adminReadRateLimitMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const normalizedLimit = Number.parseInt(limit, 10);

    if (USE_REDIS) {
      const queue = getQueue();
      const states = ['waiting', 'active', 'completed', 'failed', 'delayed'];
      const jobs = [];
      for (const state of states) {
        const queueJobs = await queue.getJobs(state, 0, normalizedLimit);
        jobs.push(
          ...queueJobs.map((job) => ({
            id: String(job.id),
            type: job.name || 'render',
            status: mapQueueState(state),
            createdAt: job.data?.submittedAt,
            projectId: job.data?.projectId,
          })),
        );
      }

      return res.json({
        total: jobs.length,
        jobs: jobs
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, normalizedLimit),
      });
    }

    const jobs = listFileJobs()
      .map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        progress: job.progress,
        progressMsg: job.progressMsg,
      }))
      .slice(0, normalizedLimit);

    return res.json({
      total: jobs.length,
      jobs,
    });
  } catch (err) {
    logRouteError('GET /api/jobs', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Project Assets API ────────────────────────────────────

/**
 * GET /api/projects
 * 列出所有项目
 */
app.get('/api/projects', requireAdminAuth, adminReadRateLimitMiddleware, (req, res) => {
  const projectsDir = ASSETS_DIR;
  if (!fs.existsSync(projectsDir)) return res.json({ projects: [] });

  const projects = fs.readdirSync(projectsDir).filter(
    f => fs.statSync(path.join(projectsDir, f)).isDirectory()
  );
  return res.json({ projects });
});

/**
 * GET /api/projects/:project/assets
 * 列出项目资产
 */
app.get('/api/projects/:project/assets', requireAdminAuth, adminReadRateLimitMiddleware, (req, res) => {
  let project;
  try {
    project = normalizeProjectSlugParam(req.params.project);
  } catch (error) {
    logRouteError('GET /api/projects/:project/assets', error, {project: req.params.project});
    return res.status(error.status || 400).json({error: error.message});
  }
  const assetDir = path.join(ASSETS_DIR, project);
  if (!fs.existsSync(assetDir)) return res.json({ assets: [] });

  const walk = (dir, base = '') => {
    const items = fs.readdirSync(dir);
    return items.flatMap(name => {
      const full = path.join(dir, name);
      const rel = path.join(base, name);
      if (fs.statSync(full).isDirectory()) return walk(full, rel);
      return { name, path: rel, size: fs.statSync(full).size };
    });
  };

  return res.json({ assets: walk(assetDir) });
});

// ─── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    mode: QUEUE_MODE,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    capabilities: {
      workflow: getWorkflowCapabilities(),
      voice: getVoiceCapabilities(),
      skills: {
        total: listSkillCatalog().length,
      },
    },
    queue: USE_REDIS
      ? getQueueStats()
      : {
          name: 'video-render',
          mode: 'file',
          jobsDir: JOBS_DIR,
          counts: {
            total: listFileJobs().length,
            pending: listFileJobs('pending').length,
            running: listFileJobs('running').length,
            done: listFileJobs('done').length,
            error: listFileJobs('error').length,
          },
        },
  });
});

app.get('/', (req, res) => {
  return res.json({
    name: 'OpenClaw Video Pipeline API',
    version: '1.0.0',
    endpoints: [
      'POST   /api/render          提交渲染任务',
      'GET    /api/render/:jobId   查询任务状态',
      'DELETE /api/render/:jobId   取消任务',
      'GET    /api/render          列出所有任务',
      'POST   /api/render/:jobId/retry  重试',
      'GET    /api/skills/catalog  获取 Skill 库目录',
      'GET    /api/skills/:skillId 获取单个 Skill 真源摘要',
      'POST   /api/workflow/generate  生成工作流步骤内容',
      'GET    /api/workflow/:jobId  查询工作流生成任务',
      'POST   /api/voice           提交语音任务',
      'GET    /api/voice/:jobId    查询语音任务',
      'POST   /api/voice/:jobId/retry  重试语音任务',
      'GET    /api/jobs            列出所有任务',
      'GET    /api/projects         列出项目',
      'GET    /api/projects/:p/assets  项目资产',
      'GET    /health              健康检查',
    ],
  });
});

// ─── Start ────────────────────────────────────────────────
function startServer(port = PORT) {
  return app.listen(port, () => {
    logger.info('server-started', {
      port,
      queueMode: QUEUE_MODE,
      baseUrl: `http://localhost:${port}`,
      healthUrl: `http://localhost:${port}/health`,
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  resetServerState() {
    readRateLimitMiddleware.reset?.();
    writeRateLimitMiddleware.reset?.();
    adminReadRateLimitMiddleware.reset?.();
    adminWriteRateLimitMiddleware.reset?.();
  },
  __testUtils: {
    createImageJob,
    readImageJob,
    runInlineImageGeneration,
    getImageJobPath,
    IMAGE_JOBS_DIR,
    ASSETS_DIR,
  },
};

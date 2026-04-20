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
  normalizeImageRequest,
  sanitizeProjectId,
} = require('../validators/requestValidators');
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

const app = express();
const PORT = process.env.PORT || 3001;
const QUEUE_MODE = (process.env.PIPELINE_QUEUE_MODE || 'file').toLowerCase();
const USE_REDIS = QUEUE_MODE === 'redis';
const SECURITY_CONFIG = getSecurityConfig();
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

  for (const ext of ['mp4', 'webm', 'gif']) {
    const candidate = path.join(outputDir, `${jobId}.${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const matchedFile = fs.readdirSync(outputDir).find((file) => file.startsWith(`${jobId}.`));
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
  if (localOutputFile && fs.existsSync(localOutputFile)) {
    const stats = fs.statSync(localOutputFile);
    outputBytes = stats.size;
    outputSizeLabel = formatFileSize(stats.size);
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

    console.log(`[API] Job queued: ${jobId}`);
    res.json({
      jobId,
      status: 'pending',
      message: '渲染任务已提交，请使用 GET /api/render/:jobId 查询进度',
      docs: {
        status: `GET /api/render/${jobId}`,
        cancel: `DELETE /api/render/${jobId}`,
      },
    });
  } catch (err) {
    console.error('[API] POST /api/render error:', err);
    res.status(err.status || 500).json({ error: err.message });
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

    res.status(404).json({ error: '任务不存在', jobId });
  } catch (err) {
    console.error('[API] GET /api/render/:jobId error:', err);
    res.status(500).json({ error: err.message });
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

    if (!localOutputFile || !fs.existsSync(localOutputFile) || !isInsideDir(localOutputFile, OUTPUT_ASSETS_DIR)) {
      return res.status(404).json({ error: '渲染产物尚未生成', jobId });
    }

    const downloadName = renderArtifacts.outputFileName || path.basename(localOutputFile);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    return res.sendFile(localOutputFile, { dotfiles: 'allow' });
  } catch (err) {
    console.error('[API] GET /api/render/:jobId/download error:', err);
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
        console.log(`[API] Job cancelled: ${jobId}`);
        return res.json({ jobId, status: 'cancelled' });
      }
      return res.status(404).json({ error: '任务不存在' });
    }

    if (!removeFileJob(jobId)) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json({ jobId, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    res.json({
      total: jobs.length,
      jobs: jobs.slice(normalizedOffset, normalizedOffset + normalizedLimit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.json({ jobId, status: 'retry_scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Workflow Generation API ──────────────────────────────

app.get('/api/skills/catalog', (req, res) => {
  try {
    res.json({
      skills: listSkillCatalog(),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[API] GET /api/skills/catalog error:', err);
    res.status(500).json({
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
    console.error('[API] GET /api/skills/:skillId error:', err);
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

    res.status(202).json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      progressMsg: job.progressMsg,
      docs: {
        status: `GET /api/workflow/${job.jobId}`,
      },
    });
  } catch (err) {
    console.error('[API] POST /api/workflow/generate error:', err);
    res.status(err.status || 500).json({
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
    console.error('[API] GET /api/workflow/:jobId error:', err);
    return res.status(500).json({error: err.message});
  }
});

// ─── Voice Job API ────────────────────────────────────────

app.post('/api/voice', async (req, res) => {
  try {
    const jobPayload = normalizeVoiceRequest(req.body);

    const jobId = await enqueueJob('voice', jobPayload);
    console.log(`[API] Voice job queued: ${jobId}`);
    res.json({
      jobId,
      status: 'pending',
      message: '语音任务已提交，请使用 GET /api/voice/:jobId 查询进度',
      docs: {
        status: `GET /api/voice/${jobId}`,
      },
    });
  } catch (err) {
    console.error('[API] POST /api/voice error:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/voice/:jobId', async (req, res) => {
  try {
    const response = await getJobResponse(req.params.jobId);
    if (!response) {
      return res.status(404).json({ error: '任务不存在', jobId: req.params.jobId });
    }
    res.json(response);
  } catch (err) {
    console.error('[API] GET /api/voice/:jobId error:', err);
    res.status(500).json({ error: err.message });
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
    res.json({ jobId, status: 'retry_scheduled' });
  } catch (err) {
    console.error('[API] POST /api/voice/:jobId/retry error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Storyboard Image API ─────────────────────────────────

function sanitizeFileSegment(input, fallback) {
  const value = String(input || fallback || 'item').trim();
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getImageJobPath(jobId) {
  return path.join(IMAGE_JOBS_DIR, `${jobId}.json`);
}

function readImageJob(jobId) {
  const jobPath = getImageJobPath(jobId);
  if (!fs.existsSync(jobPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(jobPath, 'utf8'));
}

function writeImageJob(job) {
  fs.writeFileSync(getImageJobPath(job.jobId), JSON.stringify(job, null, 2));
  return job;
}

function updateImageJob(jobId, updates) {
  const job = readImageJob(jobId);
  if (!job) {
    return null;
  }
  const nextJob = {
    ...job,
    ...updates,
  };
  writeImageJob(nextJob);
  return nextJob;
}

function createImageJob({ projectId, prompts, shots }) {
  const byShotId = prompts?.byShotId && typeof prompts.byShotId === 'object'
    ? prompts.byShotId
    : (prompts && typeof prompts === 'object' ? prompts : {});
  const shotIds = Object.keys(byShotId);
  const jobId = `image_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const job = {
    jobId,
    id: jobId,
    type: 'images',
    status: 'pending',
    progress: 0,
    progressMsg: '等待生成分镜图',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
    projectId,
    total: shotIds.length,
    completed: 0,
    currentShotId: null,
    currentShotTitle: null,
    byShotStatus: shotIds.reduce((acc, shotId) => {
      acc[shotId] = 'pending';
      return acc;
    }, {}),
    images: [],
    prompts,
    shots: Array.isArray(shots) ? shots : [],
  };
  return writeImageJob(job);
}

function upsertImageEntry(imageList, image) {
  const list = Array.isArray(imageList) ? imageList : [];
  const targetShotId = image?.shotId;
  if (!targetShotId) {
    return list;
  }
  const next = list.filter((item) => item?.shotId !== targetShotId);
  next.push(image);
  return next;
}

function buildImageComparisonSummary(comparisons) {
  if (!Array.isArray(comparisons) || comparisons.length === 0) {
    return '';
  }
  const first = comparisons[0] || {};
  if (!first.left && !first.right) {
    return '';
  }
  return `对比关系：${String(first.left || '左侧方案').trim()} vs ${String(first.right || '右侧方案').trim()}`;
}

function resolveImageDisplayPayload(item, shotMeta, shotId) {
  const title = String(item?.shotTitle || shotMeta?.title || shotId || '镜头').trim();
  const summary = String(
    item?.visualSummaryZh
    || item?.promptZh
    || item?.visual?.description
    || shotMeta?.visual?.description
    || shotMeta?.narration
    || item?.prompt
    || '围绕当前镜头生成竖屏视觉',
  ).trim();
  const focus = String(
    item?.visualFocusZh
    || item?.visualFocus
    || item?.visual?.focus
    || shotMeta?.visual?.focus
    || '',
  ).trim();
  const dataHighlights = [
    ...(Array.isArray(item?.dataHighlightsZh) ? item.dataHighlightsZh : []),
    ...(Array.isArray(item?.dataPoints) ? item.dataPoints : []),
  ].map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 3);
  const comparison = String(item?.comparisonSummaryZh || buildImageComparisonSummary(item?.comparisons)).trim();

  return {
    title,
    subtitle: focus || String(item?.mood || shotMeta?.level || '').trim(),
    contentText: [
      `画面内容：${summary}`,
      focus ? `视觉重点：${focus}` : '',
      dataHighlights.length > 0 ? `关键信息：${dataHighlights.join(' / ')}` : '',
      comparison,
    ].filter(Boolean).join('\n'),
  };
}

function buildInlineFallbackImageSvg({ title, subtitle, contentText, shotId }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
<rect width="1080" height="1920" fill="#09070d"/>
<rect x="72" y="100" width="936" height="1720" rx="32" fill="rgba(9,7,13,0.68)" stroke="#8b5cf6" stroke-opacity="0.4"/>
<text x="120" y="220" fill="#fff" font-size="58" font-weight="800" font-family="PingFang SC,Microsoft YaHei,Arial">${escapeXml(title || '镜头')}</text>
${subtitle ? `<text x="120" y="300" fill="#c4b5fd" font-size="30" font-weight="600" font-family="PingFang SC,Microsoft YaHei,Arial">${escapeXml(subtitle)}</text>` : ''}
<foreignObject x="100" y="360" width="880" height="1240">
<div xmlns="http://www.w3.org/1999/xhtml" style="color:#ddd6fe;font-size:28px;line-height:1.72;font-family:PingFang SC,Microsoft YaHei,Arial;white-space:pre-wrap;word-break:break-word;">${escapeXml(contentText || '等待镜头内容')}</div>
</foreignObject>
<text x="120" y="1780" fill="rgba(255,255,255,0.5)" font-size="24" font-family="PingFang SC,Microsoft YaHei,Arial">镜头 ${escapeXml(shotId || '')}</text>
</svg>`;
}

async function runInlineImageGeneration(jobId) {
  const job = readImageJob(jobId);
  if (!job) {
    return;
  }

  const prompts = job.prompts?.byShotId && typeof job.prompts.byShotId === 'object'
    ? job.prompts.byShotId
    : (job.prompts && typeof job.prompts === 'object' ? job.prompts : {});
  const shotMetaMap = Object.fromEntries(
    (Array.isArray(job.shots) ? job.shots : [])
      .filter((item) => item && item.id)
      .map((item) => [item.id, item]),
  );
  const imageDir = path.join(ASSETS_DIR, job.projectId, 'images');
  fs.mkdirSync(imageDir, { recursive: true });

  let nextJob = updateImageJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 2,
    progressMsg: `开始生成，共 ${job.total} 张`,
  });

  const entries = Object.entries(prompts);
  for (const [index, [shotId, item]] of entries.entries()) {
    const display = resolveImageDisplayPayload(item, shotMetaMap[shotId], shotId);
    const safeShotId = sanitizeFileSegment(shotId, `shot-${index + 1}`);
    const fileName = `${safeShotId}.svg`;
    const absPath = path.join(imageDir, fileName);
    const publicPath = `/assets/${job.projectId}/images/${fileName}`;

    nextJob = updateImageJob(jobId, {
      currentShotId: shotId,
      currentShotTitle: display.title,
      progress: Math.max(4, Math.round((index / Math.max(1, job.total)) * 100)),
      progressMsg: `正在生成 ${display.title || shotId}`,
      byShotStatus: {
        ...(nextJob?.byShotStatus || {}),
        [shotId]: 'generating',
      },
    });

    const svg = buildInlineFallbackImageSvg({
      title: display.title,
      subtitle: display.subtitle,
      contentText: display.contentText,
      shotId,
    });
    fs.writeFileSync(absPath, svg, 'utf8');

    const image = { shotId, path: publicPath, format: 'svg', motif: 'fallback' };
    nextJob = updateImageJob(jobId, {
      completed: index + 1,
      progress: Math.round(((index + 1) / Math.max(1, job.total)) * 100),
      progressMsg: `已生成 ${index + 1}/${job.total}`,
      images: upsertImageEntry(nextJob?.images, image),
      byShotStatus: {
        ...(nextJob?.byShotStatus || {}),
        [shotId]: 'done',
      },
    });
  }

  updateImageJob(jobId, {
    status: 'done',
    completedAt: new Date().toISOString(),
    progress: 100,
    progressMsg: `分镜图生成完成，共 ${job.total} 张`,
    currentShotId: null,
    currentShotTitle: null,
  });
}

async function runImageGenerationJob(jobId) {
  const job = readImageJob(jobId);
  if (!job) {
    return;
  }

  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'generate-shot-images.mjs');
  if (!fs.existsSync(scriptPath)) {
    await runInlineImageGeneration(jobId);
    return;
  }

  const { spawn } = require('child_process');
  const tmpFile = path.join('/tmp', `img-gen-${job.projectId}-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify({ prompts: job.prompts, shots: job.shots }), 'utf8');

  updateImageJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 2,
    progressMsg: `开始生成，共 ${job.total} 张`,
  });

  const child = spawn('node', [scriptPath, job.projectId, tmpFile], {
    cwd: PROJECT_ROOT,
  });

  let stdoutBuffer = '';
  let stderr = '';
  let finished = false;
  let settled = false;

  const handleEventLine = (line) => {
    const raw = String(line || '').trim();
    if (!raw) {
      return;
    }

    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    const currentJob = readImageJob(jobId);
    if (!currentJob) {
      return;
    }

    if (event.type === 'start') {
      updateImageJob(jobId, {
        total: Number(event.total) || currentJob.total,
        progress: 2,
        progressMsg: `开始生成，共 ${Number(event.total) || currentJob.total} 张`,
      });
      return;
    }

    if (event.type === 'shot-start') {
      updateImageJob(jobId, {
        currentShotId: event.shotId || null,
        currentShotTitle: event.shotTitle || null,
        progress: Math.max(4, Math.round(((Math.max(0, Number(event.current) - 1)) / Math.max(1, Number(event.total) || currentJob.total)) * 100)),
        progressMsg: `正在生成 ${event.shotTitle || event.shotId || '当前镜头'}`,
        byShotStatus: {
          ...(currentJob.byShotStatus || {}),
          [event.shotId]: 'generating',
        },
      });
      return;
    }

    if (event.type === 'progress') {
      updateImageJob(jobId, {
        completed: Number(event.current) || currentJob.completed,
        currentShotId: event.shotId || null,
        currentShotTitle: event.shotTitle || null,
        progress: Math.round(((Number(event.current) || currentJob.completed || 0) / Math.max(1, Number(event.total) || currentJob.total)) * 100),
        progressMsg: `已生成 ${Number(event.current) || currentJob.completed}/${Number(event.total) || currentJob.total}`,
        images: upsertImageEntry(currentJob.images, event.image),
        byShotStatus: {
          ...(currentJob.byShotStatus || {}),
          [event.shotId]: 'done',
        },
      });
      return;
    }

    if (event.type === 'result') {
      finished = true;
      updateImageJob(jobId, {
        status: 'done',
        completedAt: new Date().toISOString(),
        currentShotId: null,
        currentShotTitle: null,
        completed: Number(event.total) || currentJob.completed,
        total: Number(event.total) || currentJob.total,
        progress: 100,
        progressMsg: `分镜图生成完成，共 ${Number(event.total) || currentJob.total} 张`,
        images: Array.isArray(event.images) ? event.images : currentJob.images,
      });
    }
  };

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';
    lines.forEach(handleEventLine);
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
  }, 30000);

  child.on('close', async (code) => {
    if (settled) {
      return;
    }
    clearTimeout(timeout);
    if (stdoutBuffer.trim()) {
      handleEventLine(stdoutBuffer.trim());
    }

    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }

    if (finished) {
      settled = true;
      return;
    }

    if (code === 0) {
      settled = true;
      updateImageJob(jobId, {
        status: 'done',
        completedAt: new Date().toISOString(),
        currentShotId: null,
        currentShotTitle: null,
        progress: 100,
        progressMsg: `分镜图生成完成，共 ${readImageJob(jobId)?.completed || job.total} 张`,
      });
      return;
    }

    console.warn('[API] image script failed, fallback to inline SVG:', stderr.substring(0, 200));
    try {
      settled = true;
      await runInlineImageGeneration(jobId);
    } catch (error) {
      updateImageJob(jobId, {
        status: 'error',
        completedAt: new Date().toISOString(),
        error: error.message || stderr || `图片生成失败，退出码 ${code}`,
        progressMsg: '分镜图生成失败',
      });
    }
  });

  child.on('error', async (error) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeout);
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }

    console.warn('[API] image script spawn error, fallback to inline SVG:', error.message);
    try {
      await runInlineImageGeneration(jobId);
    } catch (fallbackError) {
      updateImageJob(jobId, {
        status: 'error',
        completedAt: new Date().toISOString(),
        error: fallbackError.message || error.message,
        progressMsg: '分镜图生成失败',
      });
    }
  });
}

app.post('/api/images/generate', async (req, res) => {
  try {
    const {projectId, prompts, shots} = normalizeImageRequest(req.body);
    const job = createImageJob({ projectId, prompts, shots });
    void runImageGenerationJob(job.jobId);

    res.json({
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
    console.error('[API] POST /api/images/generate error:', err);
    res.status(err.status || 500).json({ error: err.message });
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
    console.error('[API] GET /api/images/:jobId error:', err);
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

    res.json({
      total: jobs.length,
      jobs,
    });
  } catch (err) {
    console.error('[API] GET /api/jobs error:', err);
    res.status(500).json({ error: err.message });
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
  res.json({ projects });
});

/**
 * GET /api/projects/:project/assets
 * 列出项目资产
 */
app.get('/api/projects/:project/assets', requireAdminAuth, adminReadRateLimitMiddleware, (req, res) => {
  const project = sanitizeProjectId(req.params.project);
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

  res.json({ assets: walk(assetDir) });
});

// ─── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
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
  res.json({
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
    console.log(`\n🎬 OpenClaw Video Pipeline API`);
    console.log(`   http://localhost:${port}`);
    console.log(`   Queue mode: ${QUEUE_MODE}`);
    console.log(`   Health: http://localhost:${port}/health\n`);
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
};

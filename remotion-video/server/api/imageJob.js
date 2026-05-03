/**
 * Image Job Store — create, read, update, and run image generation jobs
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../utils/logger');
const {
  PROJECT_ROOT,
  ASSETS_DIR,
  IMAGE_JOBS_DIR,
} = require('../config/runtimePaths');

const logger = createLogger({ scope: 'image-job' });

// ─── Helpers ──────────────────────────────────────────────

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

// ─── Job Persistence ─────────────────────────────────────

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
  fs.mkdirSync(IMAGE_JOBS_DIR, {recursive: true});
  fs.writeFileSync(getImageJobPath(job.jobId), JSON.stringify(job, null, 2));
  return job;
}

// updateImageJob 使用同步 I/O（readFileSync/writeFileSync），
// 在 Node.js 单线程事件循环中读-改-写是原子的，无需文件锁。
// handleEventLine 与 runInlineImageGeneration 虽共享同一 jobId，
// 但所有 updateImageJob 调用在同步上下文中完成，不会交错执行。
function updateImageJob(jobId, updates) {
  const job = readImageJob(jobId);
  if (!job) {
    return null;
  }
  const updated = { ...job, ...updates };
  return writeImageJob(updated);
}

// ─── Job Creation ────────────────────────────────────────

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

// ─── Image List Helpers ──────────────────────────────────

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
    || '围绕当前场景生成 16:9 横版视觉',
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

// ─── SVG Fallback Builder ────────────────────────────────

function buildInlineFallbackImageSvg({ title, subtitle, contentText, shotId }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
<rect width="1920" height="1080" fill="#09070d"/>
<rect x="96" y="72" width="1728" height="936" rx="36" fill="rgba(9,7,13,0.68)" stroke="#38bdf8" stroke-opacity="0.45"/>
<text x="144" y="188" fill="#fff" font-size="58" font-weight="800" font-family="PingFang SC,Microsoft YaHei,Arial">${escapeXml(title || '场景')}</text>
${subtitle ? `<text x="144" y="258" fill="#7dd3fc" font-size="30" font-weight="600" font-family="PingFang SC,Microsoft YaHei,Arial">${escapeXml(subtitle)}</text>` : ''}
<foreignObject x="132" y="316" width="1656" height="548">
<div xmlns="http://www.w3.org/1999/xhtml" style="color:#e0f2fe;font-size:30px;line-height:1.7;font-family:PingFang SC,Microsoft YaHei,Arial;white-space:pre-wrap;word-break:break-word;">${escapeXml(contentText || '等待场景内容')}</div>
</foreignObject>
<text x="144" y="944" fill="rgba(255,255,255,0.5)" font-size="24" font-family="PingFang SC,Microsoft YaHei,Arial">Scene ${escapeXml(shotId || '')}</text>
</svg>`;
}

// ─── Inline Generation (Fallback) ────────────────────────

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

// ─── Main Image Generation Job ───────────────────────────

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
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `img-gen-${job.projectId}-${Date.now()}.json`);
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

    logger.warn('image-script-fallback', {
      jobId,
      reason: 'process-exit',
      exitCode: code,
      stderrSnippet: stderr.substring(0, 200),
    });
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

    logger.warn('image-script-fallback', {
      jobId,
      reason: 'spawn-error',
      error,
    });
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

module.exports = {
  readImageJob,
  createImageJob,
  runImageGenerationJob,
  runInlineImageGeneration,
  getImageJobPath,
  IMAGE_JOBS_DIR,
  ASSETS_DIR,
};

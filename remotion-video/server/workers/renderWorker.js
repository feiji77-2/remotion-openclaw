/**
 * OpenClaw Video Render Worker（真实渲染版）
 *
 * Stage 1: 配音合成（Qwen TTS）
 * Stage 2: 字幕生成（Deepgram/Whisper → SRT）
 * Stage 3: Remotion 真实渲染 ← 接入真实命令
 * Stage 4: Webhook 回调
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  processVoiceJob,
  prepareVoiceSynthesisPlan,
  probeDurationSeconds,
  resolveShotSpeechPlan,
  sanitizeFileSegment,
} = require('../voice/voiceJob');
const {
  resolveQwenSynthesisModel,
  resolveQwenTtsDefaultVoice,
  synthesizeQwenTtsToFile,
} = require('../voice/qwenTtsClient');
const {createLogger} = require('../utils/logger');
const {
  PROJECT_ROOT,
  PUBLIC_DIR,
  OUTPUT_ASSETS_DIR,
  VOICE_ASSETS_DIR,
  SUBTITLE_ASSETS_DIR,
} = require('../config/runtimePaths');
const {getSecurityConfig, assertQueueModeAllowed} = require('../security/apiSecurity');
const {
  buildUltimateRenderProps,
} = require('../../scripts/lib/index.js');
const { trackProcess, startMonitoring, canAcceptRender, waitForMemory } = require('./memoryLimiter');

const OUTPUT_DIR = OUTPUT_ASSETS_DIR;
const VOICE_DIR = VOICE_ASSETS_DIR;
const SUBTITLE_DIR = SUBTITLE_ASSETS_DIR;
const RENDER_TIMEOUT_MS = Number(process.env.WORKER_DURATION_LIMIT || '1200000');
const WORKER_SHUTDOWN_TIMEOUT_MS = Number(process.env.WORKER_SHUTDOWN_TIMEOUT_MS || '30000');
const DEFAULT_SMOKE_DURATION_FRAMES = 180;
const SECURITY_CONFIG = getSecurityConfig();
const logger = createLogger({scope: 'render-worker'});
const activeChildProcesses = new Set();
let shutdownHandlersInstalled = false;

// 确保目录存在
[OUTPUT_DIR, VOICE_DIR, SUBTITLE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function trackChildProcess(proc, meta = {}) {
  const entry = {proc, meta};
  activeChildProcesses.add(entry);

  const cleanup = () => {
    activeChildProcesses.delete(entry);
  };

  proc.once('close', cleanup);
  proc.once('exit', cleanup);
  proc.once('error', cleanup);

  return proc;
}

function terminateTrackedChildProcesses(signal = 'SIGTERM') {
  for (const entry of [...activeChildProcesses]) {
    const proc = entry?.proc;
    if (!proc || proc.killed) {
      continue;
    }

    try {
      proc.kill(signal);
      logger.warn('child-process-terminated', {
        signal,
        pid: proc.pid,
        ...entry.meta,
      });
    } catch (error) {
      logger.warn('child-process-terminate-failed', {
        signal,
        pid: proc.pid,
        ...entry.meta,
        error,
      });
    }
  }
}

function installWorkerSignalHandlers({mode, stop}) {
  if (shutdownHandlersInstalled) {
    return;
  }

  shutdownHandlersInstalled = true;
  let isShuttingDown = false;

  const handleSignal = async (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info('worker-shutdown', {
      signal,
      mode,
      timeoutMs: WORKER_SHUTDOWN_TIMEOUT_MS,
      activeChildProcessCount: activeChildProcesses.size,
    });

    try {
      const result = await stop();
      if (result?.timedOut) {
        logger.warn('worker-shutdown-timeout', {
          signal,
          mode,
          activeJobId: result.activeJobId || null,
        });
        terminateTrackedChildProcesses('SIGTERM');
      }
    } catch (error) {
      logger.error('worker-shutdown-failed', {
        signal,
        mode,
        error,
      });
      terminateTrackedChildProcesses('SIGTERM');
      process.exitCode = 1;
    } finally {
      setTimeout(() => {
        process.exit(process.exitCode || 0);
      }, 0);
    }
  };

  process.once('SIGTERM', () => {
    void handleSignal('SIGTERM');
  });
  process.once('SIGINT', () => {
    void handleSignal('SIGINT');
  });
}

function resolveRemotionLaunch(cwd) {
  const bundledCli = path.join(cwd, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  const binaryShim = path.join(cwd, 'node_modules', '.bin', 'remotion');

  if (fs.existsSync(bundledCli)) {
    return {
      command: process.execPath,
      argsPrefix: [bundledCli],
      displayCommand: `${process.execPath} ${bundledCli}`,
    };
  }

  if (fs.existsSync(binaryShim)) {
    return {
      command: binaryShim,
      argsPrefix: [],
      displayCommand: binaryShim,
    };
  }

  return {
    command: 'npx',
    argsPrefix: ['remotion'],
    displayCommand: 'npx remotion',
  };
}

// P0: Build 预热 — 确保 build/ 已 bundle，消除每次 webpack 编译开销
async function checkAndWarmBuild(cwd) {
  const buildIndex = path.join(cwd, 'build', 'index.html');
  if (fs.existsSync(buildIndex)) {
    logger.info('build-already-warmed', { buildIndex });
    return true;
  }
  logger.info('build-warming-started', { cwd });
  return new Promise((resolve, reject) => {
    const bundleArgs = [
      'bundle',
      'src/Root.tsx',
      '--out-dir', 'build',
    ];
    const launch = resolveRemotionLaunch(cwd);
    const proc = spawn(launch.command, [...launch.argsPrefix, ...bundleArgs], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('build-warmed-success', { cwd });
        resolve(true);
      } else {
        logger.error('build-warm-failed', { cwd, exitCode: code, stderr: stderr.slice(-500) });
        reject(new Error(`build warm failed (exit ${code}): ${stderr.slice(-500)}`));
      }
    });
    proc.on('error', reject);
  });
}

// ─── Stage 1: 配音合成 ─────────────────────────────────
async function stageVoiceSynthesis(job, update, sharedDesignData) {
  update(5, '合成语音...');
  const { projectId = 'default' } = job.data;
  const designRenderData = sharedDesignData;
  const renderFps = getPositiveInt(job.data.renderFps) ?? getPositiveInt(designRenderData.renderFps) ?? 30;
  const script =
    typeof job.data.script === 'string' && job.data.script.trim()
      ? job.data.script.trim()
      : 'OpenClaw video';
  const inputShots = Array.isArray(job.data.shots) ? job.data.shots : [];
  const voiceSettings = job.data.voiceSettings && typeof job.data.voiceSettings === 'object'
    ? job.data.voiceSettings
    : {};

  const projectVoiceDir = path.join(VOICE_DIR, projectId);
  if (!fs.existsSync(projectVoiceDir)) fs.mkdirSync(projectVoiceDir, { recursive: true });

  const voiceFile = path.join(projectVoiceDir, `narration_${job.id}.wav`);
  const scriptFile = path.join(projectVoiceDir, `script_${job.id}.json`);

  // 写入脚本
  fs.writeFileSync(scriptFile, JSON.stringify({ script, voice: 'qwen-tts', generatedAt: new Date().toISOString() }, null, 2));

  const preparedAudioSegments = materializeAudioSegments(
    Array.isArray(job.data.audioSegments) && job.data.audioSegments.length > 0
      ? job.data.audioSegments
      : designRenderData.audioSegments,
    projectId,
  );
  if (preparedAudioSegments.length > 0) {
    update(20, '✅ 复用已有分镜音轨');
    return { voiceFile: null, scriptFile, audioSegments: preparedAudioSegments, generatedSubtitleData: null, syncedShots: null };
  }

  const preparedSegmentSynthesis = await synthesizeShotAudioSegments({
    job,
    projectId,
    projectVoiceDir,
    renderFps,
    voiceSettings,
    shots: inputShots,
    update,
  });

  if (preparedSegmentSynthesis) {
    update(20, '✅ 分镜语音就绪');
    return {
      voiceFile: null,
      scriptFile,
      audioSegments: preparedSegmentSynthesis.audioSegments,
      generatedSubtitleData: preparedSegmentSynthesis.subtitleData,
      syncedShots: preparedSegmentSynthesis.syncedShots,
    };
  }

  // 已有现成音频则复制
  const fallbackVoice = path.join(VOICE_DIR, 'full-narration.wav');
  if (fs.existsSync(fallbackVoice) && !fs.existsSync(voiceFile)) {
    fs.copyFileSync(fallbackVoice, voiceFile);
    logger.info('voice-fallback-copied', {jobId: job.id, projectId, voiceFile});
  } else if (fs.existsSync(voiceFile)) {
    logger.info('voice-reused', {jobId: job.id, projectId, voiceFile});
  } else {
    try {
      await synthesizeQwenTtsToFile({
        text: script,
        voice: resolveQwenTtsDefaultVoice(process.env),
        language: 'zh-cn',
        outputPath: voiceFile,
        model: resolveQwenSynthesisModel({env: process.env}),
        speed: 1.0,
        env: process.env,
      });
      logger.info('voice-synthesized', {
        jobId: job.id,
        projectId,
        engine: 'qwen-tts',
        voiceFile,
      });
    } catch (e) {
      logger.warn('voice-synthesis-fallback', {
        jobId: job.id,
        projectId,
        engine: 'qwen-tts',
        fallback: 'static-fallback',
        error: e,
      });
      if (fs.existsSync(fallbackVoice)) {
        fs.copyFileSync(fallbackVoice, voiceFile);
      }
    }
  }

  update(20, '✅ 语音就绪');
  return { voiceFile, scriptFile, audioSegments: [], generatedSubtitleData: null, syncedShots: null };
}

// ─── Stage 2: 字幕生成 ─────────────────────────────────
async function stageSubtitleGeneration(job, voiceFile, generatedSubtitleData, syncedShots, update, sharedDesignData) {
  update(25, '生成字幕...');
  const { projectId = 'default' } = job.data;
  const designRenderData = sharedDesignData;

  const projectSubDir = path.join(SUBTITLE_DIR, projectId);
  if (!fs.existsSync(projectSubDir)) fs.mkdirSync(projectSubDir, { recursive: true });

  const subtitleFile = path.join(projectSubDir, `subtitles_${job.id}.srt`);
  const providedSubtitleFile = resolveExistingSubtitleFile(job.data.subtitleFile);

  if (providedSubtitleFile) {
    fs.copyFileSync(providedSubtitleFile, subtitleFile);
    update(35, '✅ 字幕就绪（用户字幕）');
    return { subtitleFile };
  }

  const providedSubtitleData = normalizeSubtitlePayload(
    Array.isArray(job.data.subtitleData) && job.data.subtitleData.length > 0
      ? job.data.subtitleData
      : designRenderData.subtitleData,
  );

  if (providedSubtitleData.length > 0) {
    fs.writeFileSync(subtitleFile, serializeSubtitlesToSrt(providedSubtitleData));
    update(35, '✅ 字幕就绪（设计稿时间轴）');
    return { subtitleFile };
  }

  const stagedSubtitleData = normalizeSubtitlePayload(generatedSubtitleData);
  if (stagedSubtitleData.length > 0) {
    fs.writeFileSync(subtitleFile, serializeSubtitlesToSrt(stagedSubtitleData));
    update(35, process.env.DEEPGRAM_API_KEY || process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY
      ? '✅ 字幕就绪（分镜转写对齐）'
      : '✅ 字幕就绪（分镜时长对齐）');
    return { subtitleFile, subtitleData: stagedSubtitleData, syncedShots: Array.isArray(syncedShots) ? syncedShots : null };
  }

  const shotSubtitleSrt = generateShotAlignedSRT(Array.isArray(syncedShots) && syncedShots.length > 0 ? syncedShots : job.data.shots);
  if (shotSubtitleSrt) {
    fs.writeFileSync(subtitleFile, shotSubtitleSrt);
    update(35, '✅ 字幕就绪（按镜头时长对齐）');
    return { subtitleFile, subtitleData: null, syncedShots: Array.isArray(syncedShots) ? syncedShots : null };
  }

  // 优先用 Deepgram
  if (process.env.DEEPGRAM_API_KEY && voiceFile) {
    try {
      const { generateSubtitles } = require('../subtitles/deepgramSubtitles');
      await generateSubtitles(voiceFile, subtitleFile);
      update(35, '✅ 字幕生成完成');
      return { subtitleFile, subtitleData: null, syncedShots: Array.isArray(syncedShots) ? syncedShots : null };
    } catch (e) {
      logger.warn('subtitle-provider-failed', {
        jobId: job.id,
        projectId,
        provider: 'deepgram',
        error: e,
      });
    }
  }

  const fallbackScript =
    typeof job.data.subtitleText === 'string' && job.data.subtitleText.trim()
      ? job.data.subtitleText.trim()
      : typeof job.data.script === 'string' && job.data.script.trim()
        ? job.data.script.trim()
        : '';

  if (fallbackScript) {
    fs.writeFileSync(subtitleFile, generateFallbackSRT(fallbackScript));
    update(35, '✅ 字幕就绪（文本回退）');
    return { subtitleFile, subtitleData: null, syncedShots: Array.isArray(syncedShots) ? syncedShots : null };
  }

  // 回退：复制现有字幕
  const fallbackSub = path.join(PUBLIC_DIR, 'assets/subtitles/default.srt');
  if (fs.existsSync(fallbackSub)) {
    fs.copyFileSync(fallbackSub, subtitleFile);
  } else {
    // 生成占位字幕
    const placeholder = generateFallbackSRT('视频旁白');
    fs.writeFileSync(subtitleFile, placeholder);
  }

  update(35, '✅ 字幕就绪（回退模式）');
  return { subtitleFile, subtitleData: null, syncedShots: Array.isArray(syncedShots) ? syncedShots : null };
}

// ─── 渲染数据预计算 ─────────────────────────────────────
function prepareRenderData(job, files, designRenderData) {
  const {
    template = 'ultimate',
    subtitleData = null,
    subtitleText = null,
    projectId = 'default',
  } = job.data;
  const { subtitleFile, voiceFile, audioSegments = [] } = files;

  const resolvedSubtitleData = normalizeSubtitlePayload(
    Array.isArray(subtitleData) && subtitleData.length > 0
      ? subtitleData
      : Array.isArray(files.subtitleData) && files.subtitleData.length > 0
        ? files.subtitleData
        : designRenderData.subtitleData,
  );
  const resolvedSubtitleText =
    typeof subtitleText === 'string' && subtitleText.trim()
      ? subtitleText.trim()
      : designRenderData.subtitleText;
  const resolvedDurationInFrames = getPositiveInt(designRenderData.durationInFrames);
  const resolvedFrameRange = resolveRenderFrameRange(job.data.options, resolvedDurationInFrames);
  const resolvedShots = Array.isArray(files.syncedShots) && files.syncedShots.length > 0
    ? files.syncedShots
    : Array.isArray(job.data.shots) && job.data.shots.length > 0
      ? job.data.shots
      : [];
  const directDurationInFrames = getPositiveInt(job.data.durationInFrames);
  const directRenderFps = getPositiveInt(job.data.renderFps);
  const directRenderWidth = getPositiveInt(job.data.renderWidth);
  const directRenderHeight = getPositiveInt(job.data.renderHeight);
  const resolvedRenderFps = directRenderFps || getPositiveInt(designRenderData.renderFps) || 30;
  const resolvedRenderWidth = directRenderWidth || getPositiveInt(designRenderData.renderWidth) || 1920;
  const resolvedRenderHeight = directRenderHeight || getPositiveInt(designRenderData.renderHeight) || 1080;
  const publicVoiceFile = voiceFile ? `/assets/voice/${projectId}/${path.basename(voiceFile)}` : null;
  const resolvedUltimateSubtitleData = resolvedSubtitleData.length > 0
    ? resolvedSubtitleData
    : subtitleFile
      ? parseSrtFileToSubtitleData(subtitleFile, resolvedRenderFps)
      : [];
  const compatibilityShots = resolvedShots.length > 0
    ? []
    : buildUltimateCompatibilityShots({
        script: job.data.script,
        subtitleText: resolvedSubtitleText,
        durationInFrames: directDurationInFrames || resolvedDurationInFrames,
        fps: resolvedRenderFps,
        title: designRenderData.title || job.data.title || projectId,
      });
  const activeShots = resolvedShots.length > 0 ? resolvedShots : compatibilityShots;

  const outputDir = path.join(OUTPUT_DIR, projectId);
  const outputFile = path.join(outputDir, `${job.id}.mp4`);

  return {
    projectId, template, audioSegments,
    resolvedShots, activeShots, compatibilityShots,
    resolvedFrameRange, resolvedRenderFps, resolvedRenderWidth, resolvedRenderHeight,
    publicVoiceFile, resolvedUltimateSubtitleData,
    outputDir, outputFile,
  };
}

// ─── Stage 3: Remotion 真实渲染 ────────────────────────
async function stageRemotionRender(job, files, update, sharedDesignData) {
  update(40, '开始 Remotion 渲染...');
  const designRenderData = sharedDesignData;

  // P0: Build 预热 — 确保 bundle 已就绪（复用 build/ 目录，消除 webpack 编译）
  const remotionDir = PROJECT_ROOT;
  try {
    await checkAndWarmBuild(remotionDir);
  } catch (warmErr) {
    logger.warn('build-warm-skipped', { jobId: job.id, error: warmErr.message });
    // 非致命：降级到不带 --serve 的渲染（Remotion 临时 bundle）
  }

  // P2: 前置内存检查 — 不满足则等待，最长 120s 后拒绝任务
  const memoryCheck = canAcceptRender();
  if (!memoryCheck.accept) {
    logger.warn('memory-throttle', { jobId: job.id, reason: memoryCheck.reason });
    update(40, '等待内存就绪...');
    const ready = await waitForMemory(3000, 120000);
    if (!ready) {
      throw new Error(`memory-pressure-timeout — cannot accept render: ${memoryCheck.reason}`);
    }
  }

  const renderData = prepareRenderData(job, files, designRenderData);
  const {
    projectId, activeShots, resolvedFrameRange, resolvedRenderFps,
    resolvedRenderWidth, resolvedRenderHeight, publicVoiceFile,
    resolvedUltimateSubtitleData, compatibilityShots,
    resolvedShots, template, audioSegments, outputDir, outputFile,
  } = renderData;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  if (activeShots.length === 0) {
    throw new Error('Ultimate render requires payload.shots, syncedShots, or enough script/subtitle text to derive compatibility scenes.');
  }

  if (template !== 'ultimate') {
    logger.warn('legacy-render-template-aliased', {
      jobId: job.id,
      projectId,
      requestedTemplate: template,
      effectiveTemplate: 'ultimate',
    });
  }

  if (resolvedShots.length === 0 && compatibilityShots.length > 0) {
    logger.warn('ultimate-compat-shots-derived', {
      jobId: job.id,
      projectId,
      compatShotCount: compatibilityShots.length,
    });
  }

  const compositionId = 'UltimateSceneTemplate';
  const remotionProps = buildUltimateRenderProps({
    projectId,
    title: designRenderData.title || job.data.title || activeShots[0]?.title || projectId,
    visualSystem: job.data.visualSystem || designRenderData.visualSystem || 'ultimate-1080p',
    render: {
      fps: resolvedRenderFps,
      width: resolvedRenderWidth,
      height: resolvedRenderHeight,
    },
    shots: activeShots,
    voiceFile: publicVoiceFile,
    audioSegments: Array.isArray(audioSegments) && audioSegments.length > 0 ? audioSegments : null,
    subtitleData: resolvedUltimateSubtitleData.length > 0 ? resolvedUltimateSubtitleData : null,
  });

  const propsJson = JSON.stringify(remotionProps);

  // 构建渲染命令（在项目根目录执行）
  // remotionDir 已在 stageRemotionRender 开头声明并预热
  const launch = resolveRemotionLaunch(remotionDir);

  // P1: 并发数 — 优先读 env，否则按 RAM 估算（16GB → 5）
  const RAM_GB_MB = Math.floor(require('os').totalmem() / (1024 * 1024));
  const RAM_GB = RAM_GB_MB / 1024;
  const concurrencyLevel = process.env.REMOTION_CONCURRENCY
    ? Number(process.env.REMOTION_CONCURRENCY)
    : Math.min(6, Math.max(2, Math.floor(RAM_GB / 3)));

  const args = [
    'render',
    'src/Root.tsx',
    compositionId,
    outputFile,
    '--props', propsJson,
    '--hardware-acceleration', 'if-possible',
    '--log', 'info',
  ];

  // P0: --serve build — 仅当 build/index.html 存在时（复用 bundle，消除 public 目录复制）
  if (fs.existsSync(path.join(remotionDir, 'build', 'index.html'))) {
    args.push('--serve', 'build');
  }

  // P1: --concurrency — 控制 Remotion 内部帧渲染并发
  args.push('--concurrency', String(concurrencyLevel));

  if (resolvedFrameRange) {
    args.push('--frames', `${resolvedFrameRange[0]}-${resolvedFrameRange[1]}`);
  }

  logger.info('remotion-render-started', {
    jobId: job.id,
    projectId,
    template: 'ultimate',
    compositionId,
    outputFile,
    command: launch.displayCommand,
    frameRange: resolvedFrameRange ?? null,
  });
  update(45, 'Remotion 渲染中（请稍候）...');

  let stdout = '';
  let stderr = '';

  try {
    const exitCode = await new Promise((resolve, reject) => {
      const proc = spawn(launch.command, [...launch.argsPrefix, ...args], {
        cwd: remotionDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: {
          ...process.env,
          REMOTION_PUBLIC_DIR: path.join(remotionDir, 'public'),
          // REMOTION_GL 已移除 — 允许 Remotion 自动选择 Metal/ANGLE（GPU 渲染）
        },
      });
      trackChildProcess(proc, {
        kind: 'remotion-render',
        jobId: job.id,
        projectId,
      });
      trackProcess(proc, `render-${job.id}`);

      const renderTimeout = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Remotion render timeout (${RENDER_TIMEOUT_MS}ms)`));
      }, RENDER_TIMEOUT_MS);
      if (typeof renderTimeout.unref === 'function') {
        renderTimeout.unref();
      }

      proc.stdout.on('data', (d) => {
        const line = d.toString().trim();
        stdout += line + '\n';
        logger.debug('remotion-stdout', {
          jobId: job.id,
          projectId,
          line,
        });

        // 解析进度
        const pctMatch = line.match(/(\d+)%/);
        if (pctMatch) {
          const pct = 45 + Math.round(parseInt(pctMatch[1]) * 0.5);
          update(Math.min(pct, 94), `渲染中 ${pctMatch[1]}%`);
        }

        // 渲染完成
        if (line.includes('Rendered') || line.includes('Done') || line.includes('successfully')) {
          update(95, '✅ 渲染完成');
        }
      });

      proc.stderr.on('data', (d) => {
        const line = d.toString().trim();
        if (line) {
          stderr += line + '\n';
          logger.warn('remotion-stderr', {
            jobId: job.id,
            projectId,
            line,
          });
        }
      });

      proc.on('close', (code) => {
        clearTimeout(renderTimeout);
        logger.info('remotion-render-exited', {
          jobId: job.id,
          projectId,
          exitCode: code ?? 1,
        });
        resolve(code ?? 1);
      });

      proc.on('error', (err) => {
        clearTimeout(renderTimeout);
        logger.error('remotion-spawn-error', {
          jobId: job.id,
          projectId,
          error: err,
        });
        reject(err);
      });
    });

    if (exitCode !== 0) {
      throw new Error(`Remotion render failed with code ${exitCode}\n${stderr.slice(-500)}`);
    }

    // 确认输出文件存在
    if (!fs.existsSync(outputFile)) {
      throw new Error(`Output file not created: ${outputFile}`);
    }

    update(95, '✅ 视频渲染完成');
    return {
      outputFile,
      renderMeta: {
        frameRange: resolvedFrameRange,
        durationInFrames: directDurationInFrames || resolvedDurationInFrames,
        usedDesignJson: Boolean(job.data.designJson),
        audioSegmentCount: Array.isArray(audioSegments) ? audioSegments.length : 0,
        subtitleCueCount: resolvedSubtitleData.length,
      },
    };

  } catch (err) {
    logger.error('remotion-render-failed', {
      jobId: job.id,
      projectId,
      template,
      error: err,
    });
    throw err;
  }
}

// ─── Stage 4: Webhook ───────────────────────────────────
async function stageWebhook(job, result, update) {
  update(98, '发送回调...');
  const { webhook } = job.data;
  if (!webhook) {
    update(100, '✅ 全部完成');
    return;
  }

  try {
    if (typeof globalThis.fetch !== 'function') {
      logger.warn('webhook-skipped', {
        jobId: job.id,
        projectId: job.data?.projectId,
        reason: 'fetch-unavailable',
      });
      update(100, '✅ 全部完成');
      return;
    }

    await globalThis.fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        status: 'completed',
        result,
        completedAt: new Date().toISOString(),
      }),
    });
    logger.info('webhook-sent', {
      jobId: job.id,
      projectId: job.data?.projectId,
      webhook,
    });
  } catch (e) {
    logger.warn('webhook-failed', {
      jobId: job.id,
      projectId: job.data?.projectId,
      webhook,
      error: e,
    });
  }

  update(100, '✅ 全部完成');
}

// ─── 回退字幕 ────────────────────────────────────────────
function generateShotAlignedSRT(shots) {
  if (!Array.isArray(shots) || shots.length === 0) {
    return '';
  }

  let cursorMs = 0;
  const segments = [];

  shots.forEach((shot, index) => {
    const text = String(shot?.narration || shot?.text || '').trim();
    if (!text) {
      return;
    }

    const durationSeconds = Math.max(0.1, Number(shot?.durationSeconds) || 0);
    const durationMs = Math.max(800, Math.round(durationSeconds * 1000));
    const chunks = chunkFallbackSubtitles(text);
    const chunkChars = Math.max(
      1,
      chunks.reduce((sum, chunk) => sum + chunk.replace(/\s+/g, '').length, 0),
    );
    let localCursor = cursorMs;

    chunks.forEach((chunk, chunkIndex) => {
      const remainingMs = cursorMs + durationMs - localCursor;
      const remainingChunks = chunks.length - chunkIndex;
      const weightedDuration = chunkIndex === chunks.length - 1
        ? remainingMs
        : Math.max(
            400,
            Math.min(
              Math.round((chunk.replace(/\s+/g, '').length / chunkChars) * durationMs),
              remainingMs - (remainingChunks - 1) * 400,
            ),
          );

      const startMs = localCursor;
      const endMs = chunkIndex === chunks.length - 1 ? cursorMs + durationMs : localCursor + weightedDuration;
      localCursor = endMs;

      segments.push([
        String(segments.length + 1),
        `${formatSrtTimestamp(startMs)} --> ${formatSrtTimestamp(endMs)}`,
        chunk,
      ].join('\n'));
    });

    cursorMs += durationMs;
  });

  return segments.join('\n\n');
}

function generateFallbackSRT(text) {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  const subtitleText = normalized || '视频旁白';
  const chunks = chunkFallbackSubtitles(subtitleText);
  const minChunkDurationMs = 1500;
  const totalChars = Math.max(
    1,
    chunks.reduce((sum, chunk) => sum + chunk.replace(/\s+/g, '').length, 0),
  );
  const estimatedDurationMs = Math.max(
    chunks.length * minChunkDurationMs,
    Math.ceil(subtitleText.replace(/\s+/g, '').length / 4) * 1000,
  );

  let cursorMs = 0;

  return chunks
    .map((chunk, index) => {
      const remainingMs = estimatedDurationMs - cursorMs;
      const remainingChunks = chunks.length - index;
      const weightedDurationMs =
        index === chunks.length - 1
          ? remainingMs
          : Math.max(
              minChunkDurationMs,
              Math.min(
                Math.round((chunk.replace(/\s+/g, '').length / totalChars) * estimatedDurationMs),
                remainingMs - (remainingChunks - 1) * minChunkDurationMs,
              ),
            );

      const startMs = cursorMs;
      const endMs = index === chunks.length - 1 ? estimatedDurationMs : cursorMs + weightedDurationMs;
      cursorMs = endMs;

      return [
        String(index + 1),
        `${formatSrtTimestamp(startMs)} --> ${formatSrtTimestamp(endMs)}`,
        chunk,
      ].join('\n');
    })
    .join('\n\n');
}

function chunkFallbackSubtitles(text) {
  const clauses = text.match(/[^，。！？；：,.!?;:]+[，。！？；：,.!?;:]*/g) ?? [text];
  const chunks = [];
  let current = '';

  for (const clause of clauses) {
    const nextClause = clause.trim();
    if (!nextClause) {
      continue;
    }

    const candidate = `${current}${nextClause}`;
    if (current && candidate.replace(/\s+/g, '').length > 24) {
      chunks.push(current.trim());
      current = nextClause;
      continue;
    }

    current = candidate;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : ['视频旁白'];
}

function buildCompatibilityShotTitle(text, index, fallbackTitle = '') {
  if (index === 0 && typeof fallbackTitle === 'string' && fallbackTitle.trim()) {
    return fallbackTitle.trim();
  }

  const firstClause = String(text || '')
    .split(/[，。！？；：,.!?;:\n]/)
    .map((item) => item.trim())
    .find(Boolean);

  return firstClause ? firstClause.slice(0, 24) : `段落 ${index + 1}`;
}

function groupCompatibilityUnits(units, groupCount) {
  const groups = Array.from({length: groupCount}, () => []);

  units.forEach((unit, index) => {
    const targetIndex = Math.min(
      groupCount - 1,
      Math.floor((index * groupCount) / Math.max(1, units.length)),
    );
    groups[targetIndex].push(unit);
  });

  return groups.filter((group) => group.length > 0);
}

function buildUltimateCompatibilityShots({
  script,
  subtitleText,
  durationInFrames,
  fps,
  title,
}) {
  const sourceText = [script, subtitleText]
    .find((value) => typeof value === 'string' && value.trim())
    ?.trim();

  if (!sourceText) {
    return [];
  }

  const units = chunkFallbackSubtitles(sourceText)
    .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (units.length === 0) {
    return [];
  }

  const targetFrameCount = Math.max(
    getPositiveInt(durationInFrames) ?? 0,
    Math.round(fps * 6),
    units.length * Math.max(24, Math.round(fps * 1.8)),
  );
  const preferredGroupCount = targetFrameCount >= fps * 18 ? 3 : targetFrameCount >= fps * 10 ? 2 : 1;
  const groups = groupCompatibilityUnits(units, Math.min(preferredGroupCount, units.length));
  const totalChars = Math.max(
    1,
    groups.reduce((sum, group) => sum + group.join('').replace(/\s+/g, '').length, 0),
  );

  let assignedFrames = 0;

  return groups.map((group, index) => {
    const narration = group.join(' ');
    const contentChars = Math.max(1, narration.replace(/\s+/g, '').length);
    const remainingGroups = groups.length - index;
    const remainingFrames = Math.max(1, targetFrameCount - assignedFrames);
    const estimatedFrames = index === groups.length - 1
      ? remainingFrames
      : Math.max(
          Math.round(fps * 3),
          Math.min(
            Math.round((contentChars / totalChars) * targetFrameCount),
            remainingFrames - Math.max(0, remainingGroups - 1) * Math.round(fps * 3),
          ),
        );
    assignedFrames += estimatedFrames;

    return {
      id: `compat-${String(index + 1).padStart(2, '0')}`,
      title: buildCompatibilityShotTitle(narration, index, title),
      narration,
      durationSeconds: Number((estimatedFrames / fps).toFixed(2)),
      visualSummaryZh: narration,
      visualFocusZh: buildCompatibilityShotTitle(narration, index),
      storyboardCueZh: narration.slice(0, 48),
      sceneIntent: '兼容旧输入并映射到 Ultimate 分镜',
      keywords: [],
      dataPoints: [],
    };
  });
}

function normalizeSubtitlePayload(subtitleData) {
  if (!Array.isArray(subtitleData)) {
    return [];
  }

  return subtitleData
    .map((subtitle, index) => normalizeSubtitleCue(subtitle, index))
    .filter(Boolean)
    .sort((a, b) => a.startFrame - b.startFrame);
}

function normalizeSubtitleCue(subtitle, index) {
  if (!subtitle || typeof subtitle !== 'object') {
    return null;
  }

  const startFrame = Math.max(0, getPositiveInt(subtitle.startFrame) ?? 0);
  const endFrame = Math.max(startFrame + 1, getPositiveInt(subtitle.endFrame) ?? startFrame + 1);
  const normalizedWords = Array.isArray(subtitle.words)
    ? subtitle.words
      .map((word) => normalizeSubtitleWord(word, startFrame, endFrame))
      .filter(Boolean)
      .sort((a, b) => a.startFrame - b.startFrame)
    : [];
  const text = typeof subtitle.text === 'string'
    ? subtitle.text.replace(/<[^>]+>/g, '').trim()
    : joinCaptionWords(normalizedWords.map((word) => word.text));

  if (!text) {
    return null;
  }

  return {
    index: getPositiveInt(subtitle.index) ?? index + 1,
    startFrame,
    endFrame,
    startMs: Math.max(0, getPositiveInt(subtitle.startMs) ?? Math.round((startFrame / 30) * 1000)),
    endMs: Math.max(0, getPositiveInt(subtitle.endMs) ?? Math.round((endFrame / 30) * 1000)),
    text,
    words: normalizedWords.length > 0 ? normalizedWords : null,
  };
}

function normalizeSubtitleWord(word, cueStartFrame, cueEndFrame) {
  if (!word || typeof word !== 'object') {
    return null;
  }

  const text = typeof word.text === 'string'
    ? word.text.trim()
    : typeof word.word === 'string'
      ? word.word.trim()
      : '';

  if (!text) {
    return null;
  }

  const fallbackEndFrame = Math.max(cueStartFrame + 1, cueEndFrame);
  const startFrame = Math.max(
    cueStartFrame,
    Math.min(fallbackEndFrame - 1, getPositiveInt(word.startFrame) ?? getPositiveInt(word.start) ?? cueStartFrame),
  );
  const endFrame = Math.max(
    startFrame + 1,
    Math.min(fallbackEndFrame, getPositiveInt(word.endFrame) ?? getPositiveInt(word.end) ?? fallbackEndFrame),
  );

  return {
    text,
    startFrame,
    endFrame,
    startMs: Math.max(0, getPositiveInt(word.startMs) ?? Math.round((startFrame / 30) * 1000)),
    endMs: Math.max(0, getPositiveInt(word.endMs) ?? Math.round((endFrame / 30) * 1000)),
    confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
    isKeyword: typeof word.isKeyword === 'boolean'
      ? word.isKeyword
      : typeof word.is_keyword === 'boolean'
        ? word.is_keyword
        : undefined,
  };
}

function serializeSubtitlesToSrt(subtitleData) {
  return normalizeSubtitlePayload(subtitleData)
    .map((subtitle, index) => {
      return [
        String(index + 1),
        `${formatSrtTimestamp(subtitle.startMs)} --> ${formatSrtTimestamp(subtitle.endMs)}`,
        subtitle.text,
      ].join('\n');
    })
    .join('\n\n');
}

function parseSrtFileToSubtitleData(filePath, fps) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return parseSrtContentToSubtitleData(content, fps);
}

function parseSrtContentToSubtitleData(content, fps) {
  if (typeof content !== 'string' || !content.trim()) {
    return [];
  }

  return content
    .trim()
    .split(/\r?\n\r?\n+/)
    .map((block, index) => {
      const lines = block.split(/\r?\n/).map((line) => line.trimEnd());
      if (lines.length < 3) {
        return null;
      }

      const timeMatch = lines[1].match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/,
      );
      if (!timeMatch) {
        return null;
      }

      const startMs =
        Number(timeMatch[1]) * 3600000 +
        Number(timeMatch[2]) * 60000 +
        Number(timeMatch[3]) * 1000 +
        Number(timeMatch[4]);
      const endMs =
        Number(timeMatch[5]) * 3600000 +
        Number(timeMatch[6]) * 60000 +
        Number(timeMatch[7]) * 1000 +
        Number(timeMatch[8]);
      const text = lines.slice(2).join('\n').replace(/<[^>]+>/g, '').trim();

      if (!text) {
        return null;
      }

      const startFrame = Math.round((startMs / 1000) * fps);
      const endFrame = Math.max(startFrame + 1, Math.round((endMs / 1000) * fps));

      return {
        index: index + 1,
        startFrame,
        endFrame,
        startMs,
        endMs,
        text,
        words: null,
      };
    })
    .filter(Boolean);
}

function getDesignRenderData(designJson) {
  if (!designJson || typeof designJson !== 'object') {
    return createEmptyDesignRenderData();
  }

  const tracks = Array.isArray(designJson.tracks) ? designJson.tracks : [];
  const trackItemsMap =
    designJson.trackItemsMap && typeof designJson.trackItemsMap === 'object'
      ? designJson.trackItemsMap
      : {};
  const renderFps = getPositiveInt(designJson.fps) ?? 30;
  const renderWidth = getPositiveInt(designJson.width);
  const renderHeight = getPositiveInt(designJson.height);
  const durationInFrames = getPositiveInt(designJson.duration);
  const captionTracks = tracks.filter((track) => track && track.type === 'caption');
  const audioTracks = tracks.filter((track) => track && (track.type === 'voiceover' || track.type === 'audio'));
  const captionItems = captionTracks
    .flatMap((track) => (Array.isArray(track.items) ? track.items : []))
    .map((itemId) => trackItemsMap[itemId])
    .filter((item) => item && item.details && item.details.type === 'caption')
    .sort((a, b) => (getPositiveInt(a.start) ?? 0) - (getPositiveInt(b.start) ?? 0));
  const subtitleData = captionItems.flatMap((item) => buildSubtitleDataFromCaptionItem(item, renderFps));
  const subtitleText = captionItems
    .map((item) => {
      if (typeof item.details.text === 'string' && item.details.text.trim()) {
        return item.details.text.trim();
      }

      const words = Array.isArray(item.details.words) ? item.details.words.map((word) => word.word) : [];
      return joinCaptionWords(words);
    })
    .filter(Boolean)
    .join('\n');
  const captionStyleSegments = captionItems
    .map((item) => buildCaptionStyleSegment(item, renderWidth))
    .filter(Boolean);
  const audioSegments = audioTracks
    .flatMap((track) => (Array.isArray(track.items) ? track.items : []))
    .map((itemId) => trackItemsMap[itemId])
    .filter((item) => {
      return item && item.details && (item.details.type === 'voiceover' || item.details.type === 'audio');
    })
    .map((item) => {
      const src = typeof item.details.src === 'string' ? item.details.src.trim() : '';
      if (!src) {
        return null;
      }

      return {
        src,
        startFrame: Math.max(0, getPositiveInt(item.start) ?? 0),
        durationInFrames: Math.max(
          1,
          getPositiveInt(item.duration) ?? getPositiveInt(item.details.duration) ?? 1,
        ),
      };
    })
    .filter(Boolean);

  return {
    subtitleData: subtitleData.length > 0 ? subtitleData : null,
    subtitleText: subtitleText || null,
    durationInFrames,
    renderFps,
    renderWidth,
    renderHeight,
    captionStyleSegments,
    audioSegments,
  };
}

function createEmptyDesignRenderData() {
  return {
    subtitleData: null,
    subtitleText: null,
    durationInFrames: null,
    renderFps: null,
    renderWidth: null,
    renderHeight: null,
    captionStyleSegments: [],
    audioSegments: [],
  };
}

function buildSubtitleDataFromCaptionItem(item, fps) {
  const itemStart = Math.max(0, getPositiveInt(item.start) ?? 0);
  const itemDuration = Math.max(
    1,
    getPositiveInt(item.duration) ?? getPositiveInt(item.details?.duration) ?? 1,
  );
  const itemWords = normalizeCaptionWords(item.details?.words);
  const endFrame = itemStart + itemDuration;
  const itemText = typeof item.details?.text === 'string' && item.details.text.trim()
    ? item.details.text.trim()
    : joinCaptionWords(itemWords.map((word) => word.text));

  if (!itemText) {
    return [];
  }

  return [
    {
      index: 1,
      startFrame: itemStart,
      endFrame,
      startMs: Math.round((itemStart / fps) * 1000),
      endMs: Math.round((endFrame / fps) * 1000),
      text: itemText,
      words: itemWords.length > 0
        ? itemWords.map((word) => {
          const wordStartFrame = itemStart + word.startFrame;
          const wordEndFrame = Math.max(wordStartFrame + 1, itemStart + word.endFrame);
          return {
            text: word.text,
            startFrame: wordStartFrame,
            endFrame: wordEndFrame,
            startMs: Math.round((wordStartFrame / fps) * 1000),
            endMs: Math.round((wordEndFrame / fps) * 1000),
            confidence: word.confidence,
            isKeyword: word.isKeyword,
          };
        })
        : null,
      },
  ];
}

function normalizeCaptionWords(words) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  return words
    .map((word) => {
      const token = typeof word?.word === 'string' ? word.word.trim() : '';
      if (!token) {
        return null;
      }

      const startFrame = Math.max(0, getPositiveInt(word.start) ?? 0);
      const endFrame = Math.max(startFrame + 1, getPositiveInt(word.end) ?? startFrame + 1);
      return {
        text: token,
        startFrame,
        endFrame,
        confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
        isKeyword: typeof word.is_keyword === 'boolean' ? word.is_keyword : undefined,
      };
    })
    .filter(Boolean);
}

function joinCaptionWords(words) {
  const tokens = words
    .map((word) => (typeof word === 'string' ? word.trim() : ''))
    .filter(Boolean);

  let result = '';
  for (const token of tokens) {
    if (!result) {
      result = token;
      continue;
    }

    const previousChar = result.slice(-1);
    const shouldGlue =
      /^[，。！？；：,.!?;:]/.test(token) ||
      /[\u3400-\u9fff]$/.test(previousChar) ||
      /^[\u3400-\u9fff]/.test(token);

    result += shouldGlue ? token : ` ${token}`;
  }

  return result.replace(/\s+([，。！？；：,.!?;:])/g, '$1').trim();
}

function materializeAudioSegments(audioSegments, projectId) {
  if (!Array.isArray(audioSegments) || audioSegments.length === 0) {
    return [];
  }

  const projectVoiceDir = path.join(VOICE_DIR, projectId);
  if (!fs.existsSync(projectVoiceDir)) {
    fs.mkdirSync(projectVoiceDir, { recursive: true });
  }

  return audioSegments
    .map((segment, index) => {
      if (!segment || typeof segment !== 'object' || typeof segment.src !== 'string') {
        return null;
      }

      const sourcePath = segment.src.trim();
      if (!sourcePath) {
        return null;
      }

      if (/^https?:\/\//.test(sourcePath)) {
        if (!SECURITY_CONFIG.allowRemoteMedia) {
          return null;
        }
        return {
          src: sourcePath,
          startFrame: Math.max(0, getPositiveInt(segment.startFrame) ?? 0),
          durationInFrames: Math.max(1, getPositiveInt(segment.durationInFrames) ?? 1),
        };
      }

      const resolvedSource = resolvePublicAssetFile(sourcePath);
      if (!resolvedSource) {
        return null;
      }

      const ext = path.extname(resolvedSource) || '.wav';
      const outputBasename = `design_${String(index + 1).padStart(2, '0')}${ext}`;
      const outputPath = path.join(projectVoiceDir, outputBasename);
      fs.copyFileSync(resolvedSource, outputPath);

      return {
        src: `/assets/voice/${projectId}/${outputBasename}`,
        startFrame: Math.max(0, getPositiveInt(segment.startFrame) ?? 0),
        durationInFrames: Math.max(1, getPositiveInt(segment.durationInFrames) ?? 1),
      };
    })
    .filter(Boolean);
}

function buildCaptionStyleSegment(item, renderWidth) {
  if (!item || !item.details || item.details.type !== 'caption') {
    return null;
  }

  const startFrame = Math.max(0, getPositiveInt(item.start) ?? 0);
  const endFrame = Math.max(
    startFrame + 1,
    startFrame + (getPositiveInt(item.duration) ?? getPositiveInt(item.details.duration) ?? 1),
  );
  const left = typeof item.details.left === 'string' ? item.details.left : undefined;
  const top = typeof item.details.top === 'string' ? item.details.top : undefined;
  const inferredWidth = inferCaptionWidth(left, renderWidth);

  return {
    startFrame,
    endFrame,
    style: {
      fontSize: getPositiveInt(item.details.fontSize) ?? 64,
      fontFamily: typeof item.details.fontFamily === 'string' ? item.details.fontFamily : undefined,
      fontWeight: item.details.fontWeight,
      fontStyle: item.details.fontStyle,
      color: item.details.color,
      backgroundColor: item.details.backgroundColor,
      borderColor: item.details.borderColor,
      borderWidth: getPositiveInt(item.details.borderWidth) ?? 0,
      textAlign: item.details.textAlign,
      textShadow: item.details.textShadow,
      strokeColor: item.details.WebkitTextStrokeColor,
      strokeWidth: item.details.WebkitTextStrokeWidth,
      lineHeight: item.details.lineHeight,
      letterSpacing: item.details.letterSpacing,
      wordSpacing: item.details.wordSpacing,
      linesPerCaption: getPositiveInt(item.details.linesPerCaption) ?? 1,
      wordWrap: item.details.wordWrap,
      wordBreak: item.details.wordBreak,
      opacity: getPositiveInt(item.details.opacity) ?? 100,
      top,
      left,
      height: getPositiveInt(item.details.height) ?? 80,
      width: inferredWidth,
      appearedColor: item.details.appearedColor,
      activeColor: item.details.activeColor,
      activeFillColor: item.details.activeFillColor,
      boxShadow: item.details.boxShadow ?? null,
      transform: item.details.transform,
      blur: typeof item.details.blur === 'number' ? item.details.blur : 0,
      brightness: typeof item.details.brightness === 'number' ? item.details.brightness : 100,
    },
  };
}

function inferCaptionWidth(left, renderWidth) {
  const parsedLeft = parsePixelValue(left);
  if (!renderWidth || parsedLeft === null) {
    return 800;
  }

  return Math.max(320, renderWidth - parsedLeft * 2);
}

function parsePixelValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : null;
}

function getPositiveInt(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.round(Number(value));
  return normalized > 0 ? normalized : null;
}

function resolveRenderFrameRange(options, durationInFrames) {
  if (!durationInFrames || !options || typeof options !== 'object') {
    return null;
  }

  if (Array.isArray(options.frameRange) && options.frameRange.length === 2) {
    const start = Math.max(0, Math.round(Number(options.frameRange[0]) || 0));
    const end = Math.min(durationInFrames - 1, Math.round(Number(options.frameRange[1]) || 0));
    return end >= start ? [start, end] : null;
  }

  if (options.smokeTest) {
    const smokeDurationFrames = getPositiveInt(options.smokeDurationFrames) ?? DEFAULT_SMOKE_DURATION_FRAMES;
    return [0, Math.min(durationInFrames - 1, smokeDurationFrames - 1)];
  }

  return null;
}

function resolveExistingSubtitleFile(subtitleFile) {
  return resolvePublicAssetFile(subtitleFile);
}

function resolvePublicAssetFile(assetPath) {
  if (typeof assetPath !== 'string' || !assetPath.trim()) {
    return null;
  }

  const normalizedPath = assetPath
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^public\//, '')
    .replace(/^\.?\//, '');
  const publicAssetPath = normalizedPath.startsWith('assets/')
    ? `/${normalizedPath}`
    : normalizedPath.startsWith('/assets/')
      ? normalizedPath
      : normalizedPath.startsWith('voice/')
        ? `/assets/${normalizedPath}`
        : normalizedPath.startsWith('/voice/')
          ? `/assets${normalizedPath}`
          : null;

  if (!publicAssetPath) {
    return null;
  }

  const safeAssetPath = path.posix.normalize(publicAssetPath);
  if (!safeAssetPath.startsWith('/assets/') || safeAssetPath.includes('..')) {
    return null;
  }

  const candidatePath = path.join(PUBLIC_DIR, safeAssetPath.replace(/^\//, ''));
  return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    ? candidatePath
    : null;
}

function formatSrtTimestamp(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = safeMs % 1000;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':') + `,${String(milliseconds).padStart(3, '0')}`;
}

async function synthesizeShotAudioSegments({
  job,
  projectId,
  projectVoiceDir,
  renderFps,
  voiceSettings,
  shots,
  update,
}) {
  if (!Array.isArray(shots) || shots.length === 0) {
    return null;
  }

  const validShots = shots.filter((shot) => {
    const speech = resolveShotSpeechPlan(shot, voiceSettings);
    return Boolean(speech.rawText);
  });

  if (validShots.length === 0) {
    return null;
  }

  const {
    voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
  } = await prepareVoiceSynthesisPlan(voiceSettings, update);

  const jobVoiceDir = path.join(projectVoiceDir, job.id);
  if (!fs.existsSync(jobVoiceDir)) fs.mkdirSync(jobVoiceDir, { recursive: true });

  const audioSegments = [];
  const shotRuntime = [];

  // Batch synthesize in groups of 6 — Qwen TTS handles concurrency well
  const BATCH_SIZE = 6;
  for (let batchStart = 0; batchStart < validShots.length; batchStart += BATCH_SIZE) {
    const batch = validShots.slice(batchStart, batchStart + BATCH_SIZE);
    const batchPromises = batch.map((shot, batchIdx) => {
      const index = batchStart + batchIdx;
      const speech = resolveShotSpeechPlan(shot, voiceSettings);
      const fileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFileSegment(shot.id)}.wav`;
      const outputPath = path.join(jobVoiceDir, fileName);

      update(
        Math.min(18, 8 + Math.round(((index + 1) / validShots.length) * 10)),
        `分镜配音 ${index + 1}/${validShots.length}: ${shot.title || shot.id}`,
      );

      return synthesizeQwenTtsToFile({
        text: speech.spokenText,
        voice: voiceRequest || resolveQwenTtsDefaultVoice(process.env),
        language: speech.language || requestLanguage,
        outputPath,
        model: requestModel || resolveQwenSynthesisModel({env: process.env}),
        speed: requestSpeed,
        env: process.env,
      }).then(() => {
        const durationSeconds = probeDurationSeconds(outputPath);
        return { shot, speech, outputPath, publicSrc: `/assets/voice/${projectId}/${job.id}/${fileName}`, durationSeconds };
      });
    });

    const batchResults = await Promise.all(batchPromises);
    shotRuntime.push(...batchResults);
  }

  const syncedShots = applyAudioDurationsToShots(shots, shotRuntime, renderFps);
  const sceneTimeline = buildShotTimelineFrames(syncedShots, renderFps);

  for (let index = 0; index < shotRuntime.length; index += 1) {
    const runtime = shotRuntime[index];
    const timelineEntry = sceneTimeline.find((entry) => entry.id === runtime.shot.id);
    if (!timelineEntry) {
      continue;
    }

    audioSegments.push({
      src: runtime.publicSrc,
      startFrame: timelineEntry.audioStartFrame,
      durationInFrames: runtime.durationInFrames,
    });
  }

  let subtitleData = buildSubtitleDataFromShotRuntime(shotRuntime, sceneTimeline, renderFps);

  if ((process.env.DEEPGRAM_API_KEY || process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY) && subtitleData.length > 0) {
    try {
      subtitleData = await enrichSubtitleDataWithWordTimings(shotRuntime, sceneTimeline, renderFps, subtitleData);
    } catch (error) {
      logger.warn('segment-subtitle-enrichment-failed', {
        jobId: job.id,
        projectId,
        error,
      });
    }
  }

  return {
    audioSegments,
    subtitleData,
    syncedShots,
  };
}

function applyAudioDurationsToShots(shots, shotRuntime, renderFps) {
  const runtimeById = new Map(shotRuntime.map((item) => [item.shot.id, item]));

  return shots.map((shot) => {
    const runtime = runtimeById.get(shot.id);
    if (!runtime) {
      const fallbackFrames = Math.max(
        1,
        getPositiveInt(shot.frames)
          ?? Math.round((Math.max(0.2, Number(shot.durationSeconds) || 0) || 0.2) * renderFps),
      );
      return {
        ...shot,
        frames: fallbackFrames,
        durationSeconds: Number((fallbackFrames / renderFps).toFixed(3)),
      };
    }

    const scenePaddingFrames = estimateScenePaddingFrames(runtime.durationInFrames, renderFps);
    const sceneFrames = Math.max(runtime.durationInFrames + scenePaddingFrames, runtime.durationInFrames);
    return {
      ...shot,
      frames: sceneFrames,
      durationSeconds: Number((sceneFrames / renderFps).toFixed(3)),
      audioDurationSeconds: runtime.durationSeconds,
      audioDurationInFrames: runtime.durationInFrames,
    };
  });
}

function estimateScenePaddingFrames(durationInFrames, fps) {
  const fadePadding = Math.min(Math.round(fps * 0.22), Math.max(4, Math.round(durationInFrames * 0.08)));
  return Math.max(4, fadePadding);
}

function buildShotTimelineFrames(shots, fps) {
  const timeline = [];
  let visualCursor = 0;

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const durationInFrames = Math.max(
      1,
      getPositiveInt(shot.frames)
        ?? Math.round((Math.max(0.2, Number(shot.durationSeconds) || 0) || 0.2) * fps),
    );
    const audioDurationInFrames = Math.max(
      1,
      getPositiveInt(shot.audioDurationInFrames)
        ?? Math.round((Math.max(0.2, Number(shot.audioDurationSeconds) || 0) || 0.2) * fps),
    );
    const overlap = index === 0
      ? 0
      : Math.min(12, Math.max(0, Math.min(durationInFrames, timeline[index - 1].durationInFrames) - 1));
    const visualStartFrame = Math.max(0, visualCursor - overlap);
    const audioStartFrame = index === 0
      ? 0
      : timeline[index - 1].audioStartFrame + timeline[index - 1].audioDurationInFrames;

    timeline.push({
      id: shot.id,
      visualStartFrame,
      audioStartFrame,
      durationInFrames,
      audioDurationInFrames,
      overlap,
    });

    visualCursor = visualStartFrame + durationInFrames;
  }

  return timeline;
}

function buildSubtitleDataFromShotRuntime(shotRuntime, sceneTimeline, fps) {
  const subtitleData = [];

  for (let index = 0; index < shotRuntime.length; index += 1) {
    const runtime = shotRuntime[index];
    const timelineEntry = sceneTimeline.find((entry) => entry.id === runtime.shot.id);
    if (!timelineEntry) {
      continue;
    }

    const cueStartFrame = timelineEntry.audioStartFrame;
    const cueEndFrame = cueStartFrame + runtime.durationInFrames;
    const cueText = runtime.speech.rawText;
    if (!cueText) {
      continue;
    }

    subtitleData.push({
      index: subtitleData.length + 1,
      startFrame: cueStartFrame,
      endFrame: cueEndFrame,
      startMs: Math.round((cueStartFrame / fps) * 1000),
      endMs: Math.round((cueEndFrame / fps) * 1000),
      text: cueText,
      words: buildSyntheticWordsForCue(cueText, cueStartFrame, cueEndFrame, fps),
    });
  }

  return subtitleData;
}

function buildSyntheticWordsForCue(text, startFrame, endFrame, fps) {
  const tokens = splitSubtitleTokens(text);
  if (tokens.length === 0) {
    return null;
  }

  const totalWeight = tokens.reduce((sum, token) => sum + Math.max(1, token.replace(/\s+/g, '').length), 0);
  const totalFrames = Math.max(1, endFrame - startFrame);
  let cursorFrame = startFrame;

  return tokens.map((token, index) => {
    const weight = Math.max(1, token.replace(/\s+/g, '').length);
    const nextFrame = index === tokens.length - 1
      ? endFrame
      : Math.min(
          endFrame,
          cursorFrame + Math.max(1, Math.round((weight / totalWeight) * totalFrames)),
        );
    const word = {
      text: token,
      startFrame: cursorFrame,
      endFrame: Math.max(cursorFrame + 1, nextFrame),
      startMs: Math.round((cursorFrame / fps) * 1000),
      endMs: Math.round((Math.max(cursorFrame + 1, nextFrame) / fps) * 1000),
    };
    cursorFrame = word.endFrame;
    return word;
  });
}

function splitSubtitleTokens(text) {
  const normalized = String(text || '').replace(/\n+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/([，。！？；：、“”‘’（）《》〈〉【】〔〕…,.!?;:()[\]"'`~\-]+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (/^[，。！？；：、“”‘’（）《》〈〉【】〔〕…,.!?;:()[\]"'`~\-]+$/.test(part)) {
        return [part];
      }
      if (/[\u3400-\u9fff]/.test(part)) {
        return part.match(/.{1,4}/g) ?? [part];
      }
      return part.split(/\s+/).filter(Boolean);
    });
}

async function enrichSubtitleDataWithWordTimings(shotRuntime, sceneTimeline, fps, fallbackSubtitleData) {
  const {transcribeAudioToWordTimings} = require('../subtitles/deepgramSubtitles');
  const subtitleById = new Map(fallbackSubtitleData.map((item, index) => [shotRuntime[index]?.shot.id, item]));

  for (let index = 0; index < shotRuntime.length; index += 1) {
    const runtime = shotRuntime[index];
    const timelineEntry = sceneTimeline.find((entry) => entry.id === runtime.shot.id);
    const subtitleCue = subtitleById.get(runtime.shot.id);
    if (!timelineEntry || !subtitleCue) {
      continue;
    }

    const words = await transcribeAudioToWordTimings(runtime.outputPath);
    if (!Array.isArray(words) || words.length === 0) {
      continue;
    }

    subtitleCue.words = words.map((word) => {
      const startMs = Math.round((word.start || 0) * 1000) + Math.round((timelineEntry.audioStartFrame / fps) * 1000);
      const endMs = Math.round((word.end || 0) * 1000) + Math.round((timelineEntry.audioStartFrame / fps) * 1000);
      const startFrame = Math.round((startMs / 1000) * fps);
      const endFrame = Math.max(startFrame + 1, Math.round((endMs / 1000) * fps));
      return {
        text: String(word.word || word.text || '').trim(),
        startFrame,
        endFrame,
        startMs,
        endMs,
        confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
      };
    }).filter((word) => word.text);
  }

  return fallbackSubtitleData;
}

// ─── 主处理函数 ─────────────────────────────────────────
async function processRenderJob(job, update) {
  logger.info('job-started', {
    jobId: job.id,
    jobType: job.name || job.type || 'render',
    template: job.data.template || 'ultimate',
    projectId: job.data.projectId || 'default',
  });

  try {
    // Compute designRenderData once and pass to all stages (avoids 3 repeated calls)
    const sharedDesignData = getDesignRenderData(job.data.designJson);

    // Stage 1
    const stage1 = await stageVoiceSynthesis(job, update, sharedDesignData);

    // Stage 2
    const stage2 = await stageSubtitleGeneration(job, stage1.voiceFile, stage1.generatedSubtitleData, stage1.syncedShots, update, sharedDesignData);

    // Stage 3
    const stage3 = await stageRemotionRender(job, { ...stage1, ...stage2 }, update, sharedDesignData);

    // Stage 4
    await stageWebhook(job, {
      outputFile: stage3.outputFile,
      voiceFile: stage1.voiceFile,
      subtitleFile: stage2.subtitleFile,
      audioSegments: stage1.audioSegments ?? [],
      renderMeta: stage3.renderMeta ?? null,
    }, update);

    logger.info('job-completed', {
      jobId: job.id,
      jobType: job.name || job.type || 'render',
      projectId: job.data.projectId || 'default',
      outputFile: stage3.outputFile,
    });
    return {
      outputFile: stage3.outputFile,
      voiceFile: stage1.voiceFile,
      subtitleFile: stage2.subtitleFile,
      audioSegments: stage1.audioSegments ?? [],
      renderMeta: stage3.renderMeta ?? null,
    };

  } catch (err) {
    logger.error('job-failed', {
      jobId: job.id,
      jobType: job.name || job.type || 'render',
      projectId: job.data.projectId || 'default',
      error: err,
    });
    throw err;
  }
}

// ─── Worker 循环（文件队列版）────────────────────────────
function startFileBasedWorker() {
  assertQueueModeAllowed('file', SECURITY_CONFIG);
  const { startSimpleWorker } = require('../queue/fileQueue');

  logger.info('worker-started', {mode: 'file'});

  const workerController = startSimpleWorker({
    async render(job, updateProgress) {
      return await processRenderJob(job, updateProgress);
    },
    async voice(job, updateProgress) {
      return await processVoiceJob(job, updateProgress);
    },
  });

  startMonitoring();

  // File-mode worker: stay alive indefinitely, skip graceful shutdown handlers
  // that cause premature exit on shell backgrounding. Restart freely via supervisor.
  return workerController;
}

// ─── BullMQ Worker（Redis版）────────────────────────────
function startRedisWorker() {
  const { Worker } = require('bullmq');
  const Redis = require('ioredis');

  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on('error', err => logger.error('redis-error', {error: err}));

  const worker = new Worker('video-render', async (job) => {
    const update = (pct, msg) => job.updateProgress({ pct, msg });
    if (job.name === 'voice') {
      return await processVoiceJob(job, update);
    }
    return await processRenderJob(job, update);
  }, {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  });

  worker.on('completed', ({ id, returnvalue }) => {
    logger.info('queue-worker-job-completed', {
      jobId: id,
      outputFile: returnvalue?.outputFile,
    });
  });

  worker.on('failed', ({ id, failedReason }) => {
    logger.error('queue-worker-job-failed', {
      jobId: id,
      failedReason,
    });
  });

  worker.on('error', err => {
    logger.error('worker-error', {error: err});
  });

  logger.info('worker-started', {
    mode: 'redis',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  });

  installWorkerSignalHandlers({
    mode: 'redis',
    stop: async () => {
      await worker.close();
      await connection.quit();
      return {
        timedOut: false,
        activeJobId: null,
      };
    },
  });

  startMonitoring();

  return worker;
}

// ─── 工具函数 ───────────────────────────────────────────
function execFilePromise(command, args, { cwd, timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {cwd, shell: false});
    trackChildProcess(proc, {
      kind: 'exec-file',
      command,
      cwd: cwd || process.cwd(),
    });
    let stdout = '', stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Command timeout: ${command}`));
    }, timeout);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command failed (${code}): ${stderr || stdout}`));
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

// ─── 启动 ───────────────────────────────────────────────
const USE_REDIS = (process.env.PIPELINE_QUEUE_MODE || 'file').toLowerCase() === 'redis';

if (require.main === module) {
  if (USE_REDIS) {
    startRedisWorker();
  } else {
    startFileBasedWorker();
  }
}

module.exports = {
  processRenderJob,
  processVoiceJob,
  startFileBasedWorker,
  startRedisWorker,
  buildShotTimelineFrames,
  buildSubtitleDataFromShotRuntime,
  generateFallbackSRT,
  parseSrtContentToSubtitleData,
  splitSubtitleTokens,
  synthesizeShotAudioSegments,
};

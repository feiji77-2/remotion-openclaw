/**
 * OpenClaw Video Render Worker（真实渲染版）
 *
 * Stage 1: 配音合成（ChatTTS / MeloTTS）
 * Stage 2: 字幕生成（Deepgram/Whisper → SRT）
 * Stage 3: Remotion 真实渲染 ← 接入真实命令
 * Stage 4: Webhook 回调
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { processVoiceJob } = require('../voice/voiceJob');
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
  isUltimateProject,
} = require('../../scripts/lib/ultimate-project-adapter.js');

const OUTPUT_DIR = OUTPUT_ASSETS_DIR;
const VOICE_DIR = VOICE_ASSETS_DIR;
const SUBTITLE_DIR = SUBTITLE_ASSETS_DIR;
const RENDER_TIMEOUT_MS = Number(process.env.WORKER_DURATION_LIMIT || '1200000');
const DEFAULT_SMOKE_DURATION_FRAMES = 180;
const CHAT_TTS_HTTP_HEALTH_URL = process.env.CHATTTS_HTTP_HEALTH_URL || 'http://127.0.0.1:18084/health';
const CHAT_TTS_HTTP_SYNTH_URL = process.env.CHATTTS_HTTP_SYNTH_URL || 'http://127.0.0.1:18084/synthesize';
const SECURITY_CONFIG = getSecurityConfig();

// 确保目录存在
[OUTPUT_DIR, VOICE_DIR, SUBTITLE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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

// ─── Stage 1: 配音合成 ─────────────────────────────────
async function stageVoiceSynthesis(job, update) {
  update(5, '🎤 合成语音...');
  const { voice = 'chattts', projectId = 'default' } = job.data;
  const designRenderData = getDesignRenderData(job.data.designJson);
  const script =
    typeof job.data.script === 'string' && job.data.script.trim()
      ? job.data.script.trim()
      : 'OpenClaw video';

  const projectVoiceDir = path.join(VOICE_DIR, projectId);
  if (!fs.existsSync(projectVoiceDir)) fs.mkdirSync(projectVoiceDir, { recursive: true });

  const voiceFile = path.join(projectVoiceDir, `narration_${job.id}.wav`);
  const scriptFile = path.join(projectVoiceDir, `script_${job.id}.json`);

  // 写入脚本
  fs.writeFileSync(scriptFile, JSON.stringify({ script, voice, generatedAt: new Date().toISOString() }, null, 2));

  const preparedAudioSegments = materializeAudioSegments(
    Array.isArray(job.data.audioSegments) && job.data.audioSegments.length > 0
      ? job.data.audioSegments
      : designRenderData.audioSegments,
    projectId,
  );
  if (preparedAudioSegments.length > 0) {
    update(20, '✅ 复用已有分镜音轨');
    return { voiceFile: null, scriptFile, audioSegments: preparedAudioSegments };
  }

  // 已有现成音频则复制
  const fallbackVoice = path.join(VOICE_DIR, 'full-narration.wav');
  if (fs.existsSync(fallbackVoice) && !fs.existsSync(voiceFile)) {
    fs.copyFileSync(fallbackVoice, voiceFile);
    console.log(`[Worker] Voice copied from fallback: ${voiceFile}`);
  } else if (fs.existsSync(voiceFile)) {
    console.log(`[Worker] Voice exists: ${voiceFile}`);
  } else {
    if (voice === 'chattts') {
      try {
        const healthRes = await fetch(CHAT_TTS_HTTP_HEALTH_URL);
        if (!healthRes.ok) {
          throw new Error(`ChatTTS health HTTP ${healthRes.status}`);
        }
        const synthRes = await fetch(CHAT_TTS_HTTP_SYNTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: script,
            speed: 1.0,
            speaker_seed: 42,
          }),
        });
        if (!synthRes.ok) {
          const detail = await synthRes.text().catch(() => '');
          throw new Error(`ChatTTS synth HTTP ${synthRes.status} ${detail}`);
        }
        const buffer = Buffer.from(await synthRes.arrayBuffer());
        fs.writeFileSync(voiceFile, buffer);
        console.log(`[Worker] Voice synthesized by ChatTTS: ${voiceFile}`);
      } catch (e) {
        console.warn(`[Worker] ChatTTS synthesis failed, falling back to Melo/fallback: ${e.message}`);
      }
    }

    // 调用 MeloTTS 合成
    if (!fs.existsSync(voiceFile)) {
      const scriptPath = path.join(PROJECT_ROOT, 'scripts/synthesize-melo-voice.mjs');
      if (fs.existsSync(scriptPath)) {
        try {
          await execFilePromise(process.execPath, [scriptPath, script, voiceFile], {
            cwd: PROJECT_ROOT,
            timeout: 60000,
          });
          console.log(`[Worker] Voice synthesized by MeloTTS: ${voiceFile}`);
        } catch (e) {
          console.warn(`[Worker] MeloTTS synthesis failed, using fallback: ${e.message}`);
          if (fs.existsSync(fallbackVoice)) {
            fs.copyFileSync(fallbackVoice, voiceFile);
          }
        }
      }
    }
  }

  update(20, '✅ 语音就绪');
  return { voiceFile, scriptFile, audioSegments: [] };
}

// ─── Stage 2: 字幕生成 ─────────────────────────────────
async function stageSubtitleGeneration(job, voiceFile, update) {
  update(25, '📝 生成字幕...');
  const { projectId = 'default' } = job.data;
  const designRenderData = getDesignRenderData(job.data.designJson);

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

  const shotSubtitleSrt = generateShotAlignedSRT(job.data.shots);
  if (shotSubtitleSrt) {
    fs.writeFileSync(subtitleFile, shotSubtitleSrt);
    update(35, '✅ 字幕就绪（按镜头时长对齐）');
    return { subtitleFile };
  }

  // 优先用 Deepgram
  if (process.env.DEEPGRAM_API_KEY && voiceFile) {
    try {
      const { generateSubtitles } = require('../subtitles/deepgramSubtitles');
      await generateSubtitles(voiceFile, subtitleFile);
      update(35, '✅ 字幕生成完成');
      return { subtitleFile };
    } catch (e) {
      console.warn('[Worker] Deepgram failed:', e.message);
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
    return { subtitleFile };
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
  return { subtitleFile };
}

// ─── Stage 3: Remotion 真实渲染 ────────────────────────
async function stageRemotionRender(job, files, update) {
  update(40, '🎬 开始 Remotion 渲染...');
  const designRenderData = getDesignRenderData(job.data.designJson);
  const {
    template = 'caption',
    subtitleData = null,
    subtitleStyle = 'caption',
    subtitleText = null,
    projectId = 'default',
    typewriter = true,
  } = job.data;
  const { subtitleFile, voiceFile, audioSegments = [] } = files;
  const resolvedSubtitleData = normalizeSubtitlePayload(
    Array.isArray(subtitleData) && subtitleData.length > 0
      ? subtitleData
      : designRenderData.subtitleData,
  );
  const resolvedSubtitleText =
    typeof subtitleText === 'string' && subtitleText.trim()
      ? subtitleText.trim()
      : designRenderData.subtitleText;
  const resolvedDurationInFrames = getPositiveInt(designRenderData.durationInFrames);
  const resolvedFrameRange = resolveRenderFrameRange(job.data.options, resolvedDurationInFrames);
  const resolvedCaptionStyleSegments = Array.isArray(designRenderData.captionStyleSegments) &&
    designRenderData.captionStyleSegments.length > 0
      ? designRenderData.captionStyleSegments
      : null;
  const resolvedShots = Array.isArray(job.data.shots) && job.data.shots.length > 0
    ? job.data.shots
    : null;
  const directDurationInFrames = getPositiveInt(job.data.durationInFrames);
  const directRenderFps = getPositiveInt(job.data.renderFps);
  const directRenderWidth = getPositiveInt(job.data.renderWidth);
  const directRenderHeight = getPositiveInt(job.data.renderHeight);
  const resolvedRenderFps = directRenderFps || getPositiveInt(designRenderData.renderFps) || 30;
  const resolvedRenderWidth = directRenderWidth || getPositiveInt(designRenderData.renderWidth);
  const resolvedRenderHeight = directRenderHeight || getPositiveInt(designRenderData.renderHeight);
  const publicVoiceFile = voiceFile ? `/assets/voice/${projectId}/${path.basename(voiceFile)}` : null;
  const canUseUltimate = Array.isArray(resolvedShots) && resolvedShots.length > 0;
  const useUltimate = canUseUltimate && isUltimateProject({
    template,
    visualSystem: job.data.visualSystem || designRenderData.visualSystem,
    render: {
      width: resolvedRenderWidth,
      height: resolvedRenderHeight,
    },
  });

  const outputDir = path.join(OUTPUT_DIR, projectId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `${job.id}.mp4`);

  const compositionId = useUltimate ? 'UltimateSceneTemplate' : 'OpenClawVideo';
  const remotionProps = useUltimate
    ? buildUltimateRenderProps({
        projectId,
        title: designRenderData.title || job.data.title || resolvedShots?.[0]?.title || projectId,
        visualSystem: job.data.visualSystem || designRenderData.visualSystem || 'ultimate-1080p',
        render: {
          fps: resolvedRenderFps,
          width: resolvedRenderWidth || 1920,
          height: resolvedRenderHeight || 1080,
        },
        shots: resolvedShots,
        voiceFile: publicVoiceFile,
        audioSegments: Array.isArray(audioSegments) && audioSegments.length > 0 ? audioSegments : null,
      })
    : {
        template,
        subtitleStyle,
        subtitleData: resolvedSubtitleData.length > 0 ? resolvedSubtitleData : null,
        subtitleFile: subtitleFile ? `/assets/subtitles/${projectId}/${path.basename(subtitleFile)}` : null,
        subtitleText: resolvedSubtitleText || null,
        voiceFile: publicVoiceFile,
        audioSegments: Array.isArray(audioSegments) && audioSegments.length > 0 ? audioSegments : null,
        captionStyleSegments: resolvedCaptionStyleSegments,
        durationInFrames: directDurationInFrames || resolvedDurationInFrames,
        renderFps: resolvedRenderFps,
        renderWidth: resolvedRenderWidth,
        renderHeight: resolvedRenderHeight,
        projectId,
        shots: resolvedShots,
        typewriter: Boolean(typewriter),
      };

  const propsJson = JSON.stringify(remotionProps);

  // 构建渲染命令（在项目根目录执行）
  const remotionDir = PROJECT_ROOT;
  const launch = resolveRemotionLaunch(remotionDir);
  const args = [
    'render',
    'src/Root.tsx',
    compositionId,
    outputFile,
    '--props', propsJson,
    '--log', 'info',
  ];

  if (resolvedFrameRange) {
    args.push('--frames', `${resolvedFrameRange[0]}-${resolvedFrameRange[1]}`);
  }

  console.log(`[Worker] Remotion command: ${launch.displayCommand} ${args.join(' ')}`);
  update(45, '🎬 Remotion 渲染中（请稍候）...');

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
        },
      });

      proc.stdout.on('data', (d) => {
        const line = d.toString().trim();
        stdout += line + '\n';
        console.log(`[Remotion] ${line}`);

        // 解析进度
        const pctMatch = line.match(/(\d+)%/);
        if (pctMatch) {
          const pct = 45 + Math.round(parseInt(pctMatch[1]) * 0.5);
          update(Math.min(pct, 94), `🎬 渲染中 ${pctMatch[1]}%`);
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
          console.warn(`[Remotion:warn] ${line}`);
        }
      });

      proc.on('close', (code) => {
        console.log(`[Worker] Remotion exit code: ${code}`);
        resolve(code ?? 1);
      });

      proc.on('error', (err) => {
        console.error(`[Worker] Remotion spawn error: ${err.message}`);
        reject(err);
      });

      // 渲染超时
      setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Remotion render timeout (${RENDER_TIMEOUT_MS}ms)`));
      }, RENDER_TIMEOUT_MS);
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
    console.error(`[Worker] Render error: ${err.message}`);
    throw err;
  }
}

// ─── Stage 4: Webhook ───────────────────────────────────
async function stageWebhook(job, result, update) {
  update(98, '📡 发送回调...');
  const { webhook } = job.data;
  if (!webhook) {
    update(100, '✅ 全部完成');
    return;
  }

  try {
    if (typeof globalThis.fetch !== 'function') {
      console.warn('[Worker] Webhook skipped: fetch is not available in this Node runtime');
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
    console.log(`[Worker] Webhook sent to ${webhook}`);
  } catch (e) {
    console.warn('[Worker] Webhook failed:', e.message);
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

// ─── 主处理函数 ─────────────────────────────────────────
async function processRenderJob(job, update) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Worker] 🆕 Job: ${job.id}`);
  console.log(`[Worker] Template: ${job.data.template || 'caption'}`);
  console.log(`[Worker] Project: ${job.data.projectId || 'default'}`);
  console.log(`${'='.repeat(50)}\n`);

  try {
    // Stage 1
    const stage1 = await stageVoiceSynthesis(job, update);

    // Stage 2
    const stage2 = await stageSubtitleGeneration(job, stage1.voiceFile, update);

    // Stage 3
    const stage3 = await stageRemotionRender(job, { ...stage1, ...stage2 }, update);

    // Stage 4
    await stageWebhook(job, {
      outputFile: stage3.outputFile,
      voiceFile: stage1.voiceFile,
      subtitleFile: stage2.subtitleFile,
      audioSegments: stage1.audioSegments ?? [],
      renderMeta: stage3.renderMeta ?? null,
    }, update);

    console.log(`\n[Worker] ✅ Job ${job.id} done: ${stage3.outputFile}\n`);
    return {
      outputFile: stage3.outputFile,
      voiceFile: stage1.voiceFile,
      subtitleFile: stage2.subtitleFile,
      audioSegments: stage1.audioSegments ?? [],
      renderMeta: stage3.renderMeta ?? null,
    };

  } catch (err) {
    console.error(`\n[Worker] ❌ Job ${job.id} failed: ${err.message}\n`);
    throw err;
  }
}

// ─── Worker 循环（文件队列版）────────────────────────────
function startFileBasedWorker() {
  assertQueueModeAllowed('file', SECURITY_CONFIG);
  const { startSimpleWorker } = require('../queue/fileQueue');

  console.log('[Worker] 🚀 File-based render worker started');

  startSimpleWorker({
    async render(job, updateProgress) {
      return await processRenderJob(job, updateProgress);
    },
    async voice(job, updateProgress) {
      return await processVoiceJob(job, updateProgress);
    },
  });
}

// ─── BullMQ Worker（Redis版）────────────────────────────
function startRedisWorker() {
  const { Worker } = require('bullmq');
  const Redis = require('ioredis');

  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on('error', err => console.error('[Worker] Redis error:', err.message));

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
    console.log(`[Worker] ✅ Job ${id} completed`);
  });

  worker.on('failed', ({ id, failedReason }) => {
    console.error(`[Worker] ❌ Job ${id} failed: ${failedReason}`);
  });

  worker.on('error', err => {
    console.error('[Worker] Error:', err.message);
  });

  console.log('[Worker] 🎬 Redis render worker started, waiting for jobs...');

  process.on('SIGTERM', async () => {
    await worker.close();
    await connection.quit();
    process.exit(0);
  });
}

// ─── 工具函数 ───────────────────────────────────────────
function execFilePromise(command, args, { cwd, timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {cwd, shell: false});
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
  generateFallbackSRT,
};

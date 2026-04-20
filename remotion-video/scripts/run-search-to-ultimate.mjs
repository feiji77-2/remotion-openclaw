#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {generateWorkflowStep} = require('../server/workflow/workflowGenerator');
const {processVoiceJob} = require('../server/voice/voiceJob');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(REMOTION_ROOT, 'projects');

const DEFAULT_TEMPLATE = 'ultimate';
const DEFAULT_VISUAL_SYSTEM = 'ultimate-1080p';
const DEFAULT_QUALITY = 'high';
const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

const safeString = (value) => String(value || '').trim();

const normalizeTextItem = (value) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return safeString(value);
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  return safeString(
    value.label
    || value.value
    || value.text
    || value.title
    || value.name
    || value.point
    || value.fact
    || value.detail
    || value.source
    || '',
  );
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundTo = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
};

const normalizeList = (value, max = Infinity) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const item of value) {
    const text = normalizeTextItem(item);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(text);
    if (output.length >= max) {
      break;
    }
  }

  return output;
};

const printUsage = () => {
  process.stdout.write(`Usage:
  node scripts/run-search-to-ultimate.mjs "你的主题/标题" [options]

Options:
  --topic <text>            显式指定主题，和第一个位置参数二选一
  --project-id <id>         指定项目目录名
  --project-name <text>     指定最终项目标题
  --quality <low|medium|high>
  --fps <number>
  --width <number>
  --height <number>
  --voice-engine <name>     chattts | melo | openvoice
  --voice-speed <number>    默认 1.0
  --speaker <value>         speaker seed / voice code
  --output <path>           指定最终视频输出路径
  --resume                  复用已有 step/voice/images/render 产物继续执行
  --no-images               跳过分镜图资产生成
  --no-voice                跳过 TTS，只生成带旁白文本的项目
  --no-render               只生成 workflow + project + render props，不直接出片
  --help                    显示帮助

Examples:
  node scripts/run-search-to-ultimate.mjs "Claude Code 和 Codex 区别"
  node scripts/run-search-to-ultimate.mjs --topic "AI agent 工作流" --no-render
  node scripts/run-search-to-ultimate.mjs "Remotion 自动视频" --voice-engine chattts --output out/agent.mp4
`);
};

const parseArgs = (argv) => {
  const options = {
    render: true,
    voice: true,
    images: true,
    resume: false,
    quality: DEFAULT_QUALITY,
    fps: DEFAULT_FPS,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    voiceEngine: 'chattts',
    voiceSpeed: '1.0',
  };

  let topic = '';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--topic':
        topic = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--project-id':
        options.projectId = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--project-name':
        options.projectName = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--quality':
        options.quality = safeString(argv[index + 1]) || DEFAULT_QUALITY;
        index += 1;
        break;
      case '--fps':
        options.fps = Math.max(1, Math.round(toNumber(argv[index + 1], DEFAULT_FPS)));
        index += 1;
        break;
      case '--width':
        options.width = Math.max(320, Math.round(toNumber(argv[index + 1], DEFAULT_WIDTH)));
        index += 1;
        break;
      case '--height':
        options.height = Math.max(320, Math.round(toNumber(argv[index + 1], DEFAULT_HEIGHT)));
        index += 1;
        break;
      case '--voice-engine':
        options.voiceEngine = safeString(argv[index + 1]) || 'chattts';
        index += 1;
        break;
      case '--voice-speed':
        options.voiceSpeed = safeString(argv[index + 1]) || '1.0';
        index += 1;
        break;
      case '--speaker':
        options.speaker = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--output':
        options.output = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--no-resume':
        options.resume = false;
        break;
      case '--no-images':
        options.images = false;
        break;
      case '--images':
        options.images = true;
        break;
      case '--no-voice':
        options.voice = false;
        break;
      case '--voice':
        options.voice = true;
        break;
      case '--no-render':
        options.render = false;
        break;
      case '--render':
        options.render = true;
        break;
      default:
        if (!arg.startsWith('--') && !topic) {
          topic = safeString(arg);
        }
        break;
    }
  }

  return {
    topic,
    options,
  };
};

const slugify = (value) => {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
};

const buildProjectId = (topic, explicitId) => {
  const manual = slugify(explicitId);
  if (manual) {
    return manual;
  }

  const slug = slugify(topic);
  if (slug) {
    return slug;
  }

  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const hash = crypto.createHash('sha1').update(safeString(topic) || stamp).digest('hex').slice(0, 6);
  return `ultimate-${stamp}-${hash}`;
};

const createInitialRunState = ({
  projectId,
  topic,
  explicitProjectName,
  options,
}) => {
  return {
    projectState: {
      id: projectId,
      name: explicitProjectName || topic,
      fps: options.fps,
      width: options.width,
      height: options.height,
    },
    shotsState: [],
    pipelineState: {
      inputTopic: topic,
      inputTitleKeywords: topic,
      selectedAnalysis: null,
      selectedTitleId: null,
      render: {
        template: DEFAULT_TEMPLATE,
        quality: options.quality,
        fps: options.fps,
        width: options.width,
        height: options.height,
        format: 'mp4',
        codec: 'h264',
        bitrate: 12000,
      },
    },
  };
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, {recursive: true});
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const loadJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const loadJsonIfExists = async (filePath) => {
  return await fileExists(filePath) ? loadJson(filePath) : null;
};

const writeJson = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const normalizePublicAssetPath = (assetPath) => {
  return safeString(assetPath).replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
};

const resolvePublicAssetFile = (assetPath) => {
  const normalized = normalizePublicAssetPath(assetPath);
  if (!normalized) {
    return '';
  }

  return path.join(REMOTION_ROOT, 'public', normalized);
};

const selectedTitleFromState = (pipelineState) => {
  const options = Array.isArray(pipelineState?.titles?.options) ? pipelineState.titles.options : [];
  const selectedId = safeString(pipelineState?.selectedTitleId || pipelineState?.titles?.selectedId);
  return options.find((item) => safeString(item?.id) === selectedId) || options[0] || null;
};

const mergeStepResult = ({stepId, result, projectState, shotsState, pipelineState, explicitProjectName}) => {
  const payload = result?.payload && typeof result.payload === 'object' ? result.payload : {};
  const nextProjectState = {
    ...projectState,
  };
  const nextPipelineState = {
    ...pipelineState,
  };
  let nextShotsState = Array.isArray(shotsState) ? [...shotsState] : [];

  if (stepId === 1) {
    nextPipelineState.analysis = payload.analysis || null;
    nextPipelineState.selectedAnalysis = payload.analysis || null;
    nextPipelineState.topicResearch = payload.topicResearch || null;
  }

  if (stepId === 2) {
    nextPipelineState.titles = payload.titles || null;
    nextPipelineState.selectedTitleId = safeString(payload?.titles?.selectedId) || null;
    if (!explicitProjectName) {
      const selectedTitle = Array.isArray(payload?.titles?.options)
        ? payload.titles.options.find((item) => safeString(item?.id) === safeString(payload?.titles?.selectedId))
        : null;
      nextProjectState.name = safeString(payload.projectName || selectedTitle?.title || nextProjectState.name) || nextProjectState.name;
    }
  }

  if (stepId === 3) {
    nextPipelineState.copy = payload.copy || null;
  }

  if (stepId === 4) {
    nextShotsState = Array.isArray(payload.shots) ? payload.shots : [];
  }

  if (stepId === 5) {
    nextPipelineState.prompts = payload.prompts || null;
  }

  if (stepId === 6) {
    nextPipelineState.voice = payload.voice || null;
    if (Array.isArray(payload.shots) && payload.shots.length > 0) {
      nextShotsState = payload.shots;
    }
  }

  if (stepId === 7) {
    nextPipelineState.projectBuild = payload.projectBuild || null;
  }

  if (stepId === 8) {
    nextPipelineState.render = {
      ...(nextPipelineState.render && typeof nextPipelineState.render === 'object' ? nextPipelineState.render : {}),
      ...(payload.render && typeof payload.render === 'object' ? payload.render : {}),
    };
  }

  return {
    projectState: nextProjectState,
    shotsState: nextShotsState,
    pipelineState: nextPipelineState,
  };
};

const buildProjectShots = (shotsState, pipelineState) => {
  const promptsByShotId = pipelineState?.prompts?.byShotId && typeof pipelineState.prompts.byShotId === 'object'
    ? pipelineState.prompts.byShotId
    : {};
  const voiceByShotId = pipelineState?.voice?.byShotId && typeof pipelineState.voice.byShotId === 'object'
    ? pipelineState.voice.byShotId
    : {};

  return (Array.isArray(shotsState) ? shotsState : []).map((shot, index) => {
    const prompt = promptsByShotId[shot.id] && typeof promptsByShotId[shot.id] === 'object'
      ? promptsByShotId[shot.id]
      : {};
    const voice = voiceByShotId[shot.id] && typeof voiceByShotId[shot.id] === 'object'
      ? voiceByShotId[shot.id]
      : {};
    const visual = shot?.visual && typeof shot.visual === 'object'
      ? {
          description: safeString(shot.visual.description),
          focus: safeString(shot.visual.focus),
        }
      : null;
    const comparisons = Array.isArray(shot?.comparisons)
      ? shot.comparisons
        .map((item) => ({
          left: safeString(item?.left),
          right: safeString(item?.right),
        }))
        .filter((item) => item.left || item.right)
      : [];

    return {
      id: safeString(shot.id) || `shot-${String(index + 1).padStart(2, '0')}`,
      level: safeString(shot.level),
      type: safeString(shot.type),
      title: safeString(shot.title) || `镜头 ${index + 1}`,
      narration: safeString(voice.text || shot.narration),
      durationSeconds: roundTo(Math.max(1.8, toNumber(shot.durationSeconds, 6))),
      promptZh: safeString(prompt.promptZh || prompt.imagePrompt || prompt.prompt),
      visualSummaryZh: safeString(prompt.visualSummaryZh || visual?.description),
      visualFocusZh: safeString(prompt.visualFocusZh || visual?.focus),
      comparisonSummaryZh: safeString(prompt.comparisonSummaryZh),
      mood: safeString(prompt.mood),
      style: safeString(prompt.style),
      keywords: normalizeList(
        Array.isArray(prompt.keywords) && prompt.keywords.length > 0 ? prompt.keywords : shot.keywords,
        10,
      ),
      dataPoints: normalizeList(
        Array.isArray(prompt.dataPoints) && prompt.dataPoints.length > 0 ? prompt.dataPoints : shot.dataPoints,
        10,
      ),
      visual,
      comparisons,
      imageUrl: safeString(prompt.imageUrl) || null,
    };
  });
};

const applyVoiceDurations = (shotsState, voiceQueue, fps) => {
  const shotQueue = new Map(
    (Array.isArray(voiceQueue) ? voiceQueue : [])
      .map((item) => [safeString(item?.shotId), item]),
  );

  let cursorFrame = 0;
  const nextShots = [];
  const audioSegments = [];

  for (const shot of Array.isArray(shotsState) ? shotsState : []) {
    const voiceItem = shotQueue.get(safeString(shot.id));
    const audioDurationSeconds = toNumber(voiceItem?.durationSeconds, 0);
    const nextDurationSeconds = audioDurationSeconds > 0
      ? roundTo(Math.max(toNumber(shot.durationSeconds, 6), audioDurationSeconds + 0.18))
      : roundTo(Math.max(1.8, toNumber(shot.durationSeconds, 6)));
    const shotFrames = Math.max(1, Math.round(nextDurationSeconds * fps));

    nextShots.push({
      ...shot,
      durationSeconds: nextDurationSeconds,
    });

    if (voiceItem && safeString(voiceItem.voiceFile)) {
      audioSegments.push({
        src: safeString(voiceItem.voiceFile),
        startFrame: cursorFrame,
        durationInFrames: Math.max(1, Math.round(Math.max(audioDurationSeconds, 0.1) * fps)),
      });
    }

    cursorFrame += shotFrames;
  }

  return {
    shots: nextShots,
    audioSegments,
  };
};

const updateVoiceState = (pipelineState, voiceQueue) => {
  const currentVoice = pipelineState?.voice && typeof pipelineState.voice === 'object'
    ? pipelineState.voice
    : {};
  const byShotId = currentVoice.byShotId && typeof currentVoice.byShotId === 'object'
    ? {...currentVoice.byShotId}
    : {};
  const script = Array.isArray(currentVoice.script) ? [...currentVoice.script] : [];
  const queue = Array.isArray(voiceQueue) ? voiceQueue : [];

  for (const item of queue) {
    const shotId = safeString(item?.shotId);
    if (!shotId) {
      continue;
    }

    const current = byShotId[shotId] && typeof byShotId[shotId] === 'object'
      ? byShotId[shotId]
      : {};
    byShotId[shotId] = {
      ...current,
      duration: roundTo(toNumber(item?.durationSeconds, current.duration || current.durationSeconds || 0)),
      durationSeconds: roundTo(toNumber(item?.durationSeconds, current.duration || current.durationSeconds || 0)),
      voiceFile: safeString(item?.voiceFile),
    };

    const scriptIndex = script.findIndex((entry) => safeString(entry?.shotId) === shotId);
    if (scriptIndex >= 0) {
      script[scriptIndex] = {
        ...script[scriptIndex],
        duration: roundTo(toNumber(item?.durationSeconds, script[scriptIndex]?.duration || 0)),
      };
    }
  }

  return {
    ...currentVoice,
    byShotId,
    script,
    totalDuration: roundTo(queue.reduce((sum, item) => sum + toNumber(item?.durationSeconds, 0), 0)),
  };
};

const sumShotDurations = (shotsState) => {
  return roundTo(
    (Array.isArray(shotsState) ? shotsState : []).reduce((sum, shot) => sum + toNumber(shot?.durationSeconds, 0), 0),
  );
};

const executeCommand = async (command, args, {cwd, label}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if ((code ?? 1) !== 0) {
        reject(new Error(`${label || command} failed with code ${code}\n${stderr.trim() || stdout.trim()}`));
        return;
      }
      resolve({stdout, stderr});
    });
  });
};

const parseJsonLines = (stdout) => {
  return String(stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const runBuildProject = async (projectId) => {
  const projectJsonArg = path.join('projects', projectId, 'project.json');
  const {stdout} = await executeCommand(
    process.execPath,
    ['scripts/build-project-package.mjs', projectJsonArg],
    {
      cwd: REMOTION_ROOT,
      label: 'build-project-package',
    },
  );

  const lines = stdout.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  const lastLine = lines.at(-1) || '{}';
  return JSON.parse(lastLine);
};

const runGenerateProjectImages = async (projectId, imagePromptsPath) => {
  const {stdout} = await executeCommand(
    process.execPath,
    ['scripts/generate-shot-images.mjs', projectId, imagePromptsPath],
    {
      cwd: REMOTION_ROOT,
      label: 'generate-shot-images',
    },
  );

  const result = [...parseJsonLines(stdout)].reverse().find((entry) => entry?.type === 'result');
  if (!result || result.status !== 'done') {
    throw new Error('generate-shot-images finished without a valid result payload');
  }

  return {
    total: Array.isArray(result.images) ? result.images.length : Number(result.total) || 0,
    images: Array.isArray(result.images) ? result.images : [],
  };
};

const runRenderProject = async (projectId, outputPath) => {
  const renderPropsArg = path.join('projects', projectId, 'render-props.json');
  const args = ['scripts/render-project.mjs', renderPropsArg];

  if (outputPath) {
    args.push(outputPath);
  }

  await executeCommand(process.execPath, args, {
    cwd: REMOTION_ROOT,
    label: 'render-project',
  });
};

const loadCachedWorkflowPrefix = async ({
  projectId,
  projectDir,
  topic,
  options,
  explicitProjectName,
}) => {
  const workflowStatePath = path.join(projectDir, 'workflow-state.json');
  const cachedWorkflowState = await loadJsonIfExists(workflowStatePath);
  const cachedInputTopic = safeString(cachedWorkflowState?.inputTopic);

  if (cachedInputTopic && cachedInputTopic !== safeString(topic)) {
    return {
      ...createInitialRunState({projectId, topic, explicitProjectName, options}),
      stepResults: [],
      resumedStepCount: 0,
      cachedWorkflowState: null,
      resumeWarning: `检测到已有缓存主题为「${cachedInputTopic}」，与当前输入「${topic}」不一致，已放弃 resume 改为全新执行。`,
    };
  }

  let {projectState, shotsState, pipelineState} = createInitialRunState({
    projectId,
    topic,
    explicitProjectName,
    options,
  });
  const stepResults = [];
  const stepTimingEntries = [];

  for (let stepId = 1; stepId <= 8; stepId += 1) {
    const stepFilePath = path.join(projectDir, 'steps', `step-${String(stepId).padStart(2, '0')}.json`);
    const stepResult = await loadJsonIfExists(stepFilePath);
    if (!stepResult || Number(stepResult?.stepId) !== stepId || !stepResult?.payload || typeof stepResult.payload !== 'object') {
      break;
    }

    stepResults.push(stepResult);
    const merged = mergeStepResult({
      stepId,
      result: stepResult,
      projectState,
      shotsState,
      pipelineState,
      explicitProjectName,
    });
    projectState = merged.projectState;
    shotsState = merged.shotsState;
    pipelineState = merged.pipelineState;
    stepTimingEntries.push({
      stepId,
      startedAt: null,
      endedAt: null,
      durationMs: 0,
      source: stepResult?.source || 'cached',
      model: stepResult?.model || 'cached',
      status: 'reused',
    });
  }

  if (stepResults.length === 8 && cachedWorkflowState) {
    projectState = cachedWorkflowState?.projectState && typeof cachedWorkflowState.projectState === 'object'
      ? cachedWorkflowState.projectState
      : projectState;
    shotsState = Array.isArray(cachedWorkflowState?.shotsState)
      ? cachedWorkflowState.shotsState
      : shotsState;
    pipelineState = cachedWorkflowState?.pipelineState && typeof cachedWorkflowState.pipelineState === 'object'
      ? {
          ...pipelineState,
          ...cachedWorkflowState.pipelineState,
        }
      : pipelineState;
  }

  return {
    projectState,
    shotsState,
    pipelineState,
    stepResults,
    resumedStepCount: stepResults.length,
    stepTimingEntries,
    cachedWorkflowState,
    resumeWarning: null,
  };
};

const loadReusableImageSummary = async (imageManifestPath) => {
  const manifest = await loadJsonIfExists(imageManifestPath);
  const images = Array.isArray(manifest?.images) ? manifest.images : [];
  if (images.length === 0) {
    return null;
  }

  for (const image of images) {
    if (!safeString(image?.shotId) || !safeString(image?.path)) {
      return null;
    }
    if (!(await fileExists(resolvePublicAssetFile(image.path)))) {
      return null;
    }
  }

  return {
    total: images.length,
    imageManifestPath,
    urls: images.map((image) => ({
      shotId: safeString(image.shotId),
      url: safeString(image.path),
    })),
    images,
  };
};

const canReuseVoiceOutputs = async (workflowState) => {
  const audioSegments = Array.isArray(workflowState?.pipelineState?.audioSegments)
    ? workflowState.pipelineState.audioSegments
    : [];

  if (audioSegments.length === 0) {
    return false;
  }

  for (const segment of audioSegments) {
    if (!safeString(segment?.src) || !(await fileExists(resolvePublicAssetFile(segment.src)))) {
      return false;
    }
  }

  return true;
};

const applyGeneratedImages = async ({
  projectJsonPath,
  workflowStatePath,
  imageManifestPath,
  images,
}) => {
  const imageEntries = Array.isArray(images) ? images : [];
  const imageMap = new Map(
    imageEntries
      .filter((item) => safeString(item?.shotId) && safeString(item?.path))
      .map((item) => [safeString(item.shotId), safeString(item.path)]),
  );

  const projectJson = await loadJson(projectJsonPath);
  projectJson.shots = (Array.isArray(projectJson.shots) ? projectJson.shots : []).map((shot) => ({
    ...shot,
    imageUrl: imageMap.get(safeString(shot?.id)) || shot?.imageUrl || null,
  }));
  await writeJson(projectJsonPath, projectJson);

  const workflowState = await loadJson(workflowStatePath);
  workflowState.shotsState = (Array.isArray(workflowState.shotsState) ? workflowState.shotsState : []).map((shot) => ({
    ...shot,
    imageUrl: imageMap.get(safeString(shot?.id)) || shot?.imageUrl || null,
  }));

  const imageUrls = imageEntries
    .filter((item) => safeString(item?.shotId) && safeString(item?.path))
    .map((item) => ({
      shotId: safeString(item.shotId),
      url: safeString(item.path),
    }));

  workflowState.pipelineState = {
    ...(workflowState.pipelineState && typeof workflowState.pipelineState === 'object'
      ? workflowState.pipelineState
      : {}),
    images: {
      status: 'done',
      total: imageEntries.length,
      completed: imageEntries.length,
      urls: imageUrls,
    },
    prompts: {
      ...(workflowState.pipelineState?.prompts && typeof workflowState.pipelineState.prompts === 'object'
        ? workflowState.pipelineState.prompts
        : {}),
      byShotId: Object.fromEntries(
        Object.entries(workflowState.pipelineState?.prompts?.byShotId || {}).map(([shotId, prompt]) => [
          shotId,
          {
            ...(prompt && typeof prompt === 'object' ? prompt : {}),
            imageUrl: imageMap.get(safeString(shotId)) || prompt?.imageUrl || null,
          },
        ]),
      ),
    },
  };

  await writeJson(workflowStatePath, workflowState);
  await writeJson(imageManifestPath, {
    generatedAt: new Date().toISOString(),
    total: imageEntries.length,
    images: imageEntries,
  });

  return {
    total: imageEntries.length,
    imageManifestPath,
    urls: imageUrls,
  };
};

const logSection = (title) => {
  process.stdout.write(`\n=== ${title} ===\n`);
};

const measureAsync = async (timingMap, key, task) => {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  try {
    const result = await task();
    timingMap[key] = {
      status: 'done',
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
    return result;
  } catch (error) {
    timingMap[key] = {
      status: 'error',
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
    throw error;
  }
};

const markStageReused = (timingMap, key, details = {}) => {
  const timestamp = new Date().toISOString();
  timingMap[key] = {
    status: 'reused',
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    ...details,
  };
};

async function main() {
  const {topic, options} = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!safeString(topic)) {
    printUsage();
    process.exit(1);
  }

  const projectId = buildProjectId(topic, options.projectId);
  const projectDir = path.join(PROJECTS_DIR, projectId);
  const stepsDir = path.join(projectDir, 'steps');
  await ensureDir(stepsDir);

  const explicitProjectName = safeString(options.projectName);
  const initialRunState = createInitialRunState({
    projectId,
    topic,
    explicitProjectName,
    options,
  });
  let projectState = initialRunState.projectState;
  let shotsState = initialRunState.shotsState;
  let pipelineState = initialRunState.pipelineState;
  const stepResults = [];
  const warnings = [];
  const stageTimings = {};
  const stepTimings = [];
  let cachedWorkflowState = null;
  let resumedStepCount = 0;
  let resumedFromCache = false;
  let reusedVoice = false;
  let reusedImages = false;
  let reusedRender = false;

  if (options.resume) {
    const cachedPrefix = await loadCachedWorkflowPrefix({
      projectId,
      projectDir,
      topic,
      options,
      explicitProjectName,
    });
    projectState = cachedPrefix.projectState;
    shotsState = cachedPrefix.shotsState;
    pipelineState = cachedPrefix.pipelineState;
    stepResults.push(...cachedPrefix.stepResults);
    stepTimings.push(...cachedPrefix.stepTimingEntries);
    cachedWorkflowState = cachedPrefix.cachedWorkflowState;
    resumedStepCount = cachedPrefix.resumedStepCount;
    resumedFromCache = resumedStepCount > 0;

    if (cachedPrefix.resumeWarning) {
      warnings.push(cachedPrefix.resumeWarning);
      process.stdout.write(`[resume] warning: ${cachedPrefix.resumeWarning}\n`);
    } else if (resumedFromCache) {
      process.stdout.write(`[resume] reused workflow steps 1-${resumedStepCount}\n`);
    }
  }

  const nextWorkflowStep = resumedStepCount + 1;
  logSection('Workflow 1-8');

  if (nextWorkflowStep > 8) {
    markStageReused(stageTimings, 'workflow', {reusedSteps: resumedStepCount});
  } else {
    await measureAsync(stageTimings, 'workflow', async () => {
      for (let stepId = nextWorkflowStep; stepId <= 8; stepId += 1) {
        process.stdout.write(`[workflow] step ${stepId}/8\n`);
        const startedAt = new Date().toISOString();
        const stepStart = Date.now();
        const result = await generateWorkflowStep({
          stepId,
          generationMeta: {
            mode: 'generate',
            trigger: 'manual',
            attempt: 0,
          },
          projectState,
          shotsState,
          pipelineState,
        });

        stepTimings.push({
          stepId,
          startedAt,
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - stepStart,
          source: result?.source || 'unknown',
          model: result?.model || 'unknown',
          status: 'done',
        });
        stepResults.push(result);
        await writeJson(path.join(stepsDir, `step-${String(stepId).padStart(2, '0')}.json`), result);

        const merged = mergeStepResult({
          stepId,
          result,
          projectState,
          shotsState,
          pipelineState,
          explicitProjectName,
        });

        projectState = merged.projectState;
        shotsState = merged.shotsState;
        pipelineState = merged.pipelineState;
      }
    });
  }

  pipelineState.render = {
    ...(pipelineState.render && typeof pipelineState.render === 'object' ? pipelineState.render : {}),
    template: DEFAULT_TEMPLATE,
    quality: options.quality,
    fps: options.fps,
    width: options.width,
    height: options.height,
    format: 'mp4',
    codec: 'h264',
    bitrate: toNumber(pipelineState?.render?.bitrate, 12000) || 12000,
    estimatedDuration: sumShotDurations(shotsState),
  };

  if (options.voice) {
    logSection('Voice');
    try {
      if (options.resume && cachedWorkflowState && await canReuseVoiceOutputs(cachedWorkflowState)) {
        reusedVoice = true;
        projectState = cachedWorkflowState?.projectState && typeof cachedWorkflowState.projectState === 'object'
          ? cachedWorkflowState.projectState
          : projectState;
        shotsState = Array.isArray(cachedWorkflowState?.shotsState) ? cachedWorkflowState.shotsState : shotsState;
        pipelineState = cachedWorkflowState?.pipelineState && typeof cachedWorkflowState.pipelineState === 'object'
          ? {
              ...pipelineState,
              ...cachedWorkflowState.pipelineState,
            }
          : pipelineState;
        markStageReused(stageTimings, 'voice');
        process.stdout.write(`[voice] reused ${Array.isArray(pipelineState.audioSegments) ? pipelineState.audioSegments.length : 0} cached audio segments\n`);
      } else {
        const voiceResult = await measureAsync(stageTimings, 'voice', async () => {
          const voiceJobId = `voice_${Date.now()}`;
          return await processVoiceJob(
            {
              id: voiceJobId,
              data: {
                projectId,
                shots: (Array.isArray(shotsState) ? shotsState : []).map((shot) => ({
                  ...shot,
                  narration: safeString(
                    pipelineState?.voice?.byShotId?.[shot.id]?.text || shot.narration,
                  ),
                })),
                voiceSettings: {
                  ...(pipelineState.voice && typeof pipelineState.voice === 'object' ? pipelineState.voice : {}),
                  engine: options.voiceEngine,
                  speed: options.voiceSpeed,
                  ...(safeString(options.speaker)
                    ? {
                        speakerSeed: options.speaker,
                        voice: options.speaker,
                      }
                    : {}),
                },
              },
            },
            (pct, message) => {
              process.stdout.write(`[voice] ${String(pct).padStart(3, ' ')}% ${message}\n`);
            },
          );
        });

        const adjusted = applyVoiceDurations(shotsState, voiceResult.queue, options.fps);
        shotsState = adjusted.shots;
        pipelineState.voice = updateVoiceState(pipelineState, voiceResult.queue);
        pipelineState.render = {
          ...(pipelineState.render && typeof pipelineState.render === 'object' ? pipelineState.render : {}),
          estimatedDuration: sumShotDurations(shotsState),
        };
        pipelineState.audioSegments = adjusted.audioSegments;
        process.stdout.write(`[voice] total clips=${voiceResult.totalClips}, total duration=${voiceResult.totalDurationSeconds}s\n`);
      }
    } catch (error) {
      const message = `配音生成失败，已保留无音轨项目继续执行：${error.message}`;
      warnings.push(message);
      process.stdout.write(`[voice] warning: ${message}\n`);
    }
  }

  const finalSelectedTitle = selectedTitleFromState(pipelineState);
  const finalTitle = safeString(explicitProjectName || finalSelectedTitle?.title || projectState.name || topic) || topic;
  const projectShots = buildProjectShots(shotsState, pipelineState);
  const projectJson = {
    projectId,
    title: finalTitle,
    template: DEFAULT_TEMPLATE,
    visualSystem: DEFAULT_VISUAL_SYSTEM,
    render: {
      fps: options.fps,
      width: options.width,
      height: options.height,
      quality: options.quality,
      format: 'mp4',
      codec: 'h264',
      bitrate: toNumber(pipelineState?.render?.bitrate, 12000) || 12000,
    },
    audioSegments: Array.isArray(pipelineState.audioSegments) && pipelineState.audioSegments.length > 0
      ? pipelineState.audioSegments
      : null,
    shots: projectShots,
  };

  const workflowState = {
    generatedAt: new Date().toISOString(),
    inputTopic: topic,
    projectState,
    pipelineState,
    shotsState,
    stepResults,
    warnings,
  };

  const projectJsonPath = path.join(projectDir, 'project.json');
  const workflowStatePath = path.join(projectDir, 'workflow-state.json');
  const imageManifestPath = path.join(projectDir, 'image-manifest.json');
  await writeJson(projectJsonPath, projectJson);
  await writeJson(workflowStatePath, workflowState);

  logSection('Build');
  let buildResult = await measureAsync(stageTimings, 'build', async () => {
    return await runBuildProject(projectId);
  });
  let generatedImageSummary = null;

  if (options.images) {
    logSection('Images');
    try {
      const reusableImageSummary = options.resume
        ? await loadReusableImageSummary(imageManifestPath)
        : null;

      if (reusableImageSummary) {
        reusedImages = true;
        generatedImageSummary = reusableImageSummary;
        markStageReused(stageTimings, 'images', {count: reusableImageSummary.total});
        process.stdout.write(`[images] reused=${generatedImageSummary.total}\n`);
      } else {
        const imageResult = await measureAsync(stageTimings, 'images', async () => {
          return await runGenerateProjectImages(projectId, buildResult.imagePromptsPath);
        });
        generatedImageSummary = await applyGeneratedImages({
          projectJsonPath,
          workflowStatePath,
          imageManifestPath,
          images: imageResult.images,
        });

        logSection('Rebuild');
        buildResult = await measureAsync(stageTimings, 'rebuild', async () => {
          return await runBuildProject(projectId);
        });
        process.stdout.write(`[images] generated=${generatedImageSummary.total}\n`);
      }
    } catch (error) {
      const message = `分镜图资产生成失败，已保留当前项目继续执行：${error.message}`;
      warnings.push(message);
      process.stdout.write(`[images] warning: ${message}\n`);
    }
  }

  let resolvedOutputPath = null;
  if (options.render) {
    logSection('Render');
    resolvedOutputPath = safeString(options.output)
      ? path.resolve(process.cwd(), options.output)
      : path.join(REMOTION_ROOT, 'public', 'assets', 'outputs', projectId, `${projectId}.mp4`);
    await ensureDir(path.dirname(resolvedOutputPath));
    if (options.resume && await fileExists(resolvedOutputPath)) {
      reusedRender = true;
      markStageReused(stageTimings, 'render', {outputPath: resolvedOutputPath});
      process.stdout.write(`[render] reused existing output ${resolvedOutputPath}\n`);
    } else {
      await measureAsync(stageTimings, 'render', async () => {
        await runRenderProject(projectId, resolvedOutputPath);
      });
    }
  }

  const report = {
    status: 'ok',
    projectId,
    title: finalTitle,
    topic,
    renderEnabled: Boolean(options.render),
    imagesEnabled: Boolean(options.images),
    voiceEnabled: Boolean(options.voice),
    resumeEnabled: Boolean(options.resume),
    resumedFromCache,
    resumedStepCount,
    reusedVoice,
    reusedImages,
    reusedRender,
    shotCount: projectShots.length,
    durationSeconds: sumShotDurations(shotsState),
    projectJsonPath,
    workflowStatePath,
    imagePromptsPath: buildResult.imagePromptsPath,
    imageManifestPath: generatedImageSummary?.imageManifestPath || null,
    generatedImageCount: generatedImageSummary?.total || 0,
    renderPropsPath: buildResult.renderPropsPath,
    ultimateConfigPath: buildResult.ultimateConfigPath,
    outputPath: resolvedOutputPath,
    timings: {
      stages: stageTimings,
      steps: stepTimings,
    },
    warnings,
  };

  await writeJson(path.join(projectDir, 'run-report.json'), report);
  process.stdout.write(`\n${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

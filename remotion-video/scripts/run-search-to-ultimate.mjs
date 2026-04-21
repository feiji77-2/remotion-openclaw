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
const REMOTION_PACKAGE_JSON_PATH = path.join(REMOTION_ROOT, 'package.json');

const DEFAULT_TEMPLATE = 'ultimate';
const DEFAULT_VISUAL_SYSTEM = 'ultimate-1080p';
const DEFAULT_QUALITY = 'high';
const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const STEP_CACHE_VERSION = 3;
const IMAGE_CACHE_VERSION = 2;
const VOICE_CACHE_VERSION = 1;
const RENDER_CACHE_VERSION = 1;
const GENERIC_LABEL_RE = /^(?:数据点|关键词|补充|标签|point|item|slot|summary|scene)\s*[0-9a-zA-Z一二三四五六七八九十]*$/i;

const safeString = (value) => String(value || '').trim();

const isPlaceholderText = (value) => {
  const text = safeString(value);

  if (!text) {
    return true;
  }

  if (GENERIC_LABEL_RE.test(text)) {
    return true;
  }

  if (/^(?:scene ready|summary|detail|focus)$/i.test(text)) {
    return true;
  }

  if (/^\d+(?:\.\d+)?$/.test(text) && text.length <= 4) {
    return true;
  }

  return false;
};

const normalizeTextItem = (value) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return safeString(value);
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const preferred = safeString(
    value.text
    || value.value
    || value.title
    || value.name
    || value.point
    || value.fact
    || value.detail
    || value.source
    || '',
  );

  if (preferred) {
    return preferred;
  }

  const label = safeString(value.label);
  const number = safeString(value.number);

  if (number && (GENERIC_LABEL_RE.test(label) || !label)) {
    return number;
  }

  return label || number;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundTo = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
};

const splitTextUnits = (value) => {
  return Array.from(new Set(
    safeString(value)
      .replace(/\s+/g, ' ')
      .split(/[。！？!?\n]|(?<=，)|(?<=；)|(?<=：)|(?<=,)|(?<=;)|(?<=:)/u)
      .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
      .filter(Boolean),
  ));
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

const extractNarrationDataPoints = (value, max = 4) => {
  const units = splitTextUnits(value);
  const prioritized = units.filter((item) => (
    /\d/.test(item)
    || /(开源|发布|编码|代码|Agent|优于|持平|测试|部署|效率|场景|团队|压力|能力)/i.test(item)
  ));

  return normalizeList(
    (prioritized.length > 0 ? prioritized : units).filter((item) => !isPlaceholderText(item)),
    max,
  );
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
  --package-version <ver>   指定打包版本号，默认读取 remotion-video/package.json
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
      case '--package-version':
        options.packageVersion = safeString(argv[index + 1]);
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
  packageVersion,
}) => {
  return {
    projectState: {
      id: projectId,
      name: explicitProjectName || topic,
      fps: options.fps,
      width: options.width,
      height: options.height,
      packageVersion: safeString(packageVersion),
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
        packageVersion: safeString(packageVersion),
        format: 'mp4',
        codec: 'h264',
        bitrate: 12000,
      },
    },
  };
};

const resolvePackageVersion = async (explicitVersion) => {
  const manual = safeString(explicitVersion);
  if (manual) {
    return manual;
  }

  try {
    const pkg = await loadJson(REMOTION_PACKAGE_JSON_PATH);
    return safeString(pkg?.version) || '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const sanitizeVersionForFileName = (value) => {
  const normalized = safeString(value).replace(/[^0-9A-Za-z._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized || '0.0.0';
};

const normalizeForHash = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const nextValue = normalizeForHash(value[key]);
      if (nextValue !== undefined) {
        normalized[key] = nextValue;
      }
    }
    return normalized;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  return safeString(value);
};

const stableStringify = (value) => JSON.stringify(normalizeForHash(value));

const hashValue = (value) => {
  return crypto.createHash('sha1').update(stableStringify(value)).digest('hex');
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

const pickStepSkill = (pipelineState, stepId) => {
  const stepSkills = pipelineState?.stepSkills && typeof pipelineState.stepSkills === 'object'
    ? pipelineState.stepSkills
    : {};
  return stepSkills[stepId] && typeof stepSkills[stepId] === 'object' ? stepSkills[stepId] : null;
};

const summarizeSelectedTitle = (pipelineState) => {
  const selectedTitle = selectedTitleFromState(pipelineState);
  return selectedTitle
    ? {
        id: safeString(selectedTitle.id),
        title: safeString(selectedTitle.title),
        angle: safeString(selectedTitle.angle),
      }
    : null;
};

const buildWorkflowStepCacheInput = ({stepId, projectState, shotsState, pipelineState}) => {
  const topicState = {
    inputTopic: safeString(pipelineState?.inputTopic),
    inputTitleKeywords: safeString(pipelineState?.inputTitleKeywords),
  };
  const projectSummary = {
    id: safeString(projectState?.id),
    name: safeString(projectState?.name),
    fps: toNumber(projectState?.fps, DEFAULT_FPS),
    width: toNumber(projectState?.width, DEFAULT_WIDTH),
    height: toNumber(projectState?.height, DEFAULT_HEIGHT),
  };
  const analysisState = pipelineState?.selectedAnalysis || pipelineState?.analysis || null;
  const titlesState = pipelineState?.titles || null;
  const copyState = pipelineState?.copy || null;
  const promptsState = pipelineState?.prompts || null;
  const voiceState = pipelineState?.voice || null;
  const renderState = pipelineState?.render || null;
  const selectedTitle = summarizeSelectedTitle(pipelineState);
  const currentStepSkill = pickStepSkill(pipelineState, stepId);

  if (stepId === 1) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      project: {
        id: projectSummary.id,
        name: projectSummary.name,
      },
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 2) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      analysis: analysisState,
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 3) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      analysis: analysisState,
      titles: titlesState,
      selectedTitleId: safeString(pipelineState?.selectedTitleId),
      selectedTitle,
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 4) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      project: {
        id: projectSummary.id,
        name: projectSummary.name,
      },
      selectedTitle,
      copy: copyState,
      shots: Array.isArray(shotsState) ? shotsState : [],
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 5) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      project: {
        id: projectSummary.id,
        name: projectSummary.name,
      },
      selectedTitle,
      copy: copyState,
      shots: Array.isArray(shotsState) ? shotsState : [],
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 6) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      topic: topicState,
      project: {
        id: projectSummary.id,
        name: projectSummary.name,
      },
      selectedTitle,
      copy: copyState,
      shots: Array.isArray(shotsState) ? shotsState : [],
      stepSkill: currentStepSkill,
    };
  }

  if (stepId === 7) {
    return {
      version: STEP_CACHE_VERSION,
      stepId,
      project: projectSummary,
      shots: Array.isArray(shotsState) ? shotsState : [],
      prompts: promptsState,
      voice: voiceState,
      render: renderState,
    };
  }

  return {
    version: STEP_CACHE_VERSION,
    stepId,
    project: projectSummary,
    shots: Array.isArray(shotsState) ? shotsState : [],
    render: renderState,
    projectBuild: pipelineState?.projectBuild || null,
  };
};

const wrapStepResultWithCacheMeta = (stepResult, inputHash) => {
  return {
    ...stepResult,
    resumeMeta: {
      version: STEP_CACHE_VERSION,
      inputHash,
      updatedAt: new Date().toISOString(),
    },
  };
};

const readStepInputHash = (stepResult) => {
  return safeString(stepResult?.resumeMeta?.inputHash || stepResult?.cacheMeta?.inputHash);
};

const isValidStepResult = (stepResult, stepId) => {
  return Boolean(
    stepResult
    && Number(stepResult?.stepId) === stepId
    && stepResult?.payload
    && typeof stepResult.payload === 'object',
  );
};

const canLegacyReuseWorkflowStep = ({stepId, cachedWorkflowState, projectState, pipelineState}) => {
  if (!cachedWorkflowState || typeof cachedWorkflowState !== 'object') {
    return false;
  }

  if (stepId <= 6) {
    return true;
  }

  const cachedRender = cachedWorkflowState?.pipelineState?.render && typeof cachedWorkflowState.pipelineState.render === 'object'
    ? cachedWorkflowState.pipelineState.render
    : {};
  const currentRender = pipelineState?.render && typeof pipelineState.render === 'object'
    ? pipelineState.render
    : {};
  const cachedProject = cachedWorkflowState?.projectState && typeof cachedWorkflowState.projectState === 'object'
    ? cachedWorkflowState.projectState
    : {};

  return (
    safeString(cachedRender.quality || DEFAULT_QUALITY) === safeString(currentRender.quality || DEFAULT_QUALITY)
    && Math.round(toNumber(cachedRender.fps, cachedProject.fps || DEFAULT_FPS)) === Math.round(toNumber(currentRender.fps, projectState?.fps || DEFAULT_FPS))
    && Math.round(toNumber(cachedRender.width, cachedProject.width || DEFAULT_WIDTH)) === Math.round(toNumber(currentRender.width, projectState?.width || DEFAULT_WIDTH))
    && Math.round(toNumber(cachedRender.height, cachedProject.height || DEFAULT_HEIGHT)) === Math.round(toNumber(currentRender.height, projectState?.height || DEFAULT_HEIGHT))
  );
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

const upsertStepResult = (stepResults, stepResult) => {
  const nextResults = Array.isArray(stepResults) ? [...stepResults] : [];
  const targetStepId = Number(stepResult?.stepId);
  const existingIndex = nextResults.findIndex((item) => Number(item?.stepId) === targetStepId);

  if (existingIndex >= 0) {
    nextResults[existingIndex] = stepResult;
    return nextResults;
  }

  nextResults.push(stepResult);
  return nextResults.sort((left, right) => Number(left?.stepId) - Number(right?.stepId));
};

const refreshDependentWorkflowStep = async ({
  stepId,
  projectDir,
  allowResume,
  projectState,
  shotsState,
  pipelineState,
  explicitProjectName,
}) => {
  const stepFilePath = path.join(projectDir, 'steps', `step-${String(stepId).padStart(2, '0')}.json`);
  const stepInputHash = hashValue(buildWorkflowStepCacheInput({
    stepId,
    projectState,
    shotsState,
    pipelineState,
  }));
  const cachedStep = allowResume ? await loadJsonIfExists(stepFilePath) : null;
  let stepResult = null;
  let reused = false;

  if (allowResume && isValidStepResult(cachedStep, stepId) && readStepInputHash(cachedStep) === stepInputHash) {
    stepResult = cachedStep;
    reused = true;
  } else {
    const generatedStep = await generateWorkflowStep({
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
    stepResult = wrapStepResultWithCacheMeta(generatedStep, stepInputHash);
    await writeJson(stepFilePath, stepResult);
  }

  const merged = mergeStepResult({
    stepId,
    result: stepResult,
    projectState,
    shotsState,
    pipelineState,
    explicitProjectName,
  });

  return {
    stepResult,
    reused,
    projectState: merged.projectState,
    shotsState: merged.shotsState,
    pipelineState: merged.pipelineState,
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
    const rawDataPoints = Array.isArray(prompt.dataPoints) && prompt.dataPoints.length > 0
      ? prompt.dataPoints
      : shot.dataPoints;
    const semanticDataPoints = normalizeList(rawDataPoints, 10)
      .filter((item) => !isPlaceholderText(item));
    const narrationDataPoints = extractNarrationDataPoints(voice.text || shot.narration, 6);

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
      dataPoints: normalizeList([...narrationDataPoints, ...semanticDataPoints], 10),
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

const loadCachedWorkflowContext = async ({
  projectId,
  projectDir,
  topic,
  options,
  explicitProjectName,
  packageVersion,
}) => {
  const workflowStatePath = path.join(projectDir, 'workflow-state.json');
  const cachedWorkflowState = await loadJsonIfExists(workflowStatePath);
  const cachedInputTopic = safeString(cachedWorkflowState?.inputTopic);

  if (cachedInputTopic && cachedInputTopic !== safeString(topic)) {
    return {
      ...createInitialRunState({projectId, topic, explicitProjectName, options, packageVersion}),
      cachedWorkflowState: null,
      resumeWarning: `检测到已有缓存主题为「${cachedInputTopic}」，与当前输入「${topic}」不一致，已放弃 resume 改为全新执行。`,
    };
  }

  return {
    ...createInitialRunState({projectId, topic, explicitProjectName, options, packageVersion}),
    cachedWorkflowState,
    resumeWarning: null,
  };
};

const loadProjectCacheManifest = async (cacheManifestPath) => {
  const manifest = await loadJsonIfExists(cacheManifestPath);
  return manifest && typeof manifest === 'object'
    ? manifest
    : {
        version: 1,
        render: null,
      };
};

const buildImagePromptContext = async (imagePromptsPath) => {
  const promptsData = await loadJson(imagePromptsPath);
  const rawByShotId = promptsData?.prompts?.byShotId && typeof promptsData.prompts.byShotId === 'object'
    ? promptsData.prompts.byShotId
    : promptsData?.byShotId && typeof promptsData.byShotId === 'object'
      ? promptsData.byShotId
      : {};
  const shotMetaList = Array.isArray(promptsData?.shots) ? promptsData.shots : [];
  const shotMetaMap = Object.fromEntries(
    shotMetaList
      .filter((shot) => safeString(shot?.id))
      .map((shot, index) => [safeString(shot.id), {...shot, shotIndex: index}]),
  );
  const shotOrder = Object.keys(rawByShotId);
  const shotPlan = shotOrder.map((shotId, index) => {
    const shotMeta = shotMetaMap[shotId] || {id: shotId, shotIndex: index};
    const prompt = rawByShotId[shotId] && typeof rawByShotId[shotId] === 'object'
      ? rawByShotId[shotId]
      : {};
    return {
      shotId,
      shotIndex: Number(shotMeta?.shotIndex ?? prompt?.shotIndex ?? index),
      shotMeta,
      prompt,
    };
  });

  return {
    promptsData,
    shotPlan,
    shotOrder,
  };
};

const buildImageShotInputHash = ({promptsData, shotPlanItem}) => {
  return hashValue({
    version: IMAGE_CACHE_VERSION,
    projectId: safeString(promptsData?.projectId),
    title: safeString(promptsData?.title),
    visualSystem: safeString(promptsData?.visualSystem),
    canvasWidth: toNumber(promptsData?.canvasWidth || promptsData?.renderWidth, DEFAULT_WIDTH),
    canvasHeight: toNumber(promptsData?.canvasHeight || promptsData?.renderHeight, DEFAULT_HEIGHT),
    shotId: shotPlanItem.shotId,
    shotIndex: shotPlanItem.shotIndex,
    shot: shotPlanItem.shotMeta,
    prompt: shotPlanItem.prompt,
  });
};

const buildPartialImagePromptsPayload = ({promptsData, shotPlan, selectedShotIds}) => {
  const selectedSet = new Set(selectedShotIds);
  const filteredPlan = shotPlan.filter((item) => selectedSet.has(item.shotId));
  const byShotId = Object.fromEntries(
    filteredPlan.map((item) => [
      item.shotId,
      {
        ...(item.prompt && typeof item.prompt === 'object' ? item.prompt : {}),
        shotIndex: item.shotIndex,
      },
    ]),
  );
  const shots = filteredPlan.map((item) => ({
    ...(item.shotMeta && typeof item.shotMeta === 'object' ? item.shotMeta : {id: item.shotId}),
    shotIndex: item.shotIndex,
  }));
  const basePrompts = promptsData?.prompts && typeof promptsData.prompts === 'object'
    ? promptsData.prompts
    : null;

  return {
    ...promptsData,
    shots,
    byShotId,
    ...(basePrompts
      ? {
          prompts: {
            ...basePrompts,
            byShotId,
          },
        }
      : {}),
  };
};

const orderImageEntries = (images, shotOrder) => {
  const imageMap = new Map(
    (Array.isArray(images) ? images : [])
      .filter((item) => safeString(item?.shotId))
      .map((item) => [safeString(item.shotId), item]),
  );
  return (Array.isArray(shotOrder) ? shotOrder : [])
    .map((shotId) => imageMap.get(shotId))
    .filter(Boolean);
};

const planReusableImages = async ({imagePromptsPath, imageManifestPath}) => {
  const {promptsData, shotPlan, shotOrder} = await buildImagePromptContext(imagePromptsPath);
  const manifest = await loadJsonIfExists(imageManifestPath);
  const manifestImages = Array.isArray(manifest?.images) ? manifest.images : [];
  const manifestMap = new Map(
    manifestImages
      .filter((item) => safeString(item?.shotId))
      .map((item) => [safeString(item.shotId), item]),
  );
  const reusable = [];
  const toGenerate = [];
  const inputHashes = {};

  for (const item of shotPlan) {
    const inputHash = buildImageShotInputHash({promptsData, shotPlanItem: item});
    inputHashes[item.shotId] = inputHash;
    const cachedImage = manifestMap.get(item.shotId);
    const cachedHash = safeString(cachedImage?.inputHash);

    if (cachedHash && cachedHash === inputHash && safeString(cachedImage?.path) && await fileExists(resolvePublicAssetFile(cachedImage.path))) {
      reusable.push({
        shotId: item.shotId,
        path: safeString(cachedImage.path),
        format: safeString(cachedImage.format) || 'svg',
        motif: safeString(cachedImage.motif),
        inputHash,
      });
      continue;
    }

    toGenerate.push(item);
  }

  return {
    promptsData,
    shotPlan,
    shotOrder,
    inputHashes,
    reusable: orderImageEntries(reusable, shotOrder),
    toGenerate,
  };
};

const buildVoiceSettings = (options, pipelineState) => {
  return {
    ...(pipelineState?.voice && typeof pipelineState.voice === 'object' ? pipelineState.voice : {}),
    engine: options.voiceEngine,
    speed: options.voiceSpeed,
    ...(safeString(options.speaker)
      ? {
          speakerSeed: options.speaker,
          voice: options.speaker,
        }
      : {}),
  };
};

const resolveVoiceShotText = (shot, pipelineState) => {
  return safeString(
    pipelineState?.voice?.byShotId?.[shot.id]?.text || shot?.narration,
  );
};

const buildVoiceShotInputHash = ({shot, pipelineState, voiceSettings}) => {
  return hashValue({
    version: VOICE_CACHE_VERSION,
    shotId: safeString(shot?.id),
    text: resolveVoiceShotText(shot, pipelineState),
    engine: safeString(voiceSettings?.engine),
    speed: safeString(voiceSettings?.speed),
    speakerSeed: safeString(voiceSettings?.speakerSeed),
    voice: safeString(voiceSettings?.voice),
    referenceUrl: safeString(voiceSettings?.referenceUrl || voiceSettings?.reference_url),
    temperature: toNumber(voiceSettings?.temperature, 0.3),
    topP: toNumber(voiceSettings?.topP ?? voiceSettings?.top_p, 0.7),
    topK: toNumber(voiceSettings?.topK ?? voiceSettings?.top_k, 20),
  });
};

const buildVoiceManifestPayload = ({projectId, shotsState, pipelineState, voiceSettings, queue}) => {
  const queueMap = new Map(
    (Array.isArray(queue) ? queue : [])
      .filter((item) => safeString(item?.shotId))
      .map((item) => [safeString(item.shotId), item]),
  );
  const shots = {};

  for (const shot of Array.isArray(shotsState) ? shotsState : []) {
    const shotId = safeString(shot?.id);
    if (!shotId) {
      continue;
    }

    const queueEntry = queueMap.get(shotId);
    if (!queueEntry || !safeString(queueEntry.voiceFile)) {
      continue;
    }

    shots[shotId] = {
      inputHash: buildVoiceShotInputHash({shot, pipelineState, voiceSettings}),
      durationSeconds: roundTo(toNumber(queueEntry.durationSeconds, 0)),
      voiceFile: safeString(queueEntry.voiceFile),
    };
  }

  return {
    version: VOICE_CACHE_VERSION,
    projectId,
    generatedAt: new Date().toISOString(),
    mergedVoiceFile: safeString(pipelineState?.voice?.mergedVoiceFile) || null,
    settings: {
      engine: safeString(voiceSettings?.engine),
      speed: safeString(voiceSettings?.speed),
      speakerSeed: safeString(voiceSettings?.speakerSeed),
      voice: safeString(voiceSettings?.voice),
      referenceUrl: safeString(voiceSettings?.referenceUrl || voiceSettings?.reference_url),
      temperature: toNumber(voiceSettings?.temperature, 0.3),
      topP: toNumber(voiceSettings?.topP ?? voiceSettings?.top_p, 0.7),
      topK: toNumber(voiceSettings?.topK ?? voiceSettings?.top_k, 20),
    },
    shots,
  };
};

const planReusableVoiceQueue = async ({projectDir, shotsState, pipelineState, options}) => {
  const voiceManifestPath = path.join(projectDir, 'voice-manifest.json');
  const voiceManifest = await loadJsonIfExists(voiceManifestPath);
  const voiceSettings = buildVoiceSettings(options, pipelineState);
  const queue = [];
  const missingShots = [];

  for (const shot of Array.isArray(shotsState) ? shotsState : []) {
    const shotId = safeString(shot?.id);
    if (!shotId) {
      continue;
    }

    const inputHash = buildVoiceShotInputHash({shot, pipelineState, voiceSettings});
    const cachedShot = voiceManifest?.shots && typeof voiceManifest.shots === 'object'
      ? voiceManifest.shots[shotId]
      : null;
    const cachedHash = safeString(cachedShot?.inputHash);
    const voiceFile = safeString(cachedShot?.voiceFile);

    if (cachedHash && cachedHash === inputHash && voiceFile && await fileExists(resolvePublicAssetFile(voiceFile))) {
      queue.push({
        id: `reuse-${shotId}`,
        shotId,
        status: 'done',
        durationSeconds: roundTo(toNumber(cachedShot?.durationSeconds, 0)),
        voiceFile,
      });
      continue;
    }

    missingShots.push(shot);
  }

  return {
    voiceManifestPath,
    voiceSettings,
    reusableQueue: queue,
    missingShots,
  };
};

const executeCommand = async (command, args, {cwd, label, env = {}}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        ...env,
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

const resolveBundledFfmpegPath = async () => {
  const candidates = [
    path.join(REMOTION_ROOT, 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
    path.join(REMOTION_ROOT, 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    path.join(REMOTION_ROOT, 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    path.join(REMOTION_ROOT, 'node_modules', '@remotion', 'compositor-linux-arm64-gnu', 'ffmpeg'),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('未找到可用的 Remotion ffmpeg 二进制');
};

const buildBundledFfmpegEnv = (ffmpegPath) => {
  const libDir = path.dirname(ffmpegPath);
  if (process.platform === 'darwin') {
    return {
      DYLD_LIBRARY_PATH: libDir,
    };
  }
  if (process.platform === 'win32') {
    return {
      PATH: `${libDir};${process.env.PATH || ''}`,
    };
  }
  return {
    LD_LIBRARY_PATH: libDir,
  };
};

const buildMergedVoiceTrack = async ({
  projectId,
  audioSegments,
  fps,
  totalDurationSeconds,
}) => {
  const segments = Array.isArray(audioSegments)
    ? audioSegments.filter((segment) => safeString(segment?.src))
    : [];

  if (segments.length === 0) {
    return null;
  }

  const ffmpegPath = await resolveBundledFfmpegPath();
  const outputRelativePath = `/assets/voice/${projectId}/full-narration.wav`;
  const outputAbsolutePath = resolvePublicAssetFile(outputRelativePath);
  await ensureDir(path.dirname(outputAbsolutePath));

  const inputArgs = [];
  const filterParts = [];
  const mixInputs = [];
  const durationLimit = Math.max(0.1, roundTo(totalDurationSeconds || 0, 3));

  for (const [index, segment] of segments.entries()) {
    const inputPath = resolvePublicAssetFile(segment.src);
    if (!await fileExists(inputPath)) {
      throw new Error(`缺少配音片段，无法合成长旁白：${segment.src}`);
    }

    inputArgs.push('-i', inputPath);
    const delayMs = Math.max(
      0,
      Math.round((toNumber(segment.startFrame, 0) / Math.max(1, toNumber(fps, DEFAULT_FPS))) * 1000),
    );
    filterParts.push(`[${index}:a]aresample=22050,adelay=${delayMs},volume=1[a${index}]`);
    mixInputs.push(`[a${index}]`);
  }

  const mixFilter = mixInputs.length === 1
    ? `${mixInputs[0]}apad=pad_dur=${durationLimit},atrim=0:${durationLimit}[mixout]`
    : `${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0,apad=pad_dur=${durationLimit},atrim=0:${durationLimit}[mixout]`;

  await executeCommand(
    ffmpegPath,
    [
      '-loglevel', 'error',
      '-y',
      ...inputArgs,
      '-filter_complex', [...filterParts, mixFilter].join(';'),
      '-map', '[mixout]',
      '-ac', '1',
      '-ar', '22050',
      '-c:a', 'pcm_s16le',
      outputAbsolutePath,
    ],
    {
      cwd: REMOTION_ROOT,
      label: 'merge-voice-track',
      env: buildBundledFfmpegEnv(ffmpegPath),
    },
  );

  return {
    relativePath: outputRelativePath,
    absolutePath: outputAbsolutePath,
  };
};

const muxRenderedAudioTrack = async ({
  videoPath,
  audioRelativePath,
}) => {
  const resolvedVideoPath = safeString(videoPath);
  const resolvedAudioPath = resolvePublicAssetFile(audioRelativePath);

  if (!resolvedVideoPath || !resolvedAudioPath || !await fileExists(resolvedVideoPath) || !await fileExists(resolvedAudioPath)) {
    return;
  }

  const ffmpegPath = await resolveBundledFfmpegPath();
  const outputDir = path.dirname(resolvedVideoPath);
  const baseName = path.basename(resolvedVideoPath, path.extname(resolvedVideoPath));
  const tempMuxedPath = path.join(outputDir, `${baseName}.muxing.mp4`);

  await executeCommand(
    ffmpegPath,
    [
      '-loglevel', 'error',
      '-y',
      '-i', resolvedVideoPath,
      '-i', resolvedAudioPath,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      tempMuxedPath,
    ],
    {
      cwd: REMOTION_ROOT,
      label: 'mux-rendered-audio',
      env: buildBundledFfmpegEnv(ffmpegPath),
    },
  );

  await fs.rename(tempMuxedPath, resolvedVideoPath);
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

const applyGeneratedImages = async ({
  projectJsonPath,
  workflowStatePath,
  imageManifestPath,
  images,
  inputHashesByShotId,
  shotOrder,
}) => {
  const imageEntries = orderImageEntries(images, shotOrder).map((image, index) => ({
    ...image,
    shotIndex: index,
    inputHash: safeString(inputHashesByShotId?.[safeString(image?.shotId)]),
  }));
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
    images: imageEntries,
  };
};

const logSection = (title) => {
  process.stdout.write(`\n=== ${title} ===\n`);
};

const setStageTiming = (timingMap, key, status, startedAt, startTime, details = {}) => {
  timingMap[key] = {
    status,
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    ...details,
  };
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
  const packageVersion = await resolvePackageVersion(options.packageVersion);
  const workflowContext = options.resume
    ? await loadCachedWorkflowContext({
        projectId,
        projectDir,
        topic,
        options,
        explicitProjectName,
        packageVersion,
      })
    : {
        ...createInitialRunState({
          projectId,
          topic,
          explicitProjectName,
          options,
          packageVersion,
        }),
        cachedWorkflowState: null,
        resumeWarning: null,
      };
  let projectState = workflowContext.projectState;
  let shotsState = workflowContext.shotsState;
  let pipelineState = workflowContext.pipelineState;
  const cacheManifestPath = path.join(projectDir, 'cache-manifest.json');
  const cacheManifest = await loadProjectCacheManifest(cacheManifestPath);
  let stepResults = [];
  const warnings = [];
  const stageTimings = {};
  const stepTimings = [];
  let resumedStepCount = 0;
  let resumedFromCache = false;
  let reusedVoice = false;
  let reusedImages = false;
  let reusedRender = false;
  let reusedVoiceCount = 0;
  let generatedVoiceCount = 0;
  let reusedImageCount = 0;
  let generatedImageCount = 0;
  const reusedWorkflowStepIds = [];
  const regeneratedWorkflowStepIds = [];
  let allowResume = Boolean(options.resume);

  if (workflowContext.resumeWarning) {
    warnings.push(workflowContext.resumeWarning);
    process.stdout.write(`[resume] warning: ${workflowContext.resumeWarning}\n`);
    allowResume = false;
  }

  logSection('Workflow 1-8');
  const workflowStartedAt = new Date().toISOString();
  const workflowStart = Date.now();
  let legacyResumeOpen = allowResume;

  for (let stepId = 1; stepId <= 8; stepId += 1) {
    const stepFilePath = path.join(stepsDir, `step-${String(stepId).padStart(2, '0')}.json`);
    const stepInputHash = hashValue(buildWorkflowStepCacheInput({
      stepId,
      projectState,
      shotsState,
      pipelineState,
    }));
    const cachedStep = allowResume ? await loadJsonIfExists(stepFilePath) : null;
    let stepResult = null;
    let reusedStep = false;
    let reuseMode = '';

    if (allowResume && isValidStepResult(cachedStep, stepId)) {
      const cachedInputHash = readStepInputHash(cachedStep);
      if (cachedInputHash && cachedInputHash === stepInputHash) {
        stepResult = cachedStep;
        reusedStep = true;
        reuseMode = 'hash';
      } else if (
        !cachedInputHash
        && legacyResumeOpen
        && canLegacyReuseWorkflowStep({
          stepId,
          cachedWorkflowState: workflowContext.cachedWorkflowState,
          projectState,
          pipelineState,
        })
      ) {
        stepResult = wrapStepResultWithCacheMeta(cachedStep, stepInputHash);
        reusedStep = true;
        reuseMode = 'legacy';
        await writeJson(stepFilePath, stepResult);
      }
    }

    if (reusedStep) {
      resumedStepCount += 1;
      reusedWorkflowStepIds.push(stepId);
      process.stdout.write(`[workflow] step ${stepId}/8 reused (${reuseMode})\n`);
      stepTimings.push({
        stepId,
        startedAt: null,
        endedAt: null,
        durationMs: 0,
        source: stepResult?.source || 'cached',
        model: stepResult?.model || 'cached',
        status: 'reused',
      });
    } else {
      legacyResumeOpen = false;
      process.stdout.write(`[workflow] step ${stepId}/8\n`);
      const startedAt = new Date().toISOString();
      const stepStart = Date.now();
      const generatedStep = await generateWorkflowStep({
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
      stepResult = wrapStepResultWithCacheMeta(generatedStep, stepInputHash);
      regeneratedWorkflowStepIds.push(stepId);
      stepTimings.push({
        stepId,
        startedAt,
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - stepStart,
        source: stepResult?.source || 'unknown',
        model: stepResult?.model || 'unknown',
        status: 'done',
      });
      await writeJson(stepFilePath, stepResult);
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
  }

  if (Array.isArray(shotsState) && shotsState.length > 0) {
    process.stdout.write('[workflow] syncing step 5 prompts with latest shot narration\n');
    const promptSync = await refreshDependentWorkflowStep({
      stepId: 5,
      projectDir,
      allowResume,
      projectState,
      shotsState,
      pipelineState,
      explicitProjectName,
    });
    stepResults = upsertStepResult(stepResults, promptSync.stepResult);
    projectState = promptSync.projectState;
    shotsState = promptSync.shotsState;
    pipelineState = promptSync.pipelineState;
    process.stdout.write(
      promptSync.reused
        ? '[workflow] step 5/8 prompt cache already matched latest narration\n'
        : '[workflow] step 5/8 regenerated after narration update\n',
    );
  }

  resumedFromCache = resumedStepCount > 0;
  if (resumedFromCache) {
    process.stdout.write(`[resume] reused workflow steps: ${reusedWorkflowStepIds.join(', ')}\n`);
  }
  setStageTiming(
    stageTimings,
    'workflow',
    regeneratedWorkflowStepIds.length === 0 ? 'reused' : reusedWorkflowStepIds.length > 0 ? 'partial' : 'done',
    workflowStartedAt,
    workflowStart,
    {
      reusedSteps: resumedStepCount,
      regeneratedSteps: regeneratedWorkflowStepIds.length,
    },
  );

  pipelineState.render = {
    ...(pipelineState.render && typeof pipelineState.render === 'object' ? pipelineState.render : {}),
    template: DEFAULT_TEMPLATE,
    quality: options.quality,
    fps: options.fps,
    width: options.width,
    height: options.height,
    packageVersion,
    format: 'mp4',
    codec: 'h264',
    bitrate: toNumber(pipelineState?.render?.bitrate, 12000) || 12000,
    estimatedDuration: sumShotDurations(shotsState),
  };

  if (options.voice) {
    logSection('Voice');
    const voiceStartedAt = new Date().toISOString();
    const voiceStart = Date.now();
    try {
      const voicePlan = allowResume
        ? await planReusableVoiceQueue({projectDir, shotsState, pipelineState, options})
        : {
            voiceManifestPath: path.join(projectDir, 'voice-manifest.json'),
            voiceSettings: buildVoiceSettings(options, pipelineState),
            reusableQueue: [],
            missingShots: Array.isArray(shotsState) ? shotsState : [],
          };
      const shotOrder = (Array.isArray(shotsState) ? shotsState : []).map((shot) => safeString(shot?.id));
      let mergedVoiceQueue = [...voicePlan.reusableQueue];

      if (voicePlan.missingShots.length === 0 && voicePlan.reusableQueue.length === 0) {
        process.stdout.write('[voice] no shots to synthesize\n');
      } else if (voicePlan.missingShots.length === 0 && voicePlan.reusableQueue.length > 0) {
        reusedVoice = true;
        reusedVoiceCount = voicePlan.reusableQueue.length;
        process.stdout.write(`[voice] reused=${reusedVoiceCount}\n`);
      } else {
        const voiceJobId = `voice_${Date.now()}`;
        const voiceResult = await processVoiceJob(
          {
            id: voiceJobId,
            data: {
              projectId,
              shots: voicePlan.missingShots.map((shot) => ({
                ...shot,
                narration: resolveVoiceShotText(shot, pipelineState),
              })),
              voiceSettings: voicePlan.voiceSettings,
            },
          },
          (pct, message) => {
            process.stdout.write(`[voice] ${String(pct).padStart(3, ' ')}% ${message}\n`);
          },
        );

        reusedVoiceCount = voicePlan.reusableQueue.length;
        generatedVoiceCount = Array.isArray(voiceResult.queue) ? voiceResult.queue.length : 0;
        const mergedVoiceMap = new Map(
          [...voicePlan.reusableQueue, ...voiceResult.queue].map((item) => [safeString(item?.shotId), item]),
        );
        mergedVoiceQueue = shotOrder.map((shotId) => mergedVoiceMap.get(shotId)).filter(Boolean);
        process.stdout.write(
          reusedVoiceCount > 0
            ? `[voice] reused=${reusedVoiceCount}, generated=${generatedVoiceCount}\n`
            : `[voice] total clips=${voiceResult.totalClips}, total duration=${voiceResult.totalDurationSeconds}s\n`,
        );
      }

      const adjusted = applyVoiceDurations(shotsState, mergedVoiceQueue, options.fps);
      shotsState = adjusted.shots;
      pipelineState.voice = updateVoiceState(pipelineState, mergedVoiceQueue);
      pipelineState.render = {
        ...(pipelineState.render && typeof pipelineState.render === 'object' ? pipelineState.render : {}),
        packageVersion,
        estimatedDuration: sumShotDurations(shotsState),
      };
      pipelineState.audioSegments = adjusted.audioSegments;
      const mergedVoiceTrack = await buildMergedVoiceTrack({
        projectId,
        audioSegments: adjusted.audioSegments,
        fps: options.fps,
        totalDurationSeconds: sumShotDurations(shotsState),
      });
      if (mergedVoiceTrack) {
        pipelineState.voice = {
          ...(pipelineState.voice && typeof pipelineState.voice === 'object' ? pipelineState.voice : {}),
          mergedVoiceFile: mergedVoiceTrack.relativePath,
        };
      }
      await writeJson(
        voicePlan.voiceManifestPath,
        buildVoiceManifestPayload({
          projectId,
          shotsState,
          pipelineState,
          voiceSettings: voicePlan.voiceSettings,
          queue: mergedVoiceQueue,
        }),
      );
      reusedVoice = reusedVoiceCount > 0;
      setStageTiming(
        stageTimings,
        'voice',
        generatedVoiceCount === 0 && reusedVoiceCount > 0 ? 'reused' : reusedVoiceCount > 0 ? 'partial' : 'done',
        voiceStartedAt,
        voiceStart,
        {
          reusedCount: reusedVoiceCount,
          generatedCount: generatedVoiceCount,
        },
      );
    } catch (error) {
      setStageTiming(stageTimings, 'voice', 'error', voiceStartedAt, voiceStart, {
        error: error instanceof Error ? error.message : String(error),
      });
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
    packageVersion,
    template: DEFAULT_TEMPLATE,
    visualSystem: DEFAULT_VISUAL_SYSTEM,
    voiceFile: safeString(pipelineState?.voice?.mergedVoiceFile) || null,
    render: {
      fps: options.fps,
      width: options.width,
      height: options.height,
      packageVersion,
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
    packageVersion,
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
    const imagesStartedAt = new Date().toISOString();
    const imagesStart = Date.now();
    try {
      const imagePlan = allowResume
        ? await planReusableImages({
            imagePromptsPath: buildResult.imagePromptsPath,
            imageManifestPath,
          })
        : await (async () => {
            const emptyPlan = await buildImagePromptContext(buildResult.imagePromptsPath);
            return {
              ...emptyPlan,
              inputHashes: Object.fromEntries(
                emptyPlan.shotPlan.map((item) => [
                  item.shotId,
                  buildImageShotInputHash({promptsData: emptyPlan.promptsData, shotPlanItem: item}),
                ]),
              ),
              reusable: [],
              toGenerate: emptyPlan.shotPlan,
            };
          })();
      reusedImageCount = imagePlan.reusable.length;
      let mergedImages = [...imagePlan.reusable];

      if (imagePlan.toGenerate.length > 0) {
        let promptsPathForRun = buildResult.imagePromptsPath;
        let tempPromptsPath = null;
        if (imagePlan.toGenerate.length !== imagePlan.shotPlan.length) {
          tempPromptsPath = path.join(projectDir, `image-prompts.partial.${Date.now()}.json`);
          await writeJson(
            tempPromptsPath,
            buildPartialImagePromptsPayload({
              promptsData: imagePlan.promptsData,
              shotPlan: imagePlan.shotPlan,
              selectedShotIds: imagePlan.toGenerate.map((item) => item.shotId),
            }),
          );
          promptsPathForRun = tempPromptsPath;
        }

        try {
          const imageResult = await runGenerateProjectImages(projectId, promptsPathForRun);
          generatedImageCount = Array.isArray(imageResult.images) ? imageResult.images.length : 0;
          mergedImages = orderImageEntries(
            [...imagePlan.reusable, ...(Array.isArray(imageResult.images) ? imageResult.images : [])],
            imagePlan.shotOrder,
          );
        } finally {
          if (tempPromptsPath) {
            await fs.rm(tempPromptsPath, {force: true});
          }
        }
      } else {
        reusedImages = mergedImages.length > 0;
      }

      generatedImageSummary = await applyGeneratedImages({
        projectJsonPath,
        workflowStatePath,
        imageManifestPath,
        images: mergedImages,
        inputHashesByShotId: imagePlan.inputHashes,
        shotOrder: imagePlan.shotOrder,
      });
      reusedImages = reusedImageCount > 0;
      setStageTiming(
        stageTimings,
        'images',
        generatedImageCount === 0 && reusedImageCount > 0 ? 'reused' : reusedImageCount > 0 ? 'partial' : 'done',
        imagesStartedAt,
        imagesStart,
        {
          reusedCount: reusedImageCount,
          generatedCount: generatedImageCount,
        },
      );
      process.stdout.write(
        generatedImageCount === 0
          ? `[images] reused=${reusedImageCount}\n`
          : reusedImageCount > 0
            ? `[images] reused=${reusedImageCount}, generated=${generatedImageCount}\n`
            : `[images] generated=${generatedImageCount}\n`,
      );

      logSection('Rebuild');
      buildResult = await measureAsync(stageTimings, 'rebuild', async () => {
        return await runBuildProject(projectId);
      });
    } catch (error) {
      setStageTiming(stageTimings, 'images', 'error', imagesStartedAt, imagesStart, {
        error: error instanceof Error ? error.message : String(error),
      });
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
      : path.join(
          REMOTION_ROOT,
          'public',
          'assets',
          'outputs',
          projectId,
          `${projectId}-v${sanitizeVersionForFileName(packageVersion)}.mp4`,
        );
    await ensureDir(path.dirname(resolvedOutputPath));
    const renderInputHash = hashValue({
      version: RENDER_CACHE_VERSION,
      outputPath: resolvedOutputPath,
      renderProps: await loadJson(buildResult.renderPropsPath),
    });
    if (
      allowResume
      && cacheManifest?.render
      && safeString(cacheManifest.render.inputHash) === renderInputHash
      && safeString(cacheManifest.render.outputPath) === resolvedOutputPath
      && await fileExists(resolvedOutputPath)
    ) {
      reusedRender = true;
      markStageReused(stageTimings, 'render', {outputPath: resolvedOutputPath});
      process.stdout.write(`[render] reused existing output ${resolvedOutputPath}\n`);
    } else {
      await measureAsync(stageTimings, 'render', async () => {
        await runRenderProject(projectId, resolvedOutputPath);
      });
      cacheManifest.render = {
        version: RENDER_CACHE_VERSION,
        inputHash: renderInputHash,
        outputPath: resolvedOutputPath,
        updatedAt: new Date().toISOString(),
      };
    }

    if (options.voice && safeString(projectJson.voiceFile)) {
      await measureAsync(stageTimings, 'audioMux', async () => {
        await muxRenderedAudioTrack({
          videoPath: resolvedOutputPath,
          audioRelativePath: projectJson.voiceFile,
        });
      });
    }
  }

  await writeJson(cacheManifestPath, cacheManifest);

  const report = {
    status: 'ok',
    projectId,
    title: finalTitle,
    topic,
    packageVersion,
    renderEnabled: Boolean(options.render),
    imagesEnabled: Boolean(options.images),
    voiceEnabled: Boolean(options.voice),
    resumeEnabled: Boolean(options.resume),
    resumedFromCache,
    resumedStepCount,
    reusedWorkflowStepIds,
    regeneratedWorkflowStepIds,
    reusedVoice,
    reusedVoiceCount,
    generatedVoiceCount,
    reusedImages,
    reusedImageCount,
    generatedImageCount,
    reusedRender,
    shotCount: projectShots.length,
    durationSeconds: sumShotDurations(shotsState),
    projectJsonPath,
    workflowStatePath,
    imagePromptsPath: buildResult.imagePromptsPath,
    imageManifestPath: generatedImageSummary?.imageManifestPath || null,
    imageAssetCount: generatedImageSummary?.total || 0,
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

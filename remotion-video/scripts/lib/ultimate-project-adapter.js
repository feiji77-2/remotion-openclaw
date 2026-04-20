const ULTIMATE_TEMPLATE = 'ultimate';
const ULTIMATE_VISUAL_SYSTEMS = new Set(['ultimate', 'ultimate-1080p', 'ultimate-kit', 'ultimate-scene']);
const ULTIMATE_DEFAULT_FPS = 30;
const ULTIMATE_DEFAULT_WIDTH = 1920;
const ULTIMATE_DEFAULT_HEIGHT = 1080;
const ACCENT_ROTATION = ['cyan', 'green', 'yellow', 'orange', 'purple', 'red'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const safeString = (value) => String(value || '').trim();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const compactText = (value, max = 80) => {
  const text = safeString(value);
  if (!text) {
    return '';
  }

  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
};

const asArray = (value) => {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
};

const uniqueList = (items, max = Infinity) => {
  const seen = new Set();
  const output = [];

  for (const item of items.map((entry) => safeString(entry)).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
    if (output.length >= max) {
      break;
    }
  }

  return output;
};

const splitTextUnits = (value) => {
  return uniqueList(
    safeString(value)
      .replace(/\s+/g, ' ')
      .split(/[。！？!?\n]|(?<=，)|(?<=；)|(?<=：)|(?<=,)|(?<=;)|(?<=:)/u)
      .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
      .filter(Boolean),
    12,
  );
};

const splitTitleTokens = (value) => {
  const text = safeString(value);

  if (!text) {
    return [];
  }

  const parts = text
    .replace(/[“”"'‘’（）()【】\[\]]/g, ' ')
    .split(/[\/、，,：:·\-\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean);

  return uniqueList(parts, 8);
};

const extractNumberTokens = (value) => {
  return uniqueList(
    safeString(value).match(/(?:20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d+(?:\.\d+)?%?|\d+\s*[年月日天次项版])/g) || [],
    8,
  );
};

const inferAccent = (shot, index) => {
  const tone = `${safeString(shot?.style)} ${safeString(shot?.mood)} ${safeString(shot?.title)} ${safeString(shot?.visualFocusZh)}`.toLowerCase();

  if (/warm|发布|升级|结论|收束|里程碑|spark|cta/.test(tone)) {
    return index % 2 === 0 ? 'orange' : 'yellow';
  }

  if (/cool|tech|并行|system|security|terminal|code|memory|tool/.test(tone)) {
    return index % 2 === 0 ? 'cyan' : 'green';
  }

  return ACCENT_ROTATION[index % ACCENT_ROTATION.length];
};

const buildOverlay = (project, width, height) => {
  if (project?.defaultPlatformOverlay === false || project?.overlay === false) {
    return false;
  }

  const projectId = safeString(project?.projectId) || 'openclaw';
  const title = safeString(project?.title);

  return {
    brand: safeString(project?.brand) || 'OpenClaw',
    account: safeString(project?.account) || `@${projectId}`,
    searchLabel: safeString(project?.searchLabel) || title || 'Search reusable scenes',
    watermark: safeString(project?.watermark) || `${width}x${height}`,
  };
};

const normalizeDurationInFrames = (shot, fps) => {
  const durationSeconds = Math.max(1.8, toNumber(shot?.durationSeconds, 6));
  return Math.max(54, Math.round(durationSeconds * fps));
};

const collectListTokens = (shot, max = 4) => {
  return uniqueList(
    [
      ...asArray(shot?.dataPoints),
      ...asArray(shot?.keywords),
      ...splitTitleTokens(shot?.title),
      ...splitTitleTokens(shot?.visualFocusZh),
      ...splitTextUnits(shot?.narration),
    ],
    max,
  );
};

const buildFeatureItems = (shot) => {
  const baseItems = collectListTokens(shot, 4);

  return baseItems.map((item, index) => ({
    title: compactText(item, 18),
    eyebrow: `slot ${String.fromCharCode(97 + (index % 26))}`,
    caption: compactText(
      asArray(shot?.dataPoints)[index]
        || asArray(shot?.keywords)[index]
        || splitTextUnits(shot?.narration)[index]
        || shot?.visualSummaryZh
        || shot?.narration,
      34,
    ),
    icon: compactText(item, 1) || String(index + 1),
    accent: inferAccent(shot, index),
  }));
};

const buildStepItems = (shot) => {
  const steps = uniqueList(
    [...asArray(shot?.dataPoints), ...splitTextUnits(shot?.narration)],
    5,
  );

  return steps.map((item, index) => ({
    label: compactText(item, 18),
    detail: compactText(splitTextUnits(shot?.visualSummaryZh)[index] || shot?.narration, 38),
    icon: String(index + 1),
    accent: inferAccent(shot, index),
  }));
};

const buildTagItems = (shot) => {
  return uniqueList(
    [...asArray(shot?.keywords), ...asArray(shot?.dataPoints), ...splitTitleTokens(shot?.title)],
    10,
  ).map((item, index) => ({
    label: compactText(item, 18),
    accent: inferAccent(shot, index),
  }));
};

const buildMetricItems = (shot) => {
  const numbers = uniqueList(
    [...extractNumberTokens(shot?.title), ...extractNumberTokens(shot?.narration), ...asArray(shot?.dataPoints)],
    4,
  );
  const labels = uniqueList([...asArray(shot?.keywords), ...splitTitleTokens(shot?.visualFocusZh), ...splitTitleTokens(shot?.title)], 4);

  return numbers.map((item, index) => ({
    label: compactText(labels[index] || `指标 ${index + 1}`, 16),
    value: compactText(item, 18),
    ratio: Number(clamp(0.92 - index * 0.13, 0.4, 0.95).toFixed(2)),
    accent: inferAccent(shot, index),
  }));
};

const buildCodeLines = (shot) => {
  const lines = splitTextUnits(shot?.promptZh)
    .slice(0, 4)
    .map((item) => compactText(item, 48));

  if (lines.length === 0) {
    lines.push(compactText(shot?.narration || shot?.visualSummaryZh || shot?.title, 48));
  }

  return [
    {text: '{', tone: 'base'},
    {text: `  "title": "${compactText(shot?.title, 24)}",`, tone: 'accent'},
    {text: `  "focus": "${compactText(shot?.visualFocusZh || shot?.type || 'scene', 24)}",`, tone: 'base'},
    {text: `  "summary": "${compactText(lines[0], 34)}"`, tone: 'muted'},
    {text: '}', tone: 'base'},
  ];
};

const buildTerminalOutputs = (shot) => {
  const items = uniqueList(
    [
      ...splitTextUnits(shot?.visualSummaryZh),
      ...splitTextUnits(shot?.narration),
      ...asArray(shot?.dataPoints),
    ],
    4,
  );

  const fallbackItems = items.length > 0 ? items : [shot?.title || shot?.visualFocusZh || shot?.narration || 'scene ready'];

  return fallbackItems.map((item) => `> ${compactText(item, 48)}`);
};

const sceneCycle = ['focus', 'feature-rail', 'tag-matrix', 'metrics', 'feature-rail', 'focus'];

const inferSceneFamily = (shot, index, total) => {
  const title = safeString(shot?.title);
  const text = `${title} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();

  if (index === 0) {
    return 'hero';
  }

  if (index === total - 1) {
    return 'cta';
  }

  if (/(命令|终端|日志|运行|shell|bash|terminal|cli|render)/.test(text)) {
    return 'terminal';
  }

  if (/(代码|schema|json|配置|脚本|api|函数|code)/.test(text)) {
    return 'code';
  }

  if (/(步骤|流程|工作流|依次|第一|第二|第三|先|再|最后|pipeline|process)/.test(text) && buildStepItems(shot).length >= 3) {
    return 'step-flow';
  }

  if ((Array.isArray(shot?.comparisons) && shot.comparisons.length > 0) || /(对比|差异|vs|不是.*而是)/.test(text)) {
    return 'number-strip';
  }

  if (extractNumberTokens(text).length >= 2) {
    return 'metrics';
  }

  if (asArray(shot?.keywords).length + asArray(shot?.dataPoints).length >= 5) {
    return 'tag-matrix';
  }

  if (safeString(shot?.visualFocusZh).length > 0 && safeString(shot?.visualFocusZh).length <= 24) {
    return 'focus';
  }

  return sceneCycle[(index - 1) % sceneCycle.length] || 'focus';
};

const buildSceneData = (family, shot, index) => {
  const accent = inferAccent(shot, index);
  const title = compactText(shot?.title || shot?.level || shot?.type || `Scene ${index + 1}`, 28);
  const subtitle = compactText(shot?.visualSummaryZh || shot?.narration, 72);
  const keywords = uniqueList(asArray(shot?.keywords), 3);
  const points = collectListTokens(shot, 4);
  const metricItems = buildMetricItems(shot);

  switch (family) {
    case 'hero':
      return {
        kicker: compactText(shot?.topLabel || shot?.level || shot?.type || 'search-driven workflow', 28),
        title,
        subtitle: compactText(shot?.narration || shot?.visualSummaryZh, 94),
        badge: keywords.join(' / ') || compactText(shot?.visualFocusZh || 'hero / opener', 32),
        accent,
        avatarLabel: 'AI',
      };
    case 'focus':
      return {
        eyebrow: compactText(shot?.level || shot?.type || 'focus explainer', 28),
        keyword: compactText(shot?.visualFocusZh || splitTitleTokens(title)[0] || title, 18),
        question: title,
        description: compactText(shot?.narration || shot?.visualSummaryZh, 88),
        accent,
        diagram: /对比|parallel|系统|loop|闭环/.test(`${shot?.visualFocusZh || ''} ${shot?.title || ''}`.toLowerCase()) ? 'rings' : 'framing',
      };
    case 'feature-rail':
      return {
        kicker: compactText(shot?.level || shot?.type || 'feature rail', 28),
        heading: title,
        items: buildFeatureItems(shot),
      };
    case 'number-strip': {
      const numericCount = toNumber(extractNumberTokens(title)[0], 0);
      return {
        count: String(Math.max(2, points.length || numericCount || 2)),
        heading: title,
        items: points.length > 0
          ? points.map((item, itemIndex) => ({
              label: compactText(item, 18),
              accent: inferAccent(shot, itemIndex),
            }))
          : [
              {label: compactText(shot?.visualFocusZh || '对比重点', 16), accent},
              {label: compactText(shot?.comparisonSummaryZh || shot?.narration, 18), accent: inferAccent(shot, index + 1)},
        ],
        accent,
      };
    }
    case 'step-flow':
      return {
        heading: title,
        steps: buildStepItems(shot),
      };
    case 'terminal':
      return {
        heading: title,
        windowTitle: compactText(shot?.id || `scene-${index + 1}`, 24),
        command: compactText(shot?.promptZh || `render --topic "${title}"`, 48),
        outputs: buildTerminalOutputs(shot),
        note: subtitle,
        accent,
      };
    case 'tag-matrix':
      return {
        heading: title,
        tabs: ['script', 'visual', 'motion', 'result'],
        activeTab: /结果|output|metric|总结/.test(textFromShot(shot)) ? 'result' : 'visual',
        items: buildTagItems(shot),
      };
    case 'code':
      return {
        heading: title,
        filename: `${safeString(shot?.id) || `scene-${index + 1}`}.json`,
        lines: buildCodeLines(shot),
        highlightLine: 2,
        footer: subtitle,
        accent,
      };
    case 'metrics':
      return {
        heading: title,
        items: metricItems.length > 0
          ? metricItems
          : [
              {
                label: compactText(keywords[0] || 'summary', 16),
                value: compactText(points[0] || shot?.visualFocusZh || shot?.title, 18),
                ratio: 0.82,
                accent,
              },
            ],
      };
    case 'cta':
      return {
        heading: title,
        subtitle: compactText(shot?.narration || shot?.visualSummaryZh, 88),
        searchLabel: compactText(shot?.visualFocusZh || '输入下一条搜索主题', 36),
        badge: keywords.join(' / ') || compactText(shot?.type || 'cta / close', 28),
      };
    default:
      return {
        eyebrow: compactText(shot?.level || shot?.type || 'focus explainer', 28),
        keyword: compactText(shot?.visualFocusZh || title, 18),
        question: title,
        description: compactText(shot?.narration || shot?.visualSummaryZh, 88),
        accent,
        diagram: 'framing',
      };
  }
};

function textFromShot(shot) {
  return `${safeString(shot?.title)} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();
}

function isUltimateProject(project) {
  const explicitTemplate = safeString(project?.template || project?.renderTemplate).toLowerCase();
  const visualSystem = safeString(project?.visualSystem).toLowerCase();
  const width = toNumber(project?.render?.width ?? project?.renderWidth, 0);
  const height = toNumber(project?.render?.height ?? project?.renderHeight, 0);

  if (explicitTemplate) {
    return explicitTemplate === ULTIMATE_TEMPLATE;
  }

  if (ULTIMATE_VISUAL_SYSTEMS.has(visualSystem)) {
    return true;
  }

  return width >= height && width >= 1600;
}

function buildUltimateProjectConfig(project) {
  const fps = Math.max(1, Math.round(toNumber(project?.render?.fps ?? project?.renderFps, ULTIMATE_DEFAULT_FPS)));
  const width = Math.max(320, Math.round(toNumber(project?.render?.width ?? project?.renderWidth, ULTIMATE_DEFAULT_WIDTH)));
  const height = Math.max(320, Math.round(toNumber(project?.render?.height ?? project?.renderHeight, ULTIMATE_DEFAULT_HEIGHT)));
  const shots = asArray(project?.shots);
  const overlay = buildOverlay(project, width, height);
  const title = safeString(project?.title) || safeString(project?.projectId) || 'Ultimate Project';

  return {
    title,
    defaultPlatformOverlay: overlay,
    defaultTransition: {
      preset: width >= height ? 'lift' : 'fade',
      durationInFrames: 12,
    },
    scenes: shots.map((shot, index) => {
      const family = inferSceneFamily(shot, index, shots.length);
      const accent = inferAccent(shot, index);

      return {
        id: safeString(shot?.id) || `shot-${String(index + 1).padStart(2, '0')}`,
        family,
        subtitle: compactText(shot?.visualSummaryZh || shot?.narration || shot?.visualFocusZh, 72),
        durationInFrames: normalizeDurationInFrames(shot, fps),
        warm: /warm|里程碑|升级|结论|发布|收束/.test(`${safeString(shot?.style)} ${safeString(shot?.mood)} ${safeString(shot?.title)}`.toLowerCase()),
        showGrid: false,
        transition: index === 0 ? {preset: 'flash', durationInFrames: 14} : undefined,
        data: buildSceneData(family, shot, index, accent),
      };
    }),
  };
}

function buildUltimateRenderProps(project) {
  const fps = Math.max(1, Math.round(toNumber(project?.render?.fps ?? project?.renderFps, ULTIMATE_DEFAULT_FPS)));
  const width = Math.max(320, Math.round(toNumber(project?.render?.width ?? project?.renderWidth, ULTIMATE_DEFAULT_WIDTH)));
  const height = Math.max(320, Math.round(toNumber(project?.render?.height ?? project?.renderHeight, ULTIMATE_DEFAULT_HEIGHT)));

  return {
    compositionId: 'UltimateSceneTemplate',
    renderTemplate: ULTIMATE_TEMPLATE,
    template: ULTIMATE_TEMPLATE,
    projectId: safeString(project?.projectId) || 'ultimate-project',
    visualSystem: safeString(project?.visualSystem) || 'ultimate-1080p',
    renderFps: fps,
    renderWidth: width,
    renderHeight: height,
    voiceFile: safeString(project?.voiceFile) || null,
    audioSegments: Array.isArray(project?.audioSegments) ? project.audioSegments : null,
    config: buildUltimateProjectConfig({
      ...project,
      render: {
        ...(project?.render && typeof project.render === 'object' ? project.render : {}),
        fps,
        width,
        height,
      },
    }),
  };
}

module.exports = {
  ULTIMATE_TEMPLATE,
  ULTIMATE_VISUAL_SYSTEMS: Array.from(ULTIMATE_VISUAL_SYSTEMS),
  ULTIMATE_DEFAULT_FPS,
  ULTIMATE_DEFAULT_WIDTH,
  ULTIMATE_DEFAULT_HEIGHT,
  isUltimateProject,
  buildUltimateProjectConfig,
  buildUltimateRenderProps,
};

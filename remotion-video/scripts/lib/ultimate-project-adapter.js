const ULTIMATE_TEMPLATE = 'ultimate';
const ULTIMATE_VISUAL_SYSTEMS = new Set(['ultimate', 'ultimate-1080p', 'ultimate-kit', 'ultimate-scene']);
const ULTIMATE_DEFAULT_FPS = 30;
const ULTIMATE_DEFAULT_WIDTH = 1920;
const ULTIMATE_DEFAULT_HEIGHT = 1080;
const ACCENT_ROTATION = ['cyan', 'green', 'yellow', 'orange', 'purple', 'red'];
const SCENE_MEDIA_FAMILIES = new Set(['hero', 'focus', 'feature-rail', 'metrics', 'cta']);
const PLACEHOLDER_TEXT_RE = /^(?:数据点|关键词|补充|标签|summary|scene|item|slot|point)\s*[0-9a-zA-Z一二三四五六七八九十]*$/i;

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

const compactSimilarityKey = (value) => {
  return safeString(value)
    .replace(/[“”"'‘’（）()【】[\]，,、。！？!?\s…:：;；/\\|+-]+/g, '')
    .toLowerCase();
};

const isCompactDuplicate = (left, right) => {
  const leftKey = compactSimilarityKey(left);
  const rightKey = compactSimilarityKey(right);

  if (!leftKey || !rightKey) {
    return false;
  }

  if (leftKey === rightKey) {
    return true;
  }

  const minLength = Math.min(leftKey.length, rightKey.length);
  return minLength >= 6 && (leftKey.includes(rightKey) || rightKey.includes(leftKey));
};

const compactUniqueItems = (items, maxChars, max = Infinity) => {
  const output = [];

  for (const item of items) {
    const candidate = compactText(item, maxChars);
    if (!candidate) {
      continue;
    }

    if (output.some((entry) => isCompactDuplicate(entry, candidate))) {
      continue;
    }

    output.push(candidate);
    if (output.length >= max) {
      break;
    }
  }

  return output;
};

const asArray = (value) => {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
};

const isPlaceholderText = (value) => {
  const text = safeString(value);

  if (!text) {
    return true;
  }

  if (PLACEHOLDER_TEXT_RE.test(text)) {
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

const semanticArray = (value, max = Infinity) => {
  return uniqueList(
    asArray(value)
      .map((item) => safeString(item))
      .filter((item) => !isPlaceholderText(item)),
    max,
  );
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

const splitNarrationUnits = (value) => {
  const parts = splitTextUnits(value);
  const output = [];

  for (let index = 0; index < parts.length; index += 1) {
    const current = parts[index];
    const next = parts[index + 1];

    if (
      next
      && /^\d+(?:\.\d+)?月\d+日$/.test(current)
      && !/^(?:20\d{2}[年./-]|\d+(?:\.\d+)?月\d+日|\d{1,2}[:：]\d{1,2})/.test(next)
    ) {
      output.push(`${current} ${next}`.trim());
      index += 1;
      continue;
    }

    output.push(current);
  }

  return uniqueList(output, 12);
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
    safeString(value).match(
      /(?:20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d+月\d+日|\d+(?:\.\d+)?\+?\s*(?:小时|分钟|秒|人|个|天|次|项|行|版|Agent|子Agent)|\d+(?:\.\d+)?\+?%?)/g,
    ) || [],
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
  const narrationUnits = splitNarrationUnits(shot?.narration);
  return uniqueList(
    [
      ...semanticArray(shot?.dataPoints),
      ...asArray(shot?.keywords),
      ...narrationUnits,
    ],
    max,
  );
};

const buildFeatureItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const baseItems = uniqueList(
    [
      ...semanticArray(shot?.dataPoints),
      ...narrationUnits,
    ],
    4,
  );

  return baseItems.map((item, index) => ({
      title: compactText(item, 18),
      eyebrow: '',
      caption: compactText(
        narrationUnits[index + 1]
          || semanticArray(shot?.dataPoints)[index + 1]
          || '',
        34,
      ),
    icon: compactText(item, 1) || String(index + 1),
    accent: inferAccent(shot, index),
  }));
};

const buildStepItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const steps = uniqueList(
    [...semanticArray(shot?.dataPoints), ...narrationUnits],
    5,
  );

  return steps.map((item, index) => ({
    label: compactText(item, 18),
    detail: compactText(narrationUnits[index + 1] || '', 38),
    icon: String(index + 1),
    accent: inferAccent(shot, index),
  }));
};

const buildTagItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  return uniqueList(
    [...semanticArray(shot?.dataPoints), ...narrationUnits],
    10,
  ).map((item, index) => ({
    label: compactText(item, 18),
    accent: inferAccent(shot, index),
  }));
};

const inferMetricLabel = (source, number, fallbackTitle, index) => {
  const text = safeString(source);
  const metricValue = safeString(number);

  if (/小时|分钟|秒/.test(metricValue)) {
    return '连续编码';
  }

  if (/Agent/i.test(text) && (/个/.test(metricValue) || /agent/i.test(metricValue))) {
    return '并行调度';
  }

  if (/行/.test(metricValue)) {
    return '改码规模';
  }

  if (/月\d+日|20\d{2}[./-]\d{1,2}[./-]\d{1,2}/.test(text)) {
    return '发布时间';
  }

  if (/kimi|gpt|claude|gemini/i.test(text) && /\d/.test(text)) {
    return index === 0 ? '版本节点' : '模型版本';
  }

  if (/连续编码|编码\d+小时|小时/.test(text)) {
    return '连续编码';
  }

  if (/行代码|改代码|修改/.test(text)) {
    return '改码规模';
  }

  if (/agent/i.test(text)) {
    return '并行调度';
  }

  if (/基准|bench|exam|测试/.test(text)) {
    return '基准表现';
  }

  if (/天|周期|模块/.test(text)) {
    return '开发周期';
  }

  if (/人力|团队|个人/.test(text)) {
    return '人力投入';
  }

  const stripped = compactText(
    text
      .replace(/\d+(?:\.\d+)?\+?\s*(?:小时|分钟|秒|人|个|天|次|项|行|版|Agent|子Agent|%|月\d+日)?/g, ' ')
      .replace(/[，,、。；;:：]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    16,
  );

  return stripped || compactText(fallbackTitle || `指标 ${index + 1}`, 16);
};

const metricPriority = (label) => {
  switch (safeString(label)) {
    case '发布时间':
    case '连续编码':
      return 5;
    case '改码规模':
    case '并行调度':
    case '基准表现':
      return 4;
    case '开发周期':
    case '人力投入':
      return 3;
    case '模型版本':
    case '版本节点':
      return 2;
    default:
      return 1;
  }
};

const buildMetricItems = (shot) => {
  const sourceItems = uniqueList(
    [
      ...semanticArray(shot?.dataPoints),
      ...splitNarrationUnits(shot?.narration || shot?.visualSummaryZh),
    ],
    8,
  );
  const pairs = [];
  const seen = new Set();

  for (const source of sourceItems) {
    const numbers = extractNumberTokens(source);

    for (const number of numbers) {
      const label = inferMetricLabel(source, number, shot?.title, pairs.length);
      const key = `${label}::${number}`.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      pairs.push({
        label: compactText(label, 16),
        value: compactText(number, 18),
        priority: metricPriority(label),
      });

    }

    if (pairs.length >= 8) {
      break;
    }
  }

  return pairs
    .sort((left, right) => right.priority - left.priority)
    .filter((item, index, array) => array.findIndex((entry) => entry.label === item.label) === index)
    .slice(0, 4)
    .map((item, index) => ({
      label: item.label,
      value: item.value,
      ratio: Number(clamp(0.92 - index * 0.13, 0.4, 0.95).toFixed(2)),
      accent: inferAccent(shot, index),
    }));
};

const buildCodeLines = (shot) => {
  const narrativeUnits = splitNarrationUnits(shot?.narration || shot?.visualSummaryZh);
  const factSources = uniqueList(
    [
      ...narrativeUnits,
      ...semanticArray(shot?.dataPoints),
    ].filter(Boolean),
    10,
  );
  const factLabels = new Set();
  const facts = [];
  const pushFact = (label, value) => {
    const normalizedLabel = compactText(label, 10);
    const normalizedValue = compactText(value, 28);

    if (!normalizedLabel || !normalizedValue) {
      return;
    }

    if (factLabels.has(normalizedLabel)) {
      return;
    }

    if (facts.some((item) => isCompactDuplicate(item.value, normalizedValue))) {
      return;
    }

    factLabels.add(normalizedLabel);
    facts.push({label: normalizedLabel, value: normalizedValue});
  };

  for (const source of factSources) {
    if (/开发者|团队|你是个|你带团队|案例|场景/.test(source)) {
      pushFact('场景', source);
      continue;
    }

    if (/平时|原来|之前|要\d+(?:\.\d+)?(?:天|小时|分钟)|\d+(?:\.\d+)?(?:天|小时|分钟).*(?:要|需要)/.test(source)) {
      pushFact('原流程', source);
      continue;
    }

    if (/(?:节省|省下)\d+(?:\.\d+)?(?:人|个人力|天|小时)|\d+(?:\.\d+)?(?:天|小时).*(?:搞定|完成|盯完)|(?:搞定|完成|盯完).*\d+(?:\.\d+)?(?:天|小时)/i.test(source)) {
      pushFact('提效结果', source);
      continue;
    }

    if (/K2\.?6.*(?:辅助|自动生成|执行)/i.test(source)) {
      pushFact('工具介入', source);
      continue;
    }

    if (/Agent|并行|测试|部署/i.test(source)) {
      pushFact('并行处理', source);
      continue;
    }

    if (/真实问题|最看重|不是参数|解决什么问题/.test(source)) {
      pushFact('判断', source);
      continue;
    }
  }

  if (facts.length === 0) {
    compactUniqueItems(factSources, 28, 4).forEach((item, index) => {
      pushFact(index === 0 ? '场景' : `要点${index}`, item);
    });
  }

  const factPriority = ['场景', '原流程', '提效结果', '并行处理', '工具介入', '判断'];
  const visibleFacts = facts
    .slice()
    .sort((left, right) => factPriority.indexOf(left.label) - factPriority.indexOf(right.label))
    .slice(0, 4);

  return [
    {text: '{', tone: 'base'},
    ...visibleFacts.map((fact, index) => ({
      text: `  "${fact.label}": "${fact.value}"${index === visibleFacts.length - 1 ? '' : ','}`,
      tone: index === 0 ? 'accent' : index === visibleFacts.length - 1 ? 'muted' : 'base',
    })),
    {text: '}', tone: 'base'},
  ];
};

const buildTerminalOutputs = (shot) => {
  const items = uniqueList(
    [
      ...splitNarrationUnits(shot?.narration),
      ...semanticArray(shot?.dataPoints),
    ],
    4,
  );

  const fallbackItems = items.length > 0
    ? items
    : splitNarrationUnits(shot?.narration || shot?.visualSummaryZh || shot?.title || 'scene ready');

  return fallbackItems.map((item) => `> ${compactText(item, 48)}`);
};

const sceneCycle = ['focus', 'feature-rail', 'tag-matrix', 'metrics', 'feature-rail', 'focus'];
const hasStandaloneAsciiToken = (text, token) => new RegExp(`(?:^|[^a-z])${token}(?:[^a-z]|$)`).test(text);

const inferSceneFamily = (shot, index, total) => {
  const title = safeString(shot?.title);
  const text = `${title} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();

  if (index === 0) {
    return 'hero';
  }

  if (index === total - 1) {
    return 'cta';
  }

  if (
    /(命令|终端|日志|运行)/.test(text)
    || ['shell', 'bash', 'terminal', 'cli', 'render'].some((token) => hasStandaloneAsciiToken(text, token))
  ) {
    return 'terminal';
  }

  if ((Array.isArray(shot?.comparisons) && shot.comparisons.length > 0) || /(对比|差异|vs|不是.*而是)/.test(text)) {
    return 'number-strip';
  }

  if (
    /(配置|脚本|函数|接口|参数)/.test(text)
    || ['schema', 'json', 'api', 'code'].some((token) => hasStandaloneAsciiToken(text, token))
  ) {
    return 'code';
  }

  if (/(步骤|流程|工作流|依次|第一|第二|第三|先|再|最后|pipeline|process)/.test(text) && buildStepItems(shot).length >= 3) {
    return 'step-flow';
  }

  if (/(场景|开发者|团队|问题|痛点|案例|想象一下)/.test(text) && buildFeatureItems(shot).length >= 3) {
    return 'feature-rail';
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
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const primaryText = narrationUnits[0] || shot?.narration || shot?.title || shot?.level || shot?.type || `Scene ${index + 1}`;
  const secondaryText = narrationUnits.slice(1).join('，') || shot?.narration || shot?.visualSummaryZh || '';
  const title = compactText(primaryText, 28);
  const subtitle = compactText(shot?.narration || shot?.visualSummaryZh, 72);
  const keywords = uniqueList(
    [
      ...semanticArray(shot?.dataPoints),
      ...narrationUnits,
    ],
    3,
  );
  const points = uniqueList(
    [
      ...semanticArray(shot?.dataPoints),
      ...narrationUnits.slice(1),
    ],
    4,
  );
  const metricItems = buildMetricItems(shot);

  switch (family) {
    case 'hero':
      return {
        kicker: '',
        title,
        subtitle: compactText(secondaryText, 94),
        badge: '',
        accent,
        avatarLabel: '',
      };
    case 'focus':
      return {
        eyebrow: '',
        keyword: compactText(primaryText, 18),
        question: compactText(narrationUnits[1] || primaryText, 28),
        description: compactText(secondaryText, 88),
        accent,
        diagram: /对比|parallel|系统|loop|闭环/.test(`${shot?.narration || ''} ${shot?.title || ''}`.toLowerCase()) ? 'rings' : 'framing',
      };
    case 'feature-rail':
      return {
        kicker: '',
        heading: title,
        items: buildFeatureItems(shot),
      };
    case 'number-strip': {
      const displayPoints = compactUniqueItems(
        [
          ...semanticArray(shot?.dataPoints),
          ...narrationUnits.slice(1),
        ],
        18,
        4,
      );
      const numericCount = toNumber(extractNumberTokens(title)[0], 0);
      return {
        count: String(Math.max(2, displayPoints.length || points.length || numericCount || 2)),
        heading: title,
        items: displayPoints.length > 0
          ? displayPoints.map((item, itemIndex) => ({
              label: item,
              accent: inferAccent(shot, itemIndex),
            }))
          : [
              {label: compactText(primaryText, 16), accent},
              {label: compactText(secondaryText, 18), accent: inferAccent(shot, index + 1)},
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
        windowTitle: '',
        command: compactText(primaryText, 48),
        outputs: buildTerminalOutputs(shot),
        note: compactText(secondaryText, 72),
        accent,
      };
    case 'tag-matrix':
      return {
        heading: title,
        tabs: [],
        activeTab: '',
        items: buildTagItems(shot),
      };
    case 'code':
      return {
        heading: title,
        filename: '',
        lines: buildCodeLines(shot),
        highlightLine: 2,
        footer: compactText(secondaryText, 72),
        accent,
      };
    case 'metrics':
      return {
        heading: title,
        items: metricItems.length > 0
          ? metricItems
          : [
              {
                label: compactText(keywords[0] || primaryText, 16),
                value: compactText(points[0] || secondaryText || primaryText, 18),
                ratio: 0.82,
                accent,
              },
            ],
      };
    case 'cta':
      return {
        heading: title,
        subtitle: compactText(secondaryText, 88),
        searchLabel: compactText(narrationUnits.find((item) => /[？?]/.test(item)) || '', 36),
        badge: '',
      };
    default:
      return {
        eyebrow: '',
        keyword: compactText(primaryText, 18),
        question: title,
        description: compactText(secondaryText, 88),
        accent,
        diagram: 'framing',
      };
  }
};

function textFromShot(shot) {
  return `${safeString(shot?.title)} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();
}

function resolveSceneMediaSrc(family, shot) {
  const mediaSrc = safeString(shot?.imageUrl);
  if (!mediaSrc) {
    return null;
  }

  return SCENE_MEDIA_FAMILIES.has(family) ? mediaSrc : null;
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
        mediaSrc: resolveSceneMediaSrc(family, shot),
        subtitle: compactText(shot?.narration || shot?.visualSummaryZh || shot?.visualFocusZh, 72),
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

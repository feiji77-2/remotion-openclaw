const ULTIMATE_TEMPLATE = 'ultimate';
const ULTIMATE_VISUAL_SYSTEMS = new Set(['ultimate', 'ultimate-1080p', 'ultimate-kit', 'ultimate-scene']);
const ULTIMATE_DEFAULT_FPS = 30;
const ULTIMATE_DEFAULT_WIDTH = 1920;
const ULTIMATE_DEFAULT_HEIGHT = 1080;
const ULTIMATE_SCENE_FAMILIES = new Set([
  'hero',
  'feature-rail',
  'focus',
  'number-strip',
  'step-flow',
  'timeline',
  'compare-board',
  'terminal',
  'evidence-wall',
  'architecture-map',
  'tag-matrix',
  'code',
  'metrics',
  'data-stream',
  'memory-graph',
  'pipeline-flow',
  'benchmark-chart',
  'quote-highlight',
  'glossary-term',
  'cta',
]);
const ACCENT_ROTATION = ['cyan', 'green', 'yellow', 'orange', 'purple', 'red'];
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

const getDisplayTitle = (shot, fallback = '') => {
  return safeString(shot?.displayTitle || shot?.title || fallback);
};

const getDisplaySummary = (shot, fallback = '') => {
  return safeString(shot?.displaySummary || shot?.narration || fallback);
};

const getDisplayPoints = (shot, max = Infinity) => {
  const preferred = semanticArray(shot?.displayPoints, max);
  if (preferred.length > 0) {
    return preferred;
  }

  return semanticArray(shot?.dataPoints, max);
};

const buildHeroHighlightWord = (shot, primaryText) => {
  const keywordModel = extractTargetModel(`${safeString(shot?.narration)} ${getDisplayTitle(shot)}`);
  if (keywordModel) {
    return keywordModel.toLowerCase();
  }

  const asciiPhrase = extractAsciiPhrases(`${safeString(shot?.narration)} ${getDisplayTitle(shot)}`)
    .find((item) => item.length >= 4);
  if (asciiPhrase) {
    return asciiPhrase.toLowerCase();
  }

  const titleTokens = splitTitleTokens(primaryText);
  const longToken = titleTokens.find((item) => item.length >= 4);
  return safeString(longToken || titleTokens[0] || '');
};

const buildFeatureRailHeading = (shot, fallbackTitle) => {
  const summary = getDisplaySummary(shot, shot?.narration);

  if (/不是在回答问题/u.test(summary) && /做完/u.test(summary)) {
    return '它不是回答问题，它是在替你做完';
  }

  if (/输入含糊/u.test(summary) && /输出/u.test(summary)) {
    return '输入很糊，输出直接可跑';
  }

  if (/完整(?:的)?可执行方案/u.test(summary)) {
    return '它直接给出完整可执行方案';
  }

  return compactText(buildSceneSummary(shot, getDisplayTitle(shot), 28) || fallbackTitle, 28);
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

const splitListPhrases = (value) => {
  return uniqueList(
    safeString(value)
      .split(/[、/｜|]/u)
      .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
      .filter(Boolean),
    8,
  );
};

const extractModelTokens = (value) => {
  return uniqueList(
    (
      safeString(value).match(
        /\b(?:Kimi|GPT|Claude|Gemini|Qwen|DeepSeek|Llama|Mistral|OpenAI|Anthropic)\s*[A-Za-z0-9.+-]*/gi,
      ) || []
    )
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
    6,
  );
};

const extractAsciiPhrases = (value) => {
  return uniqueList(
    (safeString(value).match(/\b[A-Za-z][A-Za-z0-9.+\-']*(?:\s+[A-Za-z][A-Za-z0-9.+\-']*){0,2}\b/g) || [])
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
    8,
  );
};

const normalizeEvidenceChip = (value) => {
  const text = safeString(value);

  if (!text) {
    return '';
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    return '';
  }

  if (/Humanity'?s Last Exam/i.test(text)) {
    return 'HLE';
  }

  if (/SWE[- ]Bench Pro/i.test(text)) {
    return 'SWE-Bench Pro';
  }

  if (/GPT-\d+(?:\.\d+)?/i.test(text)) {
    return (text.match(/GPT-\d+(?:\.\d+)?/i) || [''])[0].toUpperCase();
  }

  if (/K2\.?6/i.test(text)) {
    return 'K2.6';
  }

  return compactText(text, 18);
};

const extractEvidenceChips = (value, max = 3) => {
  return uniqueList(
    [
      ...extractAsciiPhrases(value),
      ...extractNumberTokens(value),
      ...splitListPhrases(value),
    ]
      .map((item) => normalizeEvidenceChip(item))
      .filter(Boolean)
      .filter((item) => item.length <= 18)
      .filter((item) => /[A-Za-z0-9]/.test(item) || item.length <= 12)
      .filter((item) => !/^(?:实际上|很多人以为|开源模型第一次|不是喊口号|不是吹参数)$/u.test(item)),
    max,
  );
};

const extractTargetModel = (value) => {
  const match = safeString(value).match(/\bGPT(?:-\d+(?:\.\d+)*)?\b/i);
  return match ? match[0].toUpperCase() : '';
};

const buildStripItemLabel = (value) => {
  const text = safeString(value);
  const targetModel = extractTargetModel(text);

  if (!text) {
    return '';
  }

  if (/很多人以为.+不如/i.test(text)) {
    const match = text.match(/很多人以为(.+?不如\s*GPT(?:-\d+(?:\.\d+)*)?)/i);
    const normalized = safeString(match?.[1] || text.replace(/^很多人以为/u, ''));
    return compactText(`${normalized.replace(/\s+/g, ' ')}？`, 18);
  }

  if (/连续编码|4000|300|Agent|并行|不断裂/.test(text) && extractEvidenceChips(text, 4).length >= 2) {
    return '三类高频问题一起解决';
  }

  if (/(持平|优于)/.test(text) && targetModel) {
    return compactText(`基准实测已到 ${targetModel} 同一档`, 20);
  }

  if (/同一档|第一次/.test(text) && /开源模型|闭源/.test(text)) {
    return '开源第一次站上同一档';
  }

  if (/1个人.*3个人/.test(text)) {
    return '1个人能顶以前3个人';
  }

  if (/质量.*稳/.test(text)) {
    return '质量还更稳';
  }

  if (/不是.*口号|跑分/.test(text)) {
    return '不是喊口号，是跑分跑出来的';
  }

  if (/不是.*参数|解决.*问题/.test(text)) {
    return '不是吹参数，是解决问题';
  }

  return compactText(text, 20);
};

const buildStripHeading = (value, fallback = '') => {
  const text = safeString(value);

  if (!text) {
    return compactText(fallback, 20);
  }

  if (/开发者平时最烦什么/.test(text)) {
    return '开发者平时最烦什么';
  }

  if (/很多人以为.+不如/i.test(text)) {
    return '国产代码模型不如 GPT？';
  }

  return compactText(buildStripItemLabel(text) || fallback || text, 20);
};

const buildCodeHeading = (shot, primaryText, fallbackTitle = '') => {
  const text = safeString(primaryText);
  const fullText = textFromShot(shot);

  if (/(benchmark|bench|exam|基准|跑分|gpt-\d)/.test(fullText)) {
    return 'Benchmark Snapshot';
  }

  if (/(开发者|团队|案例|想象一下|workflow|agent|部署|测试)/.test(fullText)) {
    return 'Workflow After K2.6';
  }

  if (/(json|schema|config|配置|脚本|接口)/.test(fullText)) {
    return 'Config Snapshot';
  }

  return compactText(text || fallbackTitle || 'Execution Snapshot', 20);
};

const buildCodeFilename = (shot) => {
  const fullText = textFromShot(shot);

  if (/(benchmark|bench|exam|基准|跑分|gpt-\d)/.test(fullText)) {
    return 'benchmark-facts.json';
  }

  if (/(开发者|团队|案例|想象一下|workflow|agent|部署|测试)/.test(fullText)) {
    return 'workflow-facts.json';
  }

  if (/(json|schema|config|配置|脚本|接口)/.test(fullText)) {
    return 'config-facts.json';
  }

  return 'scene-facts.json';
};

const buildStripItemDetail = (value) => {
  const text = safeString(value);

  if (!text) {
    return '';
  }

  if (/连续编码|4000|300|Agent|并行|不断裂/.test(text) && extractEvidenceChips(text, 4).length >= 2) {
    return '长任务、改大段代码、多 Agent 协作都更稳';
  }

  if (/(持平|优于)/.test(text) && /(bench|exam|基准)/i.test(text)) {
    return 'SWE-Bench Pro、HLE 等基准测试';
  }

  if (/同一档|第一次/.test(text) && /开源模型|闭源/.test(text)) {
    return '第一次贴到闭源顶级代码模型旁边';
  }

  if (/1个人.*3个人/.test(text)) {
    return '交付更快，质量也更稳';
  }

  if (/不是.*口号|跑分/.test(text)) {
    return '不是喊话，是公开基准跑出来的';
  }

  if (/不是.*参数|解决.*问题/.test(text)) {
    return '重点是能不能真把问题解决掉';
  }

  return '';
};

const buildStripItemLayout = (value, itemIndex) => {
  const text = safeString(value);

  if (
    itemIndex === 1
    && (text.length >= 18 || extractEvidenceChips(text, 4).length >= 2 || /(持平|优于|4000|300|Agent|并行|同一档)/.test(text))
  ) {
    return 'wide';
  }

  return 'regular';
};

const SUPPORT_MARKER_RE = /^(?:不是|而是|所以|因此|评论|下期)|第一次|全行业|解决|跑分|更稳|同一档|开源发布|最看重哪个|值不值/u;

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
      ...getDisplayPoints(shot),
      ...asArray(shot?.keywords),
      ...narrationUnits,
    ],
    max,
  );
};

const inferManualGlyph = (value) => {
  const text = safeString(value);
  return /^(?:[A-Za-z0-9#+*?]{1,3})$/.test(text) ? text : '';
};

const buildFeatureItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const narrationLead = safeString(narrationUnits[0] || shot?.narration);
  const displayPoints = getDisplayPoints(shot);
  const sourceItems = uniqueList(
    [
      ...displayPoints,
      ...narrationUnits,
    ],
    8,
  );

  const items = [];

  for (const item of sourceItems) {
    const text = safeString(item);
    if (!text) {
      continue;
    }

    if (
      isCompactDuplicate(text, getDisplayTitle(shot))
      || isCompactDuplicate(text, shot?.narration)
      || isCompactDuplicate(text, narrationLead)
    ) {
      continue;
    }

    const chips = extractEvidenceChips(text, 2);
    const label =
      compactText(
        chips[0]
          || splitTitleTokens(text).find((token) => token.length >= 2)
          || extractModelTokens(text)[0]
          || extractAsciiPhrases(text)[0]
          || text,
        16,
      );

    const caption = compactText(
      isCompactDuplicate(text, label) || isCompactDuplicate(text, narrationLead)
        ? ''
        : text,
      28,
    );

    if (!label) {
      continue;
    }

    if (items.some((entry) => isCompactDuplicate(entry.title, label) || (caption && isCompactDuplicate(entry.caption, caption)))) {
      continue;
    }

    items.push({
      title: label,
      eyebrow: chips[1] || '',
      caption,
      icon: inferManualGlyph(text) || undefined,
      accent: inferAccent(shot, items.length),
    });

    if (items.length >= 4) {
      break;
    }
  }

  if (items.length > 0) {
    return items;
  }

  return displayPoints.slice(0, 4).map((item, index) => ({
    title: compactText(item, 16),
    eyebrow: '',
    caption: '',
    icon: inferManualGlyph(item) || undefined,
    accent: inferAccent(shot, index),
  }));
};

const buildStepItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const steps = uniqueList(
    [...getDisplayPoints(shot), ...narrationUnits],
    5,
  );

  return steps.map((item, index) => ({
    label: compactText(item, 18),
    detail: compactText(narrationUnits[index + 1] || '', 38),
    icon: String(index + 1),
    accent: inferAccent(shot, index),
  }));
};

const buildTimelineLabel = (value, index) => {
  const text = safeString(value);
  const dateToken = extractNumberTokens(text).find((token) => /20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d+月\d+日/.test(token));

  if (dateToken) {
    return compactText(dateToken, 14);
  }

  const model = extractModelTokens(text)[0];
  if (model) {
    return compactText(model, 14);
  }

  if (/开源/.test(text)) {
    return '开源';
  }

  if (/发布/.test(text)) {
    return '发布';
  }

  if (/升级|更新/.test(text)) {
    return '升级';
  }

  return `节点 ${index + 1}`;
};

const buildTimelineItems = (shot) => {
  const narrationUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const sourceItems = uniqueList(
    [...getDisplayPoints(shot), ...narrationUnits],
    8,
  );
  const items = [];

  for (const source of sourceItems) {
    const title = compactText(source, 24);
    if (!title || items.some((item) => isCompactDuplicate(item.title, title))) {
      continue;
    }

    items.push({
      label: buildTimelineLabel(source, items.length),
      title,
      detail: compactText(buildSceneSummary(shot, source, 40), 40),
      icon: '',
      accent: inferAccent(shot, items.length),
    });

    if (items.length >= 4) {
      break;
    }
  }

  return items;
};

const inferCompareSideTitles = (shot) => {
  const text = textFromShot(shot);
  const models = extractModelTokens(text);

  if (models.length >= 2) {
    return {
      leftTitle: compactText(models[0], 16),
      rightTitle: compactText(models[1], 16),
    };
  }

  if (/旧|之前|传统|原来|过去|误解/.test(text)) {
    return {
      leftTitle: '旧方案',
      rightTitle: /事实|现在|当前|k2\.?6|新/.test(text) ? '当前方案' : '新方案',
    };
  }

  if (/认知|以为|偏见/.test(text)) {
    return {
      leftTitle: '旧认知',
      rightTitle: '当前事实',
    };
  }

  return {
    leftTitle: '对照 A',
    rightTitle: '对照 B',
  };
};

const buildCompareRows = (shot) => {
  const labels = uniqueList(
    [...semanticArray(shot?.dataPoints), ...splitNarrationUnits(shot?.narration)],
    6,
  );
  const comparisons = asArray(shot?.comparisons);

  return comparisons
    .map((item, index) => ({
      label: compactText(
        safeString(item?.label || item?.title || labels[index] || `维度 ${index + 1}`),
        16,
      ),
      left: compactText(safeString(item?.left || item?.before || item?.old || item?.a), 20),
      right: compactText(safeString(item?.right || item?.after || item?.new || item?.b), 20),
      accent: inferAccent(shot, index),
    }))
    .filter((row) => row.left && row.right)
    .slice(0, 4);
};

const buildTagItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  return uniqueList(
    [...getDisplayPoints(shot), ...narrationUnits],
    10,
  ).map((item, index) => ({
    label: compactText(item, 18),
    accent: inferAccent(shot, index),
  }));
};

const buildEvidenceCards = (shot) => {
  const narrationUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const sourceItems = uniqueList(
    [...getDisplayPoints(shot), ...narrationUnits],
    8,
  );
  const cards = [];

  for (const source of sourceItems) {
    const quote = compactText(source, 48);
    if (!quote || cards.some((card) => isCompactDuplicate(card.quote, quote))) {
      continue;
    }

    const chips = extractEvidenceChips(source, 3);
    const sourceLabel =
      compactText(
        chips[0]
          || extractAsciiPhrases(source)[0]
          || (/官方|release|blog|docs|paper/i.test(source) ? 'Official' : `证据 ${cards.length + 1}`),
        16,
      ) || `证据 ${cards.length + 1}`;

    cards.push({
      source: sourceLabel,
      quote,
      detail: compactText(buildSceneSummary(shot, source, 40), 40),
      chips,
      icon: '',
      accent: inferAccent(shot, cards.length),
    });

    if (cards.length >= 4) {
      break;
    }
  }

  return cards;
};

const buildArchitectureNodes = (shot) => {
  const narrationUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const nodes = uniqueList(
    [...getDisplayPoints(shot), ...narrationUnits],
    8,
  );

  return nodes
    .filter((item) => !isCompactDuplicate(item, getDisplayTitle(shot)))
    .slice(0, 6)
    .map((item, index) => ({
      label: compactText(item, 18),
      detail: compactText(narrationUnits[index + 1] || '', 30),
      icon: '',
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
      ...getDisplayPoints(shot),
      ...splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh)),
    ],
    8,
  );
  const pairs = [];
  const seen = new Set();

  for (const source of sourceItems) {
    const numbers = extractNumberTokens(source);

    for (const number of numbers) {
      const label = inferMetricLabel(source, number, getDisplayTitle(shot), pairs.length);
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

const inferRatioFromText = (value, fallback = 0.72) => {
  const token = extractNumberTokens(value)[0] || safeString(value);

  if (!token) {
    return fallback;
  }

  if (/%/.test(token)) {
    return Number(clamp(toNumber(token.replace(/[^0-9.]/g, ''), fallback * 100) / 100, 0.12, 0.98).toFixed(2));
  }

  const numericValue = toNumber(token.replace(/[^0-9.]/g, ''), NaN);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue >= 100) {
    return Number(clamp(numericValue / 140, 0.18, 0.98).toFixed(2));
  }

  if (numericValue >= 10) {
    return Number(clamp(numericValue / 20, 0.18, 0.95).toFixed(2));
  }

  return Number(clamp(numericValue / 10, 0.18, 0.9).toFixed(2));
};

const buildDataStreamItems = (shot) => {
  const metricItems = buildMetricItems(shot);
  const detailUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));

  if (metricItems.length >= 2) {
    return metricItems.slice(0, 3).map((item, index) => ({
      label: item.label,
      value: item.value,
      detail: compactText(detailUnits[index + 1] || detailUnits[index] || '', 34),
      trend: index === 0 ? 'up' : index === 1 ? 'steady' : 'alert',
      accent: item.accent,
    }));
  }

  return collectListTokens(shot, 3).map((item, index) => ({
    label: compactText(item, 16),
    value: extractNumberTokens(item)[0] || String(80 - index * 14),
    detail: compactText(detailUnits[index + 1] || '', 34),
    trend: index === 0 ? 'up' : index === 1 ? 'steady' : 'alert',
    accent: inferAccent(shot, index),
  }));
};

const buildMemoryGraphNodes = (shot) => {
  return buildArchitectureNodes(shot)
    .slice(0, 4)
    .map((node, index) => ({
      ...node,
      detail: compactText(node.detail || semanticArray(shot?.keywords)[index] || '', 28),
      accent: node.accent || inferAccent(shot, index),
    }));
};

const buildPipelineStages = (shot) => {
  const stepItems = buildStepItems(shot);

  if (stepItems.length >= 3) {
    return stepItems.slice(0, 4);
  }

  return collectListTokens(shot, 4).map((item, index) => ({
    label: compactText(item, 18),
    detail: compactText(splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh))[index + 1] || '', 28),
    icon: '',
    accent: inferAccent(shot, index),
  }));
};

const buildBenchmarkItems = (shot) => {
  const compareRows = buildCompareRows(shot);

  if (compareRows.length > 0) {
    return compareRows.slice(0, 3).map((row, index) => ({
      label: compactText(row.label || `Benchmark ${index + 1}`, 18),
      primaryValue: compactText(row.right, 16),
      secondaryValue: compactText(row.left, 16),
      primaryRatio: inferRatioFromText(row.right, 0.8 - index * 0.08),
      secondaryRatio: inferRatioFromText(row.left, 0.54 - index * 0.06),
      accent: inferAccent(shot, index),
    }));
  }

  return buildMetricItems(shot)
    .slice(0, 3)
    .map((item, index) => ({
      label: item.label,
      primaryValue: item.value,
      secondaryValue: `${Math.max(1, Math.round((1 - index * 0.12) * 10))}${/%/.test(item.value) ? '%' : ''}`,
      primaryRatio: item.ratio,
      secondaryRatio: Number(clamp(item.ratio - 0.2, 0.18, 0.76).toFixed(2)),
      accent: item.accent,
    }));
};

const buildSceneSummary = (shot, primaryText, max = 40) => {
  const narrationUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const filtered = narrationUnits.filter((item) => !isCompactDuplicate(item, primaryText));

  if (filtered.length === 0) {
    return '';
  }

  for (let index = 0; index < filtered.length; index += 1) {
    const current = filtered[index];
    const next = filtered[index + 1] || '';
    const previous = filtered[index - 1] || '';

    if ((/^不是/.test(current) || /不是/.test(current)) && /^是/.test(next)) {
      return compactText([current, next].join('，'), max);
    }

    if (/不是/.test(previous) && /^是/.test(current)) {
      return compactText([previous, current].join('，'), max);
    }
  }

  const hardPivotIndex = filtered.findIndex((item) => /^(?:评论|下期|最看重哪个|值不值)/.test(item));
  if (hardPivotIndex >= 0) {
    return compactText(filtered.slice(hardPivotIndex, hardPivotIndex + 2).join('，'), max);
  }

  const pivotIndex = filtered.findIndex((item) => SUPPORT_MARKER_RE.test(item));
  if (pivotIndex >= 0) {
    return compactText(filtered.slice(pivotIndex, pivotIndex + 2).join('，'), max);
  }

  return compactText(filtered.slice(-2).join('，') || filtered[0], max);
};

const inferStripTag = (value, index) => {
  const text = safeString(value);

  if (/烦|问题|痛点|崩|上下文丢|调不动/.test(text)) {
    return index === 0 ? '核心问题' : '旧瓶颈';
  }

  if (/很多人以为|不如|误解|旧讲法/.test(text)) {
    return index === 0 ? '旧认知' : '偏见';
  }

  if (/K2\.?6|持平|优于|基准|跑分|连续编码|4000|300|不断裂|并行/.test(text)) {
    return '实测能力';
  }

  if (/3个人|质量|更稳|同一档|第一次|开源模型|全行业/.test(text)) {
    return '结果影响';
  }

  if (/不是|而是|口号|解决|评论|最看重/.test(text)) {
    return '结论';
  }

  return ['要点一', '要点二', '要点三', '要点四'][index] || `要点${index + 1}`;
};

const buildStripItems = (shot, summary) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const candidates = [];

  for (const candidate of [...semanticArray(shot?.dataPoints), ...narrationUnits.slice(1)]) {
    const value = safeString(candidate);
    if (!value || isCompactDuplicate(value, summary)) {
      continue;
    }

    if (/不是.*口号|跑分/.test(summary) && /不是.*口号|跑分/.test(value)) {
      continue;
    }

    if (/不是.*参数|解决.*问题/.test(summary) && /不是.*参数|解决.*问题/.test(value)) {
      continue;
    }

    if (candidates.some((entry) => isCompactDuplicate(entry, value))) {
      continue;
    }

    candidates.push(value);
    if (candidates.length >= 4) {
      break;
    }
  }

  return candidates.map((item, itemIndex) => ({
    label: itemIndex === 0 ? item : buildStripItemLabel(item),
    detail: buildStripItemDetail(item),
    chips: extractEvidenceChips(item),
    tag: inferStripTag(item, itemIndex),
    accent: inferAccent(shot, itemIndex),
    layout: buildStripItemLayout(item, itemIndex),
  }));
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEnglishCountUnit = (rawCount, singular, plural = `${singular}s`) => {
  const normalizedCount = safeString(rawCount);
  return normalizedCount === '1' || normalizedCount === '1.0'
    ? `${normalizedCount} ${singular}`
    : `${normalizedCount} ${plural}`;
};

const toEnglishMetricToken = (value) => {
  const text = safeString(value).replace(/\s+/g, '');
  if (!text) {
    return '';
  }

  const monthDayMatch = text.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (monthDayMatch) {
    const monthIndex = Number(monthDayMatch[1]) - 1;
    return `${MONTH_NAMES[monthIndex] || monthDayMatch[1]} ${monthDayMatch[2]}`;
  }

  const fullDateMatch = text.match(/^(20\d{2})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (fullDateMatch) {
    const monthIndex = Number(fullDateMatch[2]) - 1;
    return `${MONTH_NAMES[monthIndex] || fullDateMatch[2]} ${fullDateMatch[3]}, ${fullDateMatch[1]}`;
  }

  const numberToken = (text.match(/\d+(?:\.\d+)?\+?/) || [''])[0];
  if (!numberToken) {
    return text;
  }

  if (/小时/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'hour');
  }

  if (/分钟/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'min');
  }

  if (/秒/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'sec');
  }

  if (/天/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'day');
  }

  if (/行/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'line');
  }

  if (/子?Agent/i.test(text)) {
    return formatEnglishCountUnit(numberToken, 'agent');
  }

  if (/个/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'item');
  }

  if (/次/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'run');
  }

  if (/项/.test(text)) {
    return formatEnglishCountUnit(numberToken, 'item');
  }

  return numberToken;
};

const summarizeScenarioEn = (source, shot) => {
  const text = safeString(source);
  const asciiSource = extractAsciiPhrases(`${text} ${safeString(shot?.title)}`)
    .find((item) => !/^(?:K2\.?6|GPT-\d+(?:\.\d+)?|SWE-Bench Pro|HLE)$/i.test(item));

  if (/全栈开发者/.test(text)) {
    return 'full-stack dev workflow';
  }

  if (/开发者/.test(text)) {
    return 'developer workflow';
  }

  if (/团队/.test(text)) {
    return 'team delivery workflow';
  }

  if (/视频|出片|渲染|口播/.test(text)) {
    return 'video production flow';
  }

  if (/(benchmark|bench|exam|基准|跑分)/i.test(text)) {
    return 'benchmark comparison';
  }

  if (/开源|发布/.test(text)) {
    return 'open-source launch';
  }

  if (asciiSource) {
    return compactText(`${asciiSource} workflow`, 34);
  }

  return 'production workflow';
};

const summarizeBaselineEn = (source) => {
  const text = safeString(source);
  const duration = extractNumberTokens(text).find((token) => /(天|小时|分钟|秒)/.test(token));

  if (/模块|功能/.test(text) && duration) {
    return `1 module took ${toEnglishMetricToken(duration)}`;
  }

  if (duration) {
    return `baseline took ${toEnglishMetricToken(duration)}`;
  }

  if (/长任务中途崩|上下文丢|调不动/.test(text)) {
    return 'long runs broke easily';
  }

  if (/很多人以为|不如|误解/.test(text)) {
    return 'legacy view stayed behind';
  }

  return '';
};

const summarizeResultEn = (source) => {
  const text = safeString(source);
  const duration = extractNumberTokens(text).find((token) => /(天|小时|分钟|秒)/.test(token));
  const gptTier = (text.match(/GPT-\d+(?:\.\d+)?/i) || [''])[0].toUpperCase();

  if (duration && /(搞定|完成|盯完)/.test(text)) {
    return `ship in ${toEnglishMetricToken(duration)}`;
  }

  if (duration && /(节省|省下)/.test(text)) {
    return `save ${toEnglishMetricToken(duration)}`;
  }

  if (/持平|优于/.test(text) && gptTier) {
    return `reach ${gptTier} tier`;
  }

  if (/同一档|第一次/.test(text) && /开源|闭源/.test(text)) {
    return 'open source hits top tier';
  }

  if (/1个人.*3个人/.test(text)) {
    return '1 person replaces 3';
  }

  if (/更稳|不断裂/.test(text)) {
    return 'delivery stays stable';
  }

  return duration ? `result in ${toEnglishMetricToken(duration)}` : '';
};

const summarizeToolRoleEn = (source) => {
  const text = safeString(source);

  if (/K2\.?6/i.test(text) && /(编程|代码|coding|code)/i.test(text)) {
    return 'K2.6 assists coding tasks';
  }

  if (/K2\.?6/i.test(text) && /(Agent|并行|测试|部署)/i.test(text)) {
    return 'K2.6 coordinates agents';
  }

  if (/K2\.?6/i.test(text)) {
    return 'K2.6 drives the workflow';
  }

  return '';
};

const summarizeParallelTasksEn = (source) => {
  const text = safeString(source);

  if (/测试/.test(text) && /部署/.test(text)) {
    return 'tests + deploy run in parallel';
  }

  if (/(子Agent|Agent|并行)/i.test(text) && /调度|处理|协作/.test(text)) {
    return 'parallel agents split the work';
  }

  if (/(子Agent|Agent|并行)/i.test(text)) {
    return 'parallel agents stay active';
  }

  return '';
};

const summarizeBenchmarkEn = (source) => {
  const text = safeString(source);
  const gptTier = (text.match(/GPT-\d+(?:\.\d+)?/i) || [''])[0].toUpperCase();

  if (/SWE[- ]Bench Pro/i.test(text) && gptTier) {
    return `SWE-Bench Pro vs ${gptTier}`;
  }

  if (/Humanity'?s Last Exam/i.test(text) && gptTier) {
    return `HLE tracks ${gptTier}`;
  }

  if (/持平|优于/.test(text) && gptTier) {
    return `benchmarks reach ${gptTier}`;
  }

  if (/(benchmark|bench|exam|基准|跑分)/i.test(text)) {
    return 'public benchmark signal';
  }

  return '';
};

const summarizeTakeawayEn = (source) => {
  const text = safeString(source);

  if (/不是.*参数|解决.*问题/.test(text)) {
    return 'real value is solved work';
  }

  if (/不是.*口号|跑分/.test(text)) {
    return 'proof comes from public tests';
  }

  if (/最看重哪个/.test(text)) {
    return 'pick the capability that matters';
  }

  if (/开源|发布/.test(text)) {
    return 'open release resets the race';
  }

  return '';
};

const buildCodeLines = (shot) => {
  const narrativeUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const factSources = uniqueList(
    [
      ...narrativeUnits,
      ...getDisplayPoints(shot),
    ].filter(Boolean),
    10,
  );
  const factLabels = new Set();
  const facts = [];
  const pushFact = (label, value) => {
    const normalizedLabel = compactText(label, 14);
    const normalizedValue = compactText(value, 34);

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
    if (/开发者|团队|你是个|你带团队|案例|场景|发布|开源|基准|跑分/.test(source)) {
      pushFact('scenario', summarizeScenarioEn(source, shot));
    }

    if (/平时|原来|之前|要\d+(?:\.\d+)?(?:天|小时|分钟)|\d+(?:\.\d+)?(?:天|小时|分钟).*(?:要|需要)/.test(source)) {
      pushFact('baseline', summarizeBaselineEn(source));
    }

    if (/(?:节省|省下)\d+(?:\.\d+)?(?:人|个人力|天|小时)|\d+(?:\.\d+)?(?:天|小时).*(?:搞定|完成|盯完)|(?:搞定|完成|盯完).*\d+(?:\.\d+)?(?:天|小时)|持平|优于|同一档|更稳|不断裂/i.test(source)) {
      pushFact('result', summarizeResultEn(source));
    }

    if (/K2\.?6.*(?:辅助|自动生成|执行|编程|代码|协助)/i.test(source)) {
      pushFact('toolRole', summarizeToolRoleEn(source));
    }

    if (/Agent|并行|测试|部署/i.test(source)) {
      pushFact('parallelTasks', summarizeParallelTasksEn(source));
    }

    if (/(benchmark|bench|exam|基准|跑分|GPT-\d)/i.test(source)) {
      pushFact('benchmark', summarizeBenchmarkEn(source));
    }

    if (/真实问题|最看重|不是参数|解决什么问题|不是.*口号/.test(source)) {
      pushFact('takeaway', summarizeTakeawayEn(source));
    }
  }

  if (!facts.some((item) => item.label === 'scenario')) {
    pushFact('scenario', summarizeScenarioEn(getDisplayTitle(shot) || shot?.narration, shot));
  }

  if (!facts.some((item) => item.label === 'toolRole') && /K2\.?6/i.test(textFromShot(shot))) {
    pushFact('toolRole', 'K2.6 drives the workflow');
  }

  if (!facts.some((item) => item.label === 'takeaway')) {
    const takeaway = summarizeTakeawayEn(shot?.narration || getDisplayTitle(shot)) || 'execution matters more than hype';
    pushFact('takeaway', takeaway);
  }

  if (facts.length === 0) {
    pushFact('scenario', 'production workflow');
    pushFact('takeaway', 'execution matters more than hype');
  }

  const factPriority = ['scenario', 'baseline', 'result', 'parallelTasks', 'toolRole', 'benchmark', 'takeaway'];
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
      ...getDisplayPoints(shot),
    ],
    4,
  );

  const fallbackItems = items.length > 0
    ? items
    : splitNarrationUnits(shot?.narration || getDisplaySummary(shot, shot?.visualSummaryZh) || getDisplayTitle(shot) || 'scene ready');

  return fallbackItems.map((item) => `> ${compactText(item, 48)}`);
};

const sceneCycle = [
  'focus',
  'feature-rail',
  'architecture-map',
  'tag-matrix',
  'metrics',
  'timeline',
  'data-stream',
  'benchmark-chart',
  'memory-graph',
  'pipeline-flow',
  'glossary-term',
  'quote-highlight',
  'evidence-wall',
];
const hasStandaloneAsciiToken = (text, token) => new RegExp(`(?:^|[^a-z])${token}(?:[^a-z]|$)`).test(text);
const SCENE_FAMILY_LIST = Array.from(ULTIMATE_SCENE_FAMILIES);
const DIVERSITY_EXCLUDED_FAMILIES = new Set(['hero', 'cta']);
const FAMILY_DIVERSITY_BITS = new Map(
  SCENE_FAMILY_LIST
    .filter((family) => !DIVERSITY_EXCLUDED_FAMILIES.has(family))
    .map((family, index) => [family, 1 << index]),
);
const RHYTHM_LAYER_MAP = new Map([
  ['hero', 'context'],
  ['cta', 'closing'],
  ['feature-rail', 'emphasis'],
  ['number-strip', 'emphasis'],
  ['architecture-map', 'structure'],
  ['memory-graph', 'structure'],
  ['pipeline-flow', 'structure'],
  ['timeline', 'structure'],
  ['step-flow', 'structure'],
  ['data-stream', 'emphasis'],
  ['compare-board', 'emphasis'],
  ['metrics', 'emphasis'],
  ['benchmark-chart', 'emphasis'],
  ['focus', 'context'],
  ['quote-highlight', 'context'],
  ['glossary-term', 'context'],
  ['evidence-wall', 'proof'],
  ['terminal', 'proof'],
  ['code', 'proof'],
  ['tag-matrix', 'structure'],
]);

const getRhythmLayer = (family) => RHYTHM_LAYER_MAP.get(family) || 'context';

const buildSceneIntentText = (shot) => {
  const comparisonText = asArray(shot?.comparisons)
    .flatMap((item) => [
      safeString(item?.label || item?.title),
      safeString(item?.left || item?.before || item?.old || item?.a),
      safeString(item?.right || item?.after || item?.new || item?.b),
    ])
    .filter(Boolean);

  return [
    getDisplayTitle(shot),
    safeString(shot?.narration),
    safeString(shot?.type),
    safeString(shot?.level),
    safeString(shot?.comparisonSummaryZh),
    ...getDisplayPoints(shot, 8),
    ...semanticArray(shot?.keywords, 8),
    ...comparisonText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const buildSceneCycleCandidates = (index) => {
  const offset = ((index - 1) % sceneCycle.length + sceneCycle.length) % sceneCycle.length;
  return [
    ...sceneCycle.slice(offset),
    ...sceneCycle.slice(0, offset),
  ];
};

const collectSceneFamilyCandidates = (shot, index, total) => {
  const title = getDisplayTitle(shot);
  const text = buildSceneIntentText(shot);
  const requestedFamily = safeString(shot?.family || shot?.sceneFamily).toLowerCase();
  const comparisonSummary = safeString(shot?.comparisonSummaryZh).toLowerCase();
  const hasCompareSummary = /(vs|versus|对比|差异|旧讲法|当前方案|before|after|battle)/.test(comparisonSummary);
  const hasCompareType = /对比|comparison|versus|battle/.test(safeString(shot?.type).toLowerCase());
  const compareRows = buildCompareRows(shot);
  const hasStructuredCompare = compareRows.length >= 1;
  const hasNumberStripIntent = /(很多人以为|很多人觉得|不是.*而是|认知反转|旧认知|新事实|误解|偏见)/.test(text);
  const timelineTokenCount = extractNumberTokens(text).filter((token) => /20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d+月\d+日/.test(token)).length;
  const hasBenchmarkIntent = /(benchmark|bench|exam|跑分|基准|实测|hle|swe[- ]bench)/.test(text);
  const hasDataStreamIntent = /(实时|数据流|stream|feed|signal|monitor|qps|tps|throughput|tokens?\/s|吞吐|流量)/.test(text);
  const hasMemoryIntent = /(memory|context|上下文|记忆|知识图谱|graph|embedding|召回|检索|知识库)/.test(text);
  const hasPipelineIntent = /(管线|pipeline|\bflow\b|链路|ingest|dispatch|compile|render|\bprocess\b|\bstage\b|分发链路|处理链路)/.test(text);
  const hasQuoteIntent = /[“”"']|一句话|关键判断|核心结论|真正该讲的是|最狠的一句/.test(text);
  const hasGlossaryIntent = /(是什么|什么意思|本质上|指的是|可以理解成|术语|定义)/.test(text);
  const candidates = [];

  if (ULTIMATE_SCENE_FAMILIES.has(requestedFamily)) {
    return [requestedFamily];
  }

  if (index === 0) {
    return ['hero'];
  }

  if (index === total - 1) {
    return ['cta'];
  }

  if (
    /(命令|终端|日志|运行)/.test(text)
    || ['shell', 'bash', 'terminal', 'cli', 'render'].some((token) => hasStandaloneAsciiToken(text, token))
  ) {
    candidates.push('terminal');
  }

  if (hasDataStreamIntent && buildDataStreamItems(shot).length >= 2) {
    candidates.push('data-stream');
  }

  if (hasBenchmarkIntent && buildBenchmarkItems(shot).length >= 2) {
    candidates.push('benchmark-chart');
  }

  if (
    (
      /(发布时间|时间线|roadmap|里程碑|版本节点|版本演进|发布节奏|开源发布|刚发|刚发布|前脚|后脚|上线|launch|release|history|rollout|发布)/.test(text)
      || timelineTokenCount >= 2
    )
    && buildTimelineItems(shot).length >= 3
  ) {
    candidates.push('timeline');
  }

  if (
    compareRows.length >= 2
    || (hasStructuredCompare && hasCompareSummary)
    || (hasCompareSummary && hasCompareType)
    || (
      /(对比|差异|vs|versus|battle)/.test(text)
      && extractModelTokens(text).length >= 2
      && !/(很多人以为|很多人觉得|误解|旧认知|新事实)/.test(text)
    )
  ) {
    candidates.push('compare-board');
  }

  if (hasNumberStripIntent) {
    candidates.push('number-strip');
  }

  if (
    /(官方|来源|博客|release|benchmark|bench|exam|paper|docs|github|hugging\s*face|实测|证据)/.test(text)
    && buildEvidenceCards(shot).length >= 2
  ) {
    candidates.push('evidence-wall');
  }

  if (
    /(配置|脚本|函数|接口|参数)/.test(text)
    || ['schema', 'json', 'api', 'code'].some((token) => hasStandaloneAsciiToken(text, token))
  ) {
    candidates.push('code');
  }

  if (
    /(架构|系统|模块|分层|拓扑|工具链|agent|router|memory|orchestr|stack|toolchain)/.test(text)
    && buildArchitectureNodes(shot).length >= 4
  ) {
    candidates.push('architecture-map');
  }

  if (hasMemoryIntent && buildMemoryGraphNodes(shot).length >= 3) {
    candidates.push('memory-graph');
  }

  if (hasPipelineIntent && buildPipelineStages(shot).length >= 3) {
    candidates.push('pipeline-flow');
  }

  if (/(步骤|流程|工作流|依次|第一|第二|第三|先|再|最后|pipeline|process)/.test(text) && buildStepItems(shot).length >= 3) {
    candidates.push('step-flow');
  }

  if (hasGlossaryIntent && title.length <= 20) {
    candidates.push('glossary-term');
  }

  if (/(场景|开发者|团队|问题|痛点|案例|想象一下)/.test(text) && buildFeatureItems(shot).length >= 3) {
    candidates.push('feature-rail');
  }

  if (extractNumberTokens(text).length >= 2) {
    candidates.push('metrics');
  }

  if (asArray(shot?.keywords).length + asArray(shot?.dataPoints).length >= 5) {
    candidates.push('tag-matrix');
  }

  if (hasQuoteIntent && splitNarrationUnits(shot?.narration || getDisplayTitle(shot)).length <= 3) {
    candidates.push('quote-highlight');
  }

  if (safeString(shot?.visualFocusZh).length > 0 && safeString(shot?.visualFocusZh).length <= 24) {
    candidates.push('focus');
  }

  return uniqueList([
    ...candidates,
    ...buildSceneCycleCandidates(index),
    'focus',
  ]);
};

const inferSceneFamily = (shot, index, total, previousFamily = '') => {
  const requestedFamily = safeString(shot?.family || shot?.sceneFamily).toLowerCase();
  const candidates = collectSceneFamilyCandidates(shot, index, total);

  if (candidates.length === 0) {
    return 'focus';
  }

  if (
    index === 0
    || index === total - 1
    || !previousFamily
    || ULTIMATE_SCENE_FAMILIES.has(requestedFamily)
  ) {
    return candidates[0];
  }

  return candidates.find((family) => family !== previousFamily) || candidates[0];
};

const compareFamilyPlans = (left, right) => {
  if (!right) {
    return 1;
  }

  if (left.uniqueCount !== right.uniqueCount) {
    return left.uniqueCount > right.uniqueCount ? 1 : -1;
  }

  if (left.repeatCount !== right.repeatCount) {
    return left.repeatCount < right.repeatCount ? 1 : -1;
  }

  if (left.adjacentRepeatCount !== right.adjacentRepeatCount) {
    return left.adjacentRepeatCount < right.adjacentRepeatCount ? 1 : -1;
  }

  if (left.layerRunPenalty !== right.layerRunPenalty) {
    return left.layerRunPenalty < right.layerRunPenalty ? 1 : -1;
  }

  if (left.weightedCost !== right.weightedCost) {
    return left.weightedCost < right.weightedCost ? 1 : -1;
  }

  if (left.rawCost !== right.rawCost) {
    return left.rawCost < right.rawCost ? 1 : -1;
  }

  return 0;
};

const selectSceneFamilies = (shots) => {
  const total = shots.length;
  const candidateMatrix = shots.map((shot, index) => collectSceneFamilyCandidates(shot, index, total));
  const memo = new Map();

  const solve = (index, previousFamily, usedMask, runLayer, runLength) => {
    if (index >= total) {
      return {
        uniqueCount: 0,
        repeatCount: 0,
        adjacentRepeatCount: 0,
        layerRunPenalty: 0,
        weightedCost: 0,
        rawCost: 0,
        families: [],
      };
    }

    const memoKey = `${index}::${previousFamily || '-'}::${usedMask}::${runLayer || '-'}::${runLength}`;
    const cached = memo.get(memoKey);
    if (cached) {
      return cached;
    }

    const candidates = candidateMatrix[index];
    let bestPlan = null;

    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const family = candidates[candidateIndex];
      const isMiddleScene = index > 0 && index < total - 1;
      const diversityBit = FAMILY_DIVERSITY_BITS.get(family) || 0;
      const isRepeatedFamily = isMiddleScene && diversityBit !== 0 && (usedMask & diversityBit) !== 0;
      const uniqueGain = isMiddleScene && diversityBit !== 0 && !isRepeatedFamily ? 1 : 0;
      const nextMask = isMiddleScene && diversityBit !== 0 ? (usedMask | diversityBit) : usedMask;
      const deviationWeight = isMiddleScene ? Math.max(1, total - index) : 0;
      const layer = getRhythmLayer(family);
      const nextRunLength = layer === runLayer ? runLength + 1 : 1;
      const runPenalty = nextRunLength >= 3 ? 1 : 0;
      const suffixPlan = solve(index + 1, family, nextMask, layer, nextRunLength);
      const candidatePlan = {
        uniqueCount: uniqueGain + suffixPlan.uniqueCount,
        repeatCount: (isRepeatedFamily ? 1 : 0) + suffixPlan.repeatCount,
        adjacentRepeatCount:
          (isMiddleScene && previousFamily && family === previousFamily ? 1 : 0) + suffixPlan.adjacentRepeatCount,
        layerRunPenalty: runPenalty + suffixPlan.layerRunPenalty,
        weightedCost: candidateIndex * deviationWeight + suffixPlan.weightedCost,
        rawCost: candidateIndex + suffixPlan.rawCost,
        families: [family, ...suffixPlan.families],
      };

      if (compareFamilyPlans(candidatePlan, bestPlan) > 0) {
        bestPlan = candidatePlan;
      }
    }

    memo.set(memoKey, bestPlan);
    return bestPlan;
  };

  return solve(0, '', 0, '', 0).families;
};

const buildSceneData = (family, shot, index) => {
  const accent = inferAccent(shot, index);
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const displayTitle = getDisplayTitle(shot);
  const displaySummary = getDisplaySummary(shot, shot?.visualSummaryZh);
  const primaryText = narrationUnits[0] || displayTitle || shot?.narration || shot?.level || shot?.type || `Scene ${index + 1}`;
  const secondaryText = narrationUnits.slice(1).join('，') || displaySummary || '';
  const title = compactText(primaryText, 28);
  const subtitle = compactText(displaySummary, 72);
  const summary = buildSceneSummary(shot, primaryText, 44);
  const keywords = uniqueList(
    [
      ...getDisplayPoints(shot),
      ...narrationUnits,
    ],
    3,
  );
  const points = uniqueList(
    [
      ...getDisplayPoints(shot),
      ...narrationUnits.slice(1),
    ],
    4,
  );
  const metricItems = buildMetricItems(shot);
  const timelineItems = buildTimelineItems(shot);
  const compareRows = buildCompareRows(shot);
  const compareTitles = inferCompareSideTitles(shot);
  const evidenceCards = buildEvidenceCards(shot);
  const architectureNodes = buildArchitectureNodes(shot);
  const tagItems = buildTagItems(shot);
  const dataStreamItems = buildDataStreamItems(shot);
  const memoryGraphNodes = buildMemoryGraphNodes(shot);
  const pipelineStages = buildPipelineStages(shot);
  const benchmarkItems = buildBenchmarkItems(shot);

  switch (family) {
    case 'hero':
      return {
        kicker: '',
        title,
        subtitle: compactText(secondaryText, 94),
        badge: '',
        accent,
        avatarLabel: '',
        highlightedWord: buildHeroHighlightWord(shot, primaryText),
        brandLabel: extractTargetModel(`${safeString(shot?.narration)} ${displayTitle}`) || '',
      };
    case 'focus':
      return {
        eyebrow: '',
        keyword: compactText(primaryText, 18),
        question: compactText(narrationUnits[1] || primaryText, 28),
        description: compactText(secondaryText, 88),
        accent,
        diagram: /对比|parallel|系统|loop|闭环/.test(`${shot?.narration || ''} ${displayTitle || ''}`.toLowerCase()) ? 'rings' : 'framing',
      };
    case 'feature-rail':
      return {
        kicker: '',
        heading: buildFeatureRailHeading(shot, title),
        items: buildFeatureItems(shot),
      };
    case 'number-strip': {
      const displayItems = buildStripItems(shot, summary);
      const numericCount = toNumber(extractNumberTokens(title)[0], 0);
      return {
        count: String(Math.max(2, displayItems.length || points.length || numericCount || 2)),
        heading: buildStripHeading(primaryText, title),
        summary,
        items: displayItems.length > 0
          ? displayItems
          : [
              {
                label: compactText(primaryText, 16),
                tag: inferStripTag(primaryText, 0),
                accent,
                chips: extractEvidenceChips(primaryText),
                detail: buildStripItemDetail(primaryText),
                layout: 'regular',
              },
              {
                label: compactText(secondaryText, 18),
                detail: buildStripItemDetail(secondaryText),
                chips: extractEvidenceChips(secondaryText),
                tag: inferStripTag(secondaryText, 1),
                accent: inferAccent(shot, index + 1),
                layout: buildStripItemLayout(secondaryText, 1),
              },
        ],
        accent,
      };
    }
    case 'step-flow':
      return {
        heading: title,
        steps: buildStepItems(shot),
      };
    case 'timeline':
      return {
        heading: title,
        summary,
        items: timelineItems.length > 0
          ? timelineItems
          : [
              {
                label: '节点 1',
                title: compactText(primaryText, 24),
                detail: compactText(secondaryText, 40),
                icon: '',
                accent,
              },
            ],
        accent,
      };
    case 'compare-board':
      return {
        heading: title,
        summary,
        leftTitle: compareTitles.leftTitle,
        rightTitle: compareTitles.rightTitle,
        leftEyebrow: '',
        rightEyebrow: '',
        rows: compareRows.length > 0
          ? compareRows
          : [
              {
                label: compactText(displayTitle || '核心差异', 16),
                left: compactText(primaryText, 20),
                right: compactText(secondaryText || summary || primaryText, 20),
                accent,
              },
            ],
        leftAccent: 'red',
        rightAccent: 'green',
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
    case 'evidence-wall':
      return {
        heading: title,
        summary,
        cards: evidenceCards.length > 0
          ? evidenceCards
          : [
              {
                source: '证据 1',
                quote: compactText(primaryText, 44),
                detail: compactText(secondaryText, 40),
                chips: extractEvidenceChips(primaryText),
                icon: '',
                accent,
              },
            ],
        accent: 'yellow',
      };
    case 'architecture-map':
      return {
        heading: title,
        centerTitle: compactText(displayTitle || primaryText, 22),
        centerDetail: summary || compactText(secondaryText, 52),
        nodes: architectureNodes.length > 0
          ? architectureNodes
          : [
              {
                label: compactText(primaryText, 18),
                detail: compactText(secondaryText, 28),
                icon: '',
                accent,
              },
            ],
        accent,
        layout: architectureNodes.length >= 5 ? 'radial' : 'stack',
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
        heading: buildCodeHeading(shot, primaryText, title),
        filename: buildCodeFilename(shot),
        lines: buildCodeLines(shot),
        highlightLine: 2,
        footer: summary || compactText(secondaryText, 72),
        accent,
      };
    case 'metrics':
      return {
        heading: title,
        summary,
        layout: 'bars',
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
    case 'data-stream':
      return {
        heading: title,
        summary,
        items: dataStreamItems.length > 0
          ? dataStreamItems
          : [
              {
                label: compactText(keywords[0] || primaryText, 16),
                value: extractNumberTokens(primaryText)[0] || '92%',
                detail: compactText(secondaryText, 34),
                trend: 'up',
                accent,
              },
            ],
        accent,
      };
    case 'memory-graph':
      return {
        heading: title,
        summary,
        centerTitle: compactText(displayTitle || primaryText, 22),
        centerDetail: summary || compactText(secondaryText, 52),
        nodes: memoryGraphNodes.length > 0
          ? memoryGraphNodes
          : [
              {
                label: compactText(primaryText, 18),
                detail: compactText(secondaryText, 28),
                icon: '',
                accent,
              },
            ],
        accent,
      };
    case 'pipeline-flow':
      return {
        heading: title,
        summary,
        stages: pipelineStages.length > 0
          ? pipelineStages
          : [
              {
                label: compactText(primaryText, 18),
                detail: compactText(secondaryText, 28),
                icon: '',
                accent,
              },
            ],
        accent,
      };
    case 'benchmark-chart':
      return {
        heading: title,
        summary,
        primaryLabel: compareTitles.rightTitle || extractTargetModel(textFromShot(shot)) || 'Current',
        secondaryLabel: compareTitles.leftTitle || 'Baseline',
        items: benchmarkItems.length > 0
          ? benchmarkItems
          : [
              {
                label: compactText(primaryText, 18),
                primaryValue: extractNumberTokens(primaryText)[0] || '92%',
                secondaryValue: '68%',
                primaryRatio: 0.92,
                secondaryRatio: 0.68,
                accent,
              },
            ],
        accent: 'yellow',
      };
    case 'quote-highlight':
      return {
        heading: compactText(displayTitle || '关键判断', 18),
        quote: compactText(primaryText || shot?.narration || displayTitle, 72),
        attribution: compactText(summary || secondaryText, 44),
        tags: tagItems.slice(0, 3),
        accent,
      };
    case 'glossary-term':
      return {
        heading: compactText(displayTitle || '术语解释', 18),
        term: compactText(displayTitle || primaryText, 18),
        pronunciation: '',
        definition: compactText(summary || secondaryText || shot?.narration, 88),
        related: tagItems.slice(0, 4),
        accent,
      };
    case 'cta':
      {
        const questionLine = narrationUnits.find((item) => /[？?]/.test(item) || /哪个|怎么选|怎么看|值不值/.test(item));
        const sourceLine = narrationUnits[0] || shot?.narration || displayTitle || '';
        const highlights = compactUniqueItems(
          [
            ...splitListPhrases(sourceLine),
            ...getDisplayPoints(shot),
          ].filter((item) => !/[？?]/.test(item)),
          16,
          3,
        );
        const supportText = compactText(
          uniqueList(
            [
              ...narrationUnits.filter((item) => item !== sourceLine && item !== questionLine),
              ...getDisplayPoints(shot).filter(
                (item) => !highlights.some((entry) => isCompactDuplicate(entry, item))
                  && !isCompactDuplicate(item, questionLine),
              ),
            ],
            3,
          ).join('，'),
          40,
        );

        return {
          heading: compactText(questionLine || '你最看重哪个', 18),
          subtitle: supportText || compactText(secondaryText, 88),
          searchLabel: '',
          badge: '',
          highlights,
        };
      }
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
  return `${getDisplayTitle(shot)} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();
}

function resolveSceneMediaSrc(family, shot) {
  const mediaSrc = safeString(shot?.imageUrl);
  return mediaSrc || null;
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
  const selectedFamilies = selectSceneFamilies(shots);

  return {
    title,
    defaultPlatformOverlay: overlay,
    defaultTransition: {
      preset: width >= height ? 'lift' : 'fade',
      durationInFrames: 12,
    },
    scenes: shots.map((shot, index) => {
      const family = selectedFamilies[index] || inferSceneFamily(shot, index, shots.length, selectedFamilies[index - 1] || '');
      const accent = inferAccent(shot, index);

      return {
        id: safeString(shot?.id) || `shot-${String(index + 1).padStart(2, '0')}`,
        family,
        iconPack: semanticArray(shot?.iconPack, 6),
        mediaSrc: resolveSceneMediaSrc(family, shot),
        subtitle: compactText(getDisplaySummary(shot, shot?.visualSummaryZh || shot?.visualFocusZh), 72),
        durationInFrames: normalizeDurationInFrames(shot, fps),
        warm: /warm|里程碑|升级|结论|发布|收束/.test(`${safeString(shot?.style)} ${safeString(shot?.mood)} ${getDisplayTitle(shot)}`.toLowerCase()),
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
    subtitleData: Array.isArray(project?.subtitleData) ? project.subtitleData : null,
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

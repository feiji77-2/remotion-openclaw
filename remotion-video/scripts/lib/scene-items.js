// Scene item builders — buildFeatureItems, buildStepItems, buildTimelineItems, etc.

const {
  ACCENT_ROTATION,
  MONTH_NAMES,
  SUPPORT_MARKER_RE,
} = require('./constants.js');
const {
  safeString,
  compactText,
  compactSimilarityKey,
  isCompactDuplicate,
  isCompactDuplicateByKey,
  toNumber,
  uniqueList: uList,
  asArray,
  semanticArray,
  splitNarrationUnits,
} = require('./text-utils.js');
const {
  getDisplayTitle,
  getDisplaySummary,
  getDisplayPoints,
  extractTargetModel,
  extractAsciiPhrases,
  extractEvidenceChips,
  buildHeroHighlightWord,
  buildFeatureRailHeading,
  splitTitleTokens,
} = require('./extractors.js');
const {inferAccent} = require('./builders-utils.js');
const {buildCodeHeading, buildCodeFilename, buildTerminalOutputs} = require('./output-builders.js');

const FEATURE_RAIL_HEADING_RULES = [
  {
    patterns: [/不是在回答问题/u, /做完/u],
    matchAll: true,
    replacement: '它不是回答问题，它是在替你做完',
  },
  {
    patterns: [/输入含糊/u, /输出/u],
    matchAll: true,
    replacement: '输入很糊，输出直接可跑',
  },
  {
    patterns: [/完整(?:的)?可执行方案/u],
    matchAll: false,
    replacement: '它直接给出完整可执行方案',
  },
];

// ── feature-rail ────────────────────────────────────────────────

const buildFeatureItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const narrationLead = safeString(narrationUnits[0] || shot?.narration);
  const displayPoints = getDisplayPoints(shot);
  const sourceItems = uList(
    [
      ...displayPoints,
      ...narrationUnits,
    ],
    12,
  );
  const similarityKeys = sourceItems.map((item) => ({item, key: compactSimilarityKey(item)}));
  const deduped = [];
  for (const {item, key} of similarityKeys) {
    if (deduped.some((existing) => isCompactDuplicateByKey(existing.key, key))) {
      continue;
    }
    deduped.push({item, key});
  }
  const compactItems = deduped.map(({item}) => compactText(item, 28)).filter(Boolean);
  const heading = buildFeatureRailHeading(shot, compactItems[0] || '');
  return {
    heading,
    items: compactItems.slice(0, 6),
    lead: compactText(narrationLead, 80),
  };
};

// ── step-flow ────────────────────────────────────────────────────

const buildStepItems = (shot) => {
  const {splitListPhrases} = require('./extractors.js');
  const rawSteps = asArray(shot?.steps || shot?.stepList || splitListPhrases(shot?.narration || getDisplaySummary(shot)));
  const steps = uList(rawSteps.map((s) => safeString(s)).filter(Boolean), 6);
  return steps.map((step, index) => ({
    number: String(index + 1),
    label: compactText(step, 40),
  }));
};

// ── number-strip ────────────────────────────────────────────────

const buildStripHeading = (value, fallback = '') => {
  const text = safeString(value);
  if (/^数字/.test(text)) {
    return compactText(text.replace(/^数字/, '').trim() || fallback, 22);
  }
  return compactText(text || fallback, 22);
};

const buildStripItemLabel = (value) => {
  const text = safeString(value);
  const targetModel = extractTargetModel(text);

  if (!text) {
    return '';
  }

  if (/很多人以为.+不如/i.test(text)) {
    const match = text.match(/很多人以为(.+?不如\s*GPT(?:-\d+(?:\.\d+)*)?)?/i);
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

  return '';
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
    /连续编码|4000|300|Agent|并行|不断裂/.test(text)
    && (text.length >= 18 || extractEvidenceChips(text, 4).length >= 2 || /(持平|优于|4000|300|Agent|并行|同一档)/.test(text))
  ) {
    return 'wide';
  }
  return 'regular';
};

const inferStripTag = (value, index) => {
  const text = safeString(value);
  const tagMap = [
    [/^[""'']?(?:国产|国货|国产货)/, '国产'],
    [/^[""'']?(?:开源|开放)/, '开源'],
    [/^[""'']?(?:闭源|商业)/, '闭源'],
    [/^[""'']?(?:参数|规模)/, '规模'],
    [/^[""'']?(?:测试|基准)/, '基准'],
    [/^[""'']?(?:性能|速度)/, '性能'],
  ];
  for (const [re, tag] of tagMap) {
    if (re.test(text)) {
      return tag;
    }
  }
  const accentIndex = index % ACCENT_ROTATION.length;
  return ACCENT_ROTATION[accentIndex];
};

const buildStripItems = (shot, summary) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const candidates = [];

  for (const candidate of [...semanticArray(shot?.dataPoints), ...narrationUnits.slice(1)]) {
    const value = safeString(candidate);
    if (!value) {
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
    label: itemIndex === 0 ? item : buildStripItemLabel(item) || compactText(item, 20),
    detail: buildStripItemDetail(item),
    chips: extractEvidenceChips(item),
    tag: inferStripTag(item, itemIndex),
    accent: inferAccent(shot, itemIndex),
    layout: buildStripItemLayout(item, itemIndex),
  }));
};

// ── timeline ────────────────────────────────────────────────────

const buildTimelineItems = (shot) => {
  const narrationUnits = splitNarrationUnits(shot?.narration || shot?.visualSummaryZh);
  const sourceItems = uList(
    [...semanticArray(shot?.dataPoints), ...narrationUnits],
    8,
  );
  const items = [];

  for (const source of sourceItems) {
    const titleText = compactText(source, 24);
    if (!titleText || items.some((item) => isCompactDuplicate(item.title, titleText))) {
      continue;
    }

    items.push({
      label: buildTimelineLabel(source, items.length),
      title: titleText,
      detail: compactText(buildSceneSummary(shot, source, 40), 40),
      icon: '',
      accent: inferAccent(shot, items.length),
    });
  }

  return items;
};

const buildTimelineLabel = (value, index) => {
  const text = safeString(value);
  const dateMatch = text.match(/(\d+月\d+日|20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\/\d{1,2})/);
  if (dateMatch) {
    return dateMatch[1];
  }
  return `Step ${index + 1}`;
};

// ── compare-board ────────────────────────────────────────────────

const inferCompareSideTitles = (shot) => {
  const {textFromShot: textFromShotFn} = require('./output-builders.js');
  const {extractModelTokens} = require('./extractors.js');
  const text = textFromShotFn(shot);
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
  const comparisons = asArray(shot?.comparisons);
  if (comparisons.length > 0) {
    return comparisons
      .map((item, idx) => ({
        label: safeString(item?.label || item?.title),
        left: safeString(item?.left || item?.before || item?.old || item?.a),
        right: safeString(item?.right || item?.after || item?.new || item?.b),
        accent: ACCENT_ROTATION[idx % ACCENT_ROTATION.length],
      }))
      .filter((item) => item.label && (item.left || item.right));
  }
  const {splitListPhrases} = require('./extractors.js');
  const text = safeString(shot?.narration);
  const match = text.match(/(.+?)[:：]\s*(.+?)\s*(?:[vsVS]|对比|比较)\s*(.+?)$/);
  if (match) {
    return [{
      label: compactText(match[1], 18),
      left: compactText(match[2], 28),
      right: compactText(match[3], 28),
    }];
  }
  return [];
};

// ── tag-matrix ──────────────────────────────────────────────────

const buildTagItems = (shot) => {
  const displayPoints = getDisplayPoints(shot, 9);
  const keywords = asArray(shot?.keywords).map((k) => safeString(k)).filter(Boolean);
  const items = uList([...displayPoints, ...keywords], 9);
  return items.map((item) => ({
    label: compactText(item, 16),
    glyph: '',
    accent: 'cyan',
  }));
};

// ── evidence-wall ────────────────────────────────────────────────

const buildEvidenceCards = (shot) => {
  const displayPoints = getDisplayPoints(shot, 6);
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const rawItems = displayPoints.length > 0 ? displayPoints : narrationUnits;
  const items = uList(rawItems, 6);
  return items.map((item, index) => {
    const chips = extractEvidenceChips(item, 3);
    return {
      quote: compactText(item, 72),
      chips: chips.length > 0 ? chips : undefined,
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
    };
  });
};

// ── architecture-map ────────────────────────────────────────────

const buildArchitectureNodes = (shot) => {
  const displayPoints = getDisplayPoints(shot, 8);
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const rawItems = uList([...displayPoints, ...narrationUnits], 8);
  return rawItems.map((item, index) => ({
    label: compactText(item, 20),
    accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
  }));
};

// ── metrics ──────────────────────────────────────────────────────

const inferMetricLabel = (source, number, fallbackTitle, index) => {
  const text = safeString(source);
  const numberToken = safeString(number);
  if (/^(?:性能|速度|提升|增长)/.test(text)) {
    return compactText(text.replace(/^(?:性能|速度|提升|增长)/, '').trim() || fallbackTitle, 18);
  }
  if (/^(?:准确率|精度)/.test(text)) {
    return '准确率';
  }
  if (/^(?:成本|费用)/.test(text)) {
    return '成本';
  }
  if (/^(?:延迟|响应)/.test(text)) {
    return '延迟';
  }
  if (/^(?:吞吐|QPS|并发)/.test(text)) {
    return '吞吐';
  }
  if (/^[""'']?(?:国产|国货)/.test(text)) {
    return '国产';
  }
  return compactText(fallbackTitle || numberToken || text, 18);
};

const metricPriority = (label) => {
  const text = safeString(label).toLowerCase();
  if (/性能|速度|提升|增长/.test(text)) return 0;
  if (/准确率|精度|质量/.test(text)) return 1;
  if (/成本|费用|节省/.test(text)) return 2;
  if (/延迟|响应/.test(text)) return 3;
  if (/吞吐|QPS|并发/.test(text)) return 4;
  if (/国产|国货|开源/.test(text)) return 5;
  return 6;
};

const buildMetricItems = (shot) => {
  const displayPoints = getDisplayPoints(shot, 4);
  const rawItems = displayPoints.length > 0 ? displayPoints : splitNarrationUnits(shot?.narration);
  const items = uList(rawItems, 4);
  return items
    .map((item, index) => {
      const numberMatch = item.match(/(?:^|\s)(\d+(?:\.\d+)?%?)(?:\s|$)/);
      const number = numberMatch ? numberMatch[1] : '';
      const label = inferMetricLabel(item, number, item, index);
      return {
        label,
        number,
        accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
        priority: metricPriority(label),
      };
    })
    .sort((a, b) => a.priority - b.priority);
};

// ── data-stream ─────────────────────────────────────────────────

const inferRatioFromText = (value, fallback = 0.72) => {
  const text = safeString(value);
  const ratioMatch = text.match(/(\d+(?:\.\d+)?)\s*(?::|：)\s*(\d+(?:\.\d+)?)/);
  if (ratioMatch) {
    const [, left, right] = ratioMatch;
    const parsed = parseFloat(left) / parseFloat(right);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    return parseFloat(percentMatch[1]) / 100;
  }
  return fallback;
};

const buildDataStreamItems = (shot) => {
  const displayPoints = getDisplayPoints(shot, 4);
  const rawItems = displayPoints.length > 0 ? displayPoints : splitNarrationUnits(shot?.narration);
  const items = uList(rawItems, 4);
  return items.map((item, index) => {
    const numberMatch = item.match(/(\d+(?:\.\d+)?(?:\.\d+)?(?:\s*(?:x|倍|:|：)\s*\d+(?:\.\d+)?)?)/);
    const number = numberMatch ? numberMatch[1].trim() : '';
    return {
      label: compactText(item, 36),
      number,
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
    };
  });
};

// ── memory-graph ────────────────────────────────────────────────

const buildMemoryGraphNodes = (shot) => {
  const displayPoints = getDisplayPoints(shot, 6);
  const items = uList(displayPoints, 6);
  return items.map((item, index) => ({
    label: compactText(item, 22),
    accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
  }));
};

// ── pipeline-flow ───────────────────────────────────────────────

const buildPipelineStages = (shot) => {
  const displayPoints = getDisplayPoints(shot, 6);
  const items = uList(displayPoints, 6);
  return items.map((item, index) => ({
    label: compactText(item, 24),
    accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
  }));
};

// ── benchmark-chart ─────────────────────────────────────────────

const extractNumberTokens = (value) => {
  const {uniqueList: uListLocal} = require('./text-utils.js');
  return uListLocal(
    safeString(value).match(
      /(?:20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d+月\d+日|\d+(?:\.\d+)?\+?\s*(?:小时|分钟|秒|人|个|天|次|项|行|版|Agent|子Agent)|\d+(?:\.\d+)?\+?%?)/g,
    ) || [],
    8,
  );
};

const buildBenchmarkItems = (shot) => {
  const displayPoints = getDisplayPoints(shot, 6);
  const text = safeString(shot?.narration);
  const rawItems = displayPoints.length > 0 ? displayPoints : splitNarrationUnits(text);
  const items = uList(rawItems, 6);
  const results = [];
  const seenLabels = new Set();
  for (const item of items) {
    const numberMatch = item.match(/(?:^|\s)(\d+(?:\.\d+)?%?)(?:\s|$)/);
    if (!numberMatch) {
      continue;
    }
    const number = numberMatch[1];
    const label = item.replace(number, '').trim().replace(/[：:]\s*$/, '').trim() || compactText(shot?.title, 18);
    const normalizedLabel = label.length > 4 ? label.slice(0, 4) : label;
    if (seenLabels.has(normalizedLabel)) {
      continue;
    }
    seenLabels.add(normalizedLabel);
    results.push({label: normalizedLabel, number, accent: 'cyan'});
  }
  return results;
};

// ── quote-highlight ─────────────────────────────────────────────

const buildSceneSummary = (shot, primaryText, max = 40) => {
  const {semanticArray} = require('./text-utils.js');
  const displaySummary = getDisplaySummary(shot, shot?.visualSummaryZh);
  const text = [
    safeString(primaryText),
    displaySummary,
  ].filter(Boolean).join(' ');
  const sentences = text.split(/[。！？!?\n]/);
  const meaningfulSentences = sentences.filter((s) => {
    const trimmed = s.trim();
    if (trimmed.length <= 4) return false;
    // Filter out sentences that start with common discourse markers
    if (/^(?:不是|而是|所以|因此|评论|下期)/u.test(trimmed)) return false;
    return true;
  });
  const chosen = meaningfulSentences.length > 0
    ? meaningfulSentences[meaningfulSentences.length - 1]  // prefer concluding sentence
    : sentences.find((s) => s.trim().length > 4) || sentences[0] || '';
  return compactText(chosen, max);
};

// ── code ─────────────────────────────────────────────────────────

const buildCodeLines = (shot) => {
  const narrativeUnits = splitNarrationUnits(getDisplaySummary(shot, shot?.visualSummaryZh));
  const factSources = uList(
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
    if (facts.some((item) => isCompactDuplicateByKey(compactSimilarityKey(item.text), compactSimilarityKey(normalizedValue)))) {
      return;
    }
    factLabels.add(normalizedLabel);
    facts.push({label: normalizedLabel, text: `"${normalizedLabel}": ${JSON.stringify(normalizedValue)}`});
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
      pushFact('parallelTasks', summarizeParallelTasksEn(source));
    }
    if (/(?:跑分|基准|SWE-Bench|HLE|benchmark)/i.test(source)) {
      pushFact('benchmark', summarizeBenchmarkEn(source));
    }
  }
  const toolRole = summarizeToolRoleEn(factSources.join(' '));
  if (toolRole && !factLabels.has('scenario')) {
    pushFact('scenario', toolRole);
  }

  const heading = buildCodeHeading(shot, safeString(shot?.displayTitle || shot?.title));
  const filename = buildCodeFilename(shot);
  const summaryText = getDisplaySummary(shot, shot?.visualSummaryZh);
  const sentences = summaryText.split(/[。！？!?\n]/).filter(s => s.trim().length > 0);
  const lastSentence = sentences.length > 1 ? sentences[sentences.length - 1] : summaryText;
  const footer = compactText(lastSentence, 60);

  return {
    heading,
    filename,
    footer,
    lines: facts,
  };
};

// ── summarizers-en ──────────────────────────────────────────────

const formatEnglishCountUnit = (rawCount, singular, plural = `${singular}s`) => {
  const count = parseFloat(rawCount);
  if (Number.isNaN(count) || count === 1) {
    return `1 ${singular}`;
  }
  return `${Math.round(count)} ${plural}`;
};

const toEnglishMetricToken = (value) => {
  const text = safeString(value);
  const numberMatch = text.match(/(\d+(?:\.\d+)?)\s*(天|小时|分钟|秒|人|个|次|项)/);
  if (!numberMatch) {
    return text;
  }
  const number = numberMatch[1];
  const unit = numberMatch[2];
  const unitMap = {天: 'days', 小时: 'hours', 分钟: 'min', 秒: 'sec', 人: 'people', 个: 'items', 次: 'runs', 项: 'items'};
  const englishUnit = unitMap[unit] || unit;
  const parsed = parseFloat(number);
  if (parsed === 1) {
    return `1 ${englishUnit === 'days' ? 'day' : englishUnit.slice(0, -1)}`;
  }
  return `${Math.round(parsed)} ${englishUnit}`;
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
  return 'baseline was slow';
};

const summarizeResultEn = (source) => {
  const text = safeString(source);
  const savedDuration = extractNumberTokens(text).find((token) => /(?:天|小时|分钟)/.test(token));
  if (/1个人.*3个人/.test(text)) {
    return '3x output with same headcount';
  }
  if (/(?:节省|省下)\d+(?:\.\d+)?(?:人|个人力)/.test(text)) {
    return 'headcount reduced';
  }
  if (savedDuration) {
    return `cut ${toEnglishMetricToken(savedDuration)} off timeline`;
  }
  if (/持平|优于|同一档/.test(text)) {
    return 'matched or beat closed-source models';
  }
  if (/更稳|不断裂/.test(text)) {
    return 'much more stable under load';
  }
  return 'significant efficiency gain';
};

const summarizeToolRoleEn = (source) => {
  const text = safeString(source);
  if (/全栈开发者/.test(text)) {
    return 'full-stack developer';
  }
  if (/前端/.test(text)) {
    return 'frontend engineer';
  }
  if (/后端/.test(text)) {
    return 'backend engineer';
  }
  if (/算法/.test(text)) {
    return 'ML engineer';
  }
  if (/测试/.test(text)) {
    return 'QA engineer';
  }
  if (/运维/.test(text)) {
    return 'DevOps engineer';
  }
  if (/产品/.test(text)) {
    return 'product manager';
  }
  if (/文案|内容/.test(text)) {
    return 'content creator';
  }
  return '';
};

const summarizeParallelTasksEn = (source) => {
  const text = safeString(source);
  const agentMatch = text.match(/(\d+)\s*个?[子?]?[Aa]gent/);
  const agentCount = agentMatch ? parseInt(agentMatch[1], 10) : 0;
  if (agentCount >= 3) {
    return `${agentCount} parallel agents coordinated`;
  }
  if (/测试/.test(text) && /部署/.test(text)) {
    return 'test + deploy parallelized';
  }
  if (/代码|编程/.test(text) && /验证/.test(text)) {
    return 'code + verify parallelized';
  }
  return 'multi-agent parallel execution';
};

const summarizeBenchmarkEn = (source) => {
  const text = safeString(source);
  const numbers = extractNumberTokens(text).filter((t) => /%$/.test(t));
  if (numbers.length >= 2) {
    return `top scores in ${numbers.length} benchmarks`;
  }
  if (/SWE-Bench/.test(text)) {
    return 'SWE-Bench Pro benchmark';
  }
  if (/HLE/.test(text)) {
    return 'Humanity Last Exam benchmark';
  }
  return 'major benchmark evaluated';
};

const summarizeTakeawayEn = (source) => {
  const text = safeString(source);
  if (/不是.*参数|规模/.test(text)) {
    return 'scale is not the point';
  }
  if (/解决.*问题|真实/.test(text)) {
    return 'real problem solving matters';
  }
  if (/工作模式|工作方式/.test(text)) {
    return 'workflow transformed';
  }
  return 'capability milestone reached';
};

module.exports = {
  buildFeatureItems,
  buildStepItems,
  buildTimelineItems,
  buildTimelineLabel,
  buildStripHeading,
  buildStripItemLabel,
  buildStripItemDetail,
  buildStripItemLayout,
  inferStripTag,
  buildStripItems,
  inferCompareSideTitles,
  buildCompareRows,
  buildTagItems,
  buildEvidenceCards,
  buildArchitectureNodes,
  inferMetricLabel,
  metricPriority,
  buildMetricItems,
  inferRatioFromText,
  buildDataStreamItems,
  buildMemoryGraphNodes,
  buildPipelineStages,
  buildBenchmarkItems,
  buildSceneSummary,
  buildCodeLines,
  FEATURE_RAIL_HEADING_RULES,
  // re-export for extractors
  buildHeroHighlightWord,
  buildFeatureRailHeading,
  extractNumberTokens,
};
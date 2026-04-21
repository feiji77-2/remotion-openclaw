const fs = require('fs');

const PLAYBOOK_CACHE = new Map();

const STEP3_ANTI_AI_PROFILES = {
  natural: {
    label: '自然口播',
    openingPhrases: ['先说结论', '先把重点拎出来', '先别绕背景'],
    bridgePhrases: ['再看一个更硬的点', '换句话说', '再往下看'],
    closingPhrases: ['最后落一句', '最后把话收住', '最后给个结论'],
  },
  strong: {
    label: '强去 AI',
    openingPhrases: ['先把话说透', '这事我先讲死', '先抛判断'],
    bridgePhrases: ['你再往下看', '说白了', '更关键的是'],
    closingPhrases: ['最后别讲空话', '最后把路讲清', '最后就收这一句'],
  },
  max: {
    label: '极强拟人',
    openingPhrases: ['我先把结论摆这', '这事别先背概念', '真要讲先讲这个'],
    bridgePhrases: ['再补一句', '你听到这就知道了', '说到底'],
    closingPhrases: ['最后别兜圈子', '最后就压这一下', '最后把人带走'],
  },
};

const FALLBACK_PLAYBOOK = {
  rawSkill: '',
  promptTemplate: '',
  hook: {
    minChars: 20,
    maxChars: 40,
  },
  body: {
    minBlocks: 3,
    maxBlocks: 4,
    minSentences: 3,
    maxSentences: 5,
    sections: [
      {
        title: '震撼发布/背景',
        formula: '数字型公式',
        rules: ['发布时间+核心数据', '先把背景压缩成能留人的判断'],
      },
      {
        title: '具体能力（产品细节）',
        formula: '痛点解决公式',
        rules: ['用户痛点→解决方案', '至少带出 3 个具体功能点或结果'],
      },
      {
        title: '竞品对比',
        formula: '反常识公式',
        rules: ['明确差异化', '不要泛泛而谈'],
      },
      {
        title: '使用场景（案例）',
        formula: '情绪共鸣+数字公式',
        rules: ['至少 2 个具体场景', '什么人+做什么+得到什么结果'],
      },
    ],
  },
  targetChars: {
    min: 400,
    max: 550,
  },
  targetDurationSeconds: {
    min: 45,
    max: 60,
  },
  formulas: [
    {
      label: '悬念/反常识',
      purpose: '颠覆认知，让人想看下去',
      examples: ['千万别先讲背景', '你以为重点在表面，其实重点在另一层'],
    },
    {
      label: '情绪共鸣',
      purpose: '说出观众心里话',
      examples: ['很多人都卡在这一步', '真正难的是知道先讲什么'],
    },
    {
      label: '痛点解决',
      purpose: '直接给解决方案',
      examples: ['这个问题，先用 3 步讲清', '别空讲，直接给解法'],
    },
    {
      label: '强互动',
      purpose: '引导评论/点赞/关注',
      examples: ['评论区告诉我', '中招的扣 1'],
    },
  ],
  requiredElements: [
    {
      title: '产品细节',
      rules: ['具体功能点', '量化数据或结果'],
    },
    {
      title: '使用案例',
      rules: ['至少 2 个不同场景', '场景具体'],
    },
    {
      title: '竞品对比',
      rules: ['明确差异化', '不要空话'],
    },
  ],
  ctaPatterns: [
    {
      label: '互动型',
      examples: ['评论区告诉我XXX', '中招的扣1'],
    },
    {
      label: '关注型',
      examples: ['关注我，下期XXX'],
    },
    {
      label: '转发型',
      examples: ['觉得有用的转给XXX'],
    },
    {
      label: '问答型',
      examples: ['想了解XXX吗？下期讲'],
    },
  ],
  antiAi: {
    forbiddenPhrases: ['如果你', '可以说', '值得注意的是', '实际上', '大家好', '今天我们来', '以上就是', '感谢观看', '不只是', '更是'],
    bannedOpeners: ['大家好', '今天我们来', '如果你'],
    bannedClosers: ['以上就是', '感谢观看'],
    stylePrinciples: ['短句', '口语', '像跟朋友聊天', '用事实替代空话'],
    rewriteRules: ['删除废话开场', '用具体事实替代泛词', '避免长句和书面腔'],
  },
};

function safeString(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

function uniqueStrings(items) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => safeString(item)).filter(Boolean))];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function compactClause(value, maxLength = 58) {
  const safe = safeString(value)
    .replace(/\s+/g, ' ')
    .replace(/[。！？]+/g, '。');
  if (!safe) {
    return '';
  }

  const firstClause = safe.split(/[。！？；\n]/)[0]?.trim() || safe;
  if (firstClause.length <= maxLength) {
    return firstClause;
  }
  return `${firstClause.slice(0, maxLength - 1).trim()}…`;
}

function joinSentences(sentences) {
  return (Array.isArray(sentences) ? sentences : [])
    .map((item) => safeString(item))
    .filter(Boolean)
    .join('');
}

function splitInstructionTerms(text) {
  return uniqueStrings(
    safeString(text)
      .split(/[，,、；;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2),
  );
}

function extractDurationSeconds(text) {
  const safe = safeString(text);
  if (!safe) return null;

  const minuteMatch = safe.match(/(\d+(?:\.\d+)?)\s*分(?:钟)?/);
  if (minuteMatch) {
    return round(Number(minuteMatch[1]) * 60);
  }

  const secondMatch = safe.match(/(\d+(?:\.\d+)?)\s*秒/);
  if (secondMatch) {
    return round(secondMatch[1]);
  }

  return null;
}

function extractWordCount(text) {
  const safe = safeString(text);
  if (!safe) return null;

  const rangeMatch = safe.match(/(\d+)\s*[-~到至]\s*(\d+)\s*字/);
  if (rangeMatch) {
    return round((Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2);
  }

  const exactMatch = safe.match(/(\d+)\s*字/);
  if (exactMatch) {
    return round(exactMatch[1]);
  }

  return null;
}

function toRoundedPositiveNumber(value, fallback = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return round(parsed);
}

function measureCopyLength(copy) {
  return [
    safeString(copy?.hook),
    ...(Array.isArray(copy?.body) ? copy.body.map((item) => safeString(item?.text)) : []),
    safeString(copy?.cta),
  ].join('').length;
}

function compressTextToBudget(text, budget) {
  const safe = safeString(text);
  if (!safe || safe.length <= budget) {
    return safe;
  }

  const sentences = safe.match(/[^。！？]+[。！？]?/g) || [safe];
  let result = '';
  for (const sentence of sentences) {
    if ((result + sentence).length > budget && result) {
      break;
    }
    result += sentence;
    if (result.length >= budget) {
      break;
    }
  }

  const trimmed = safeString(result);
  if (!trimmed) {
    return compactClause(safe, budget);
  }
  return trimmed.length > budget ? compactClause(trimmed, budget) : trimmed;
}

function extractSection(raw, startMarker, endMarkers = []) {
  const safe = String(raw || '');
  const startIndex = safe.indexOf(startMarker);
  if (startIndex === -1) {
    return '';
  }

  const contentStart = safe.indexOf('\n', startIndex);
  const sliceStart = contentStart === -1 ? startIndex + startMarker.length : contentStart + 1;
  let endIndex = safe.length;

  for (const marker of endMarkers) {
    const nextIndex = safe.indexOf(marker, sliceStart);
    if (nextIndex !== -1 && nextIndex < endIndex) {
      endIndex = nextIndex;
    }
  }

  return safe.slice(sliceStart, endIndex).trim();
}

function extractCodeBlockAfter(raw, marker) {
  const safe = String(raw || '');
  const markerIndex = safe.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  const fenced = safe.slice(markerIndex).match(/```(?:json)?\s*([\s\S]*?)```/i);
  return safeString(fenced?.[1] || '');
}

function parseQuotedTerms(text) {
  const matches = [];
  const regex = /[“"]([^”"]+)[”"]/g;
  let match = regex.exec(String(text || ''));
  while (match) {
    matches.push(match[1]);
    match = regex.exec(String(text || ''));
  }

  return uniqueStrings(matches.map((item) => item.replace(/XXX/g, '').replace(/\.\.\./g, '').trim()));
}

function parseRange(text, regex, fallback) {
  const match = String(text || '').match(regex);
  if (!match) {
    return fallback;
  }

  return {
    min: round(match[1]),
    max: round(match[2]),
  };
}

function parseBodyRange(text) {
  const match = String(text || '').match(/Body[（(](\d+)\s*-\s*(\d+)块，每块(\d+)\s*-\s*(\d+)句[)）]/);
  if (!match) {
    return clone(FALLBACK_PLAYBOOK.body);
  }

  return {
    ...clone(FALLBACK_PLAYBOOK.body),
    minBlocks: round(match[1]),
    maxBlocks: round(match[2]),
    minSentences: round(match[3]),
    maxSentences: round(match[4]),
  };
}

function parseBulletLines(section) {
  return uniqueStrings(
    String(section || '')
      .split('\n')
      .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
      .filter((line) => Boolean(line) && !/^\|/.test(line)),
  );
}

function parseFormulas(section) {
  const lines = String(section || '').split('\n');
  const formulas = [];
  let current = null;

  for (const line of lines) {
    const formulaMatch = line.match(/^\s*\d+\.\s*([^：:]+)[：:]\s*(.+)$/);
    if (formulaMatch) {
      if (current) formulas.push(current);
      current = {
        label: safeString(formulaMatch[1]),
        purpose: safeString(formulaMatch[2]),
        examples: [],
      };
      continue;
    }

    if (current && /例/.test(line)) {
      current.examples = parseQuotedTerms(line);
    }
  }

  if (current) {
    formulas.push(current);
  }

  return formulas.length > 0 ? formulas : clone(FALLBACK_PLAYBOOK.formulas);
}

function parseBodySections(section) {
  const lines = String(section || '').split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const titleMatch = line.match(/^\s*\*\*块\d+[：:]\s*(.+?)\*\*\s*$/);
    if (titleMatch) {
      if (current) sections.push(current);
      current = {
        title: safeString(titleMatch[1]),
        formula: '',
        rules: [],
      };
      continue;
    }

    const rule = safeString(line.replace(/^\s*[-*]\s*/, ''));
    if (!current || !rule) {
      continue;
    }

    if (!current.formula && /^用/.test(rule)) {
      current.formula = rule.replace(/^用/, '').replace(/：?$/, '').trim();
    }
    current.rules.push(rule);
  }

  if (current) {
    sections.push(current);
  }

  return sections.length > 0 ? sections : clone(FALLBACK_PLAYBOOK.body.sections);
}

function parseStructuredList(section, headingRegex) {
  const lines = String(section || '').split('\n');
  const items = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(headingRegex);
    if (headingMatch) {
      if (current) items.push(current);
      current = {
        title: safeString(headingMatch[1]),
        rules: [],
      };
      continue;
    }

    const rule = safeString(line.replace(/^\s*[-*]\s*/, ''));
    if (!current || !rule || /^\|/.test(rule)) {
      continue;
    }
    current.rules.push(rule);
  }

  if (current) {
    items.push(current);
  }

  return items;
}

function parseCtaPatterns(section) {
  const lines = String(section || '').split('\n');
  const patterns = [];

  for (const line of lines) {
    const match = line.match(/^\s*-\s*([^：:]+)[：:](.+)$/);
    if (!match) continue;
    patterns.push({
      label: safeString(match[1]),
      examples: parseQuotedTerms(match[2]),
    });
  }

  return patterns.length > 0 ? patterns : clone(FALLBACK_PLAYBOOK.ctaPatterns);
}

function parseAntiAi(section, notesSection) {
  const styleBlock = extractSection(section, '**人话说出来检查法：**', []);
  const terms = parseQuotedTerms(`${section}\n${notesSection}`);
  const forbiddenPhrases = uniqueStrings([
    ...terms,
    ...parseQuotedTerms(notesSection),
  ]).filter((item) => item.length >= 2);

  return {
    forbiddenPhrases: forbiddenPhrases.length > 0 ? forbiddenPhrases : clone(FALLBACK_PLAYBOOK.antiAi.forbiddenPhrases),
    bannedOpeners: uniqueStrings(forbiddenPhrases.filter((item) => /大家好|今天我们来|如果你/.test(item))).length > 0
      ? uniqueStrings(forbiddenPhrases.filter((item) => /大家好|今天我们来|如果你/.test(item)))
      : clone(FALLBACK_PLAYBOOK.antiAi.bannedOpeners),
    bannedClosers: uniqueStrings(forbiddenPhrases.filter((item) => /以上就是|感谢观看/.test(item))).length > 0
      ? uniqueStrings(forbiddenPhrases.filter((item) => /以上就是|感谢观看/.test(item)))
      : clone(FALLBACK_PLAYBOOK.antiAi.bannedClosers),
    stylePrinciples: parseBulletLines(styleBlock).length > 0
      ? parseBulletLines(styleBlock)
      : clone(FALLBACK_PLAYBOOK.antiAi.stylePrinciples),
    rewriteRules: parseBulletLines(section).length > 0
      ? parseBulletLines(section)
      : clone(FALLBACK_PLAYBOOK.antiAi.rewriteRules),
  };
}

function parsePlaybook(raw) {
  const safeRaw = String(raw || '');
  const formulasSection = extractSection(safeRaw, '## 抖音爆款4大底层公式', ['## 内容结构要求']);
  const bodySection = extractSection(safeRaw, '### Body', ['## 必须包含的三要素']);
  const requiredElementsSection = extractSection(safeRaw, '## 必须包含的三要素', ['## CTA 强引导公式']);
  const ctaSection = extractSection(safeRaw, '## CTA 强引导公式', ['## 输出格式', '目标字数：']);
  const antiAiSection = extractSection(safeRaw, '## 去AI味核心原则', ['## 注意事项']);
  const notesSection = extractSection(safeRaw, '## 注意事项', []);

  const targetChars = parseRange(safeRaw, /目标字数[：:]\s*(\d+)\s*-\s*(\d+)\s*字/, clone(FALLBACK_PLAYBOOK.targetChars));
  const targetDurationSeconds = parseRange(safeRaw, /[（(](\d+)\s*-\s*(\d+)秒口播[)）]/, clone(FALLBACK_PLAYBOOK.targetDurationSeconds));
  const hook = parseRange(safeRaw, /Hook[（(][^0-9]*(\d+)\s*-\s*(\d+)字[)）]/, clone(FALLBACK_PLAYBOOK.hook));
  const body = parseBodyRange(safeRaw);
  body.sections = parseBodySections(bodySection);

  const durationMid = Math.max(1, Math.round((targetDurationSeconds.min + targetDurationSeconds.max) / 2));
  const charsMid = Math.max(80, Math.round((targetChars.min + targetChars.max) / 2));

  return {
    rawSkill: safeRaw,
    promptTemplate: extractCodeBlockAfter(safeRaw, '## 内容生成 Prompt 模板'),
    hook,
    body,
    targetChars,
    targetDurationSeconds,
    normalCharsPerSecond: Number((charsMid / durationMid).toFixed(2)) || 3.5,
    formulas: parseFormulas(formulasSection),
    requiredElements: parseStructuredList(requiredElementsSection, /^\s*###\s*\d+\.\s*(.+)$/).length > 0
      ? parseStructuredList(requiredElementsSection, /^\s*###\s*\d+\.\s*(.+)$/)
      : clone(FALLBACK_PLAYBOOK.requiredElements),
    ctaPatterns: parseCtaPatterns(ctaSection),
    antiAi: parseAntiAi(antiAiSection, notesSection),
  };
}

function getStep3SkillPlaybook(skillSpec) {
  const sourcePath = safeString(skillSpec?.sourcePath);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return clone(FALLBACK_PLAYBOOK);
  }

  const stats = fs.statSync(sourcePath);
  const cached = PLAYBOOK_CACHE.get(sourcePath);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return clone(cached.playbook);
  }

  const raw = fs.readFileSync(sourcePath, 'utf8');
  const playbook = parsePlaybook(raw);
  PLAYBOOK_CACHE.set(sourcePath, {
    mtimeMs: stats.mtimeMs,
    playbook,
  });

  return clone(playbook);
}

function getRequirements(context) {
  const requirements = context?.pipeline?.copy?.requirements && typeof context.pipeline.copy.requirements === 'object'
    ? context.pipeline.copy.requirements
    : {};

  return {
    focus: safeString(requirements.focus),
    avoid: safeString(requirements.avoid),
    style: safeString(requirements.style),
    length: safeString(requirements.length),
  };
}

function getCurrentStepSkill(context) {
  const current = context?.pipeline?.currentStepSkill && typeof context.pipeline.currentStepSkill === 'object'
    ? context.pipeline.currentStepSkill
    : {};

  return {
    goal: safeString(current.goal),
    style: safeString(current.style),
    emphasis: safeString(current.emphasis),
    avoid: safeString(current.avoid),
    notes: safeString(current.notes),
    targetDurationSeconds: toRoundedPositiveNumber(current.targetDurationSeconds, null),
    targetWordCount: toRoundedPositiveNumber(current.targetWordCount, null),
    antiAiLevel: ['natural', 'strong', 'max'].includes(safeString(current.antiAiLevel))
      ? safeString(current.antiAiLevel)
      : 'strong',
    spokenPersona: safeString(current.spokenPersona),
  };
}

function getVariant(context, total) {
  const attempt = Math.max(0, Number(context?.generation?.attempt || 0));
  return attempt % Math.max(1, total || 1);
}

function getAnalysisSource(context) {
  return context?.pipeline?.selectedAnalysis || context?.pipeline?.analysis || {};
}

function getSelectedTitle(context) {
  return context?.pipeline?.selectedTitle || {};
}

function matchFirst(text, patterns) {
  const safe = safeString(text);
  for (const pattern of patterns) {
    const match = safe.match(pattern);
    if (match?.[0]) {
      return safeString(match[0].replace(/\s+/g, ' '));
    }
  }
  return '';
}

function buildContextCorpus(context) {
  const analysis = getAnalysisSource(context);
  const selectedTitle = getSelectedTitle(context);
  const searchResults = Array.isArray(context?.pipeline?.topicResearch?.results)
    ? context.pipeline.topicResearch.results
    : [];

  return [
    safeString(context?.topic?.query),
    safeString(selectedTitle?.title),
    safeString(selectedTitle?.rationale),
    safeString(analysis?.thesis),
    safeString(analysis?.corePromise),
    safeString(analysis?.audience),
    ...searchResults.flatMap((item) => [
      safeString(item?.title),
      safeString(item?.snippet),
    ]),
  ].filter(Boolean).join(' ');
}

function getTopicEntity(context) {
  const corpus = buildContextCorpus(context);

  return matchFirst(corpus, [
    /\bKimi\s*K\d+(?:\.\d+)?\b/i,
    /\bDeepSeek(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bClaude(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGemini(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGPT(?:[- ]?\d+(?:\.\d+)?)?\b/i,
  ]);
}

function getCompetitorLabel(context) {
  const entity = safeString(getTopicEntity(context)).toLowerCase();
  const corpus = buildContextCorpus(context);
  const candidates = [
    /\bGPT(?:[- ]?\d+(?:\.\d+)?)?\b/i,
    /\bClaude(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGemini(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bDeepSeek(?:\s*[A-Za-z0-9.+-]+)?\b/i,
  ];

  for (const pattern of candidates) {
    const match = matchFirst(corpus, [pattern]);
    if (match && safeString(match).toLowerCase() !== entity) {
      return match;
    }
  }

  return '';
}

function cleanTopicLabel(value) {
  const safe = safeString(value)
    .replace(/[“”"'‘’]/g, '')
    .replace(/[！？?!。]+$/g, '')
    .replace(/\s+/g, ' ');

  if (!safe) {
    return '';
  }

  const trimmed = safe
    .replace(/^(国产AI|国产大模型|开源王炸|王炸|重磅|最新发布)[：:，,\s]*/i, '')
    .replace(/[？?].*$/g, '')
    .trim();

  return compactClause(trimmed || safe, 28);
}

function getTopicLabel(context) {
  const entity = getTopicEntity(context);
  if (entity) {
    return entity;
  }

  const selectedTitle = getSelectedTitle(context);
  const selectedLabel = cleanTopicLabel(selectedTitle?.title);
  if (selectedLabel) {
    return selectedLabel;
  }

  return cleanTopicLabel(context?.topic?.query) || '当前主题';
}

function pickFactByKeywords(facts, keywords, fallbackIndex = 0, fallback = '') {
  const normalizedKeywords = (Array.isArray(keywords) ? keywords : [])
    .map((item) => safeString(item).toLowerCase())
    .filter(Boolean);
  const pool = Array.isArray(facts) ? facts : [];

  for (const item of pool) {
    const haystack = `${safeString(item?.fact)} ${safeString(item?.evidenceAnchor)} ${safeString(item?.sourceTitle)}`.toLowerCase();
    if (normalizedKeywords.some((keyword) => haystack.includes(keyword))) {
      return compactClause(item?.fact, 64);
    }
  }

  return pickFact(pool, fallbackIndex, fallback);
}

function getFacts(context) {
  const analysis = getAnalysisSource(context);
  const researchFacts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const topicResearch = Array.isArray(context?.pipeline?.topicResearch?.results) ? context.pipeline.topicResearch.results : [];

  const normalizedResearch = researchFacts.map((item, index) => ({
    label: safeString(item?.label || `事实 ${index + 1}`),
    fact: safeString(item?.fact),
    evidenceAnchor: safeString(item?.evidenceAnchor || item?.sourceTitle),
    sourceTitle: safeString(item?.sourceTitle),
  }));
  const normalizedSearch = topicResearch.map((item, index) => ({
    label: safeString(item?.title || `搜索结果 ${index + 1}`),
    fact: compactClause(item?.snippet || item?.title, 56),
    evidenceAnchor: safeString(item?.publishedAt ? `${item.title || ''} · ${item.publishedAt}` : item?.title),
    sourceTitle: safeString(item?.title),
  }));

  const merged = [];
  const seen = new Set();
  for (const item of normalizedResearch.concat(normalizedSearch)) {
    const key = `${item.fact}::${item.evidenceAnchor}`;
    if (!item.fact || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  if (merged.length > 0) {
    return merged.slice(0, 6);
  }

  const layers = Array.isArray(analysis?.layers) ? analysis.layers : [];
  return layers.slice(0, 4).map((item, index) => ({
    label: safeString(item?.label || `线索 ${index + 1}`),
    fact: compactClause(item?.insight || item?.evidence, 56),
    evidenceAnchor: safeString(item?.evidence || item?.label),
    sourceTitle: safeString(item?.label),
  }));
}

function pickProfile(level) {
  return STEP3_ANTI_AI_PROFILES[level] || STEP3_ANTI_AI_PROFILES.strong;
}

function averageRange(range, fallback) {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    return fallback;
  }
  return round((range.min + range.max) / 2);
}

function getControls(context, playbook) {
  const requirements = getRequirements(context);
  const skill = getCurrentStepSkill(context);
  const defaultDuration = averageRange(playbook.targetDurationSeconds, 60);
  const defaultWordCount = averageRange(playbook.targetChars, Math.round(defaultDuration * (playbook.normalCharsPerSecond || 3.5)));
  const targetDurationSeconds = clamp(
    toRoundedPositiveNumber(
      skill.targetDurationSeconds,
      extractDurationSeconds(requirements.length) || defaultDuration,
    ),
    15,
    240,
  );
  const targetWordCount = clamp(
    toRoundedPositiveNumber(
      skill.targetWordCount,
      extractWordCount(requirements.length) || Math.round(targetDurationSeconds * (playbook.normalCharsPerSecond || 3.5)),
    ),
    80,
    1200,
  );
  const antiAiLevel = skill.antiAiLevel || 'strong';
  const spokenPersona = skill.spokenPersona
    || (antiAiLevel === 'max'
      ? '像真人对着你直接讲，不背稿，不端着。'
      : '像真人口播，在说重点，不是在写报告。');
  const prefersFullStructure = targetDurationSeconds >= playbook.targetDurationSeconds.min || targetWordCount >= playbook.targetChars.min;
  const sectionCount = clamp(
    prefersFullStructure ? playbook.body.maxBlocks : playbook.body.minBlocks,
    playbook.body.minBlocks,
    playbook.body.maxBlocks,
  );

  return {
    rawSkill: skill,
    requirements,
    targetDurationSeconds,
    targetWordCount,
    antiAiLevel,
    spokenPersona,
    profile: pickProfile(antiAiLevel),
    sectionCount,
    detailLevel: targetWordCount >= 520 ? 3 : targetWordCount >= 340 ? 2 : 1,
    variant: getVariant(context, Math.max(playbook.formulas.length, playbook.ctaPatterns.length, 4)),
    avoidTerms: uniqueStrings([
      ...splitInstructionTerms(skill.avoid),
      ...splitInstructionTerms(requirements.avoid),
      ...(playbook.antiAi?.forbiddenPhrases || []),
    ]),
  };
}

function buildFocusLine(context) {
  const analysis = getAnalysisSource(context);
  const requirements = getRequirements(context);
  const skill = getCurrentStepSkill(context);
  const facts = getFacts(context);
  const combinedFacts = facts.map((item) => safeString(item?.fact)).join(' ');
  const competitor = getCompetitorLabel(context);

  if (/[开源]/.test(combinedFacts) && /代码|编码/.test(combinedFacts)) {
    return '开源路线和代码能力';
  }
  if (/(Agent|子 Agent|集群)/i.test(combinedFacts) && /代码|编码/.test(combinedFacts)) {
    return '代码能力和 Agent 集群';
  }
  if (competitor && /持平|优于|对标/.test(combinedFacts)) {
    return `${safeString(competitor)} 正面对比`;
  }

  return compactClause(
    requirements.focus
    || skill.emphasis
    || skill.goal
    || analysis?.corePromise
    || analysis?.thesis
    || context?.topic?.query
    || '当前主题',
    42,
  );
}

function summarizeAudience(context) {
  const analysis = getAnalysisSource(context);
  return compactClause(
    analysis?.analysisBrief?.audienceFocus
    || analysis?.audience
    || '想快速看懂这件事、又不想听空话的人',
    40,
  );
}

function pickBodySections(playbook, sectionCount) {
  const sections = Array.isArray(playbook.body?.sections) && playbook.body.sections.length > 0
    ? playbook.body.sections
    : clone(FALLBACK_PLAYBOOK.body.sections);

  if (sectionCount >= sections.length) {
    return sections.slice(0, sectionCount);
  }

  if (sectionCount === 3 && sections.length >= 4) {
    return [
      sections[0],
      sections[1],
      {
        title: `${sections[2].title} / ${sections[3].title}`,
        formula: `${sections[2].formula} + ${sections[3].formula}`,
        rules: [...sections[2].rules, ...sections[3].rules],
      },
    ];
  }

  return sections.slice(0, sectionCount);
}

function pickFact(facts, index, fallback) {
  return compactClause(facts[index]?.fact || fallback, 52);
}

function pickEvidence(facts, index, fallback) {
  return safeString(facts[index]?.evidenceAnchor || facts[index]?.sourceTitle || fallback);
}

function pickFormula(playbook, index) {
  const formulas = Array.isArray(playbook.formulas) && playbook.formulas.length > 0
    ? playbook.formulas
    : clone(FALLBACK_PLAYBOOK.formulas);
  return formulas[index % formulas.length];
}

function pickCtaPattern(playbook, index) {
  const patterns = Array.isArray(playbook.ctaPatterns) && playbook.ctaPatterns.length > 0
    ? playbook.ctaPatterns
    : clone(FALLBACK_PLAYBOOK.ctaPatterns);
  return patterns[index % patterns.length];
}

function sanitizeText(text, controls, playbook, topicLabel) {
  let safe = safeString(text);
  for (const term of controls.avoidTerms || []) {
    if (!term || term === topicLabel) {
      continue;
    }
    safe = safe.replaceAll(term, '');
  }
  for (const opener of playbook.antiAi?.bannedOpeners || []) {
    if (safe.startsWith(opener)) {
      safe = safe.slice(opener.length).trim();
    }
  }
  for (const closer of playbook.antiAi?.bannedClosers || []) {
    safe = safe.replaceAll(closer, '');
  }
  return safe
    .replace(/\s+/g, ' ')
    .replace(/，，+/g, '，')
    .replace(/。。+/g, '。')
    .trim();
}

function buildToneText(context, controls, playbook) {
  const styleSeed = compactClause(
    controls.requirements.style
    || controls.rawSkill.style
    || (playbook.antiAi?.stylePrinciples || []).slice(0, 3).join('，')
    || '短句、口语、结论先行',
    40,
  );

  return `${controls.profile.label}，${controls.spokenPersona}${styleSeed ? ` ${styleSeed}` : ''}`.trim();
}

function buildMainClaim(context) {
  const analysis = getAnalysisSource(context);
  const selectedTitle = getSelectedTitle(context);
  const topicLabel = getTopicLabel(context);
  const competitor = getCompetitorLabel(context);

  return compactClause(
    analysis?.thesis
    || analysis?.corePromise
    || selectedTitle?.rationale
    || (competitor
      ? `${topicLabel} 这次最值得讲的，是它开始正面给 ${competitor} 压力`
      : `${topicLabel} 真正该先讲的是为什么值得看`),
    46,
  );
}

function buildComparisonLine(topicLabel, focusLine) {
  return compactClause(
    `和那种只堆概念、只补背景的讲法比，这次更该把重点压在${focusLine || topicLabel}这条线上。`,
    52,
  );
}

function buildBrief(context, playbook) {
  const selectedTitle = getSelectedTitle(context);
  const facts = getFacts(context);
  const controls = getControls(context, playbook);
  const bodySections = pickBodySections(playbook, controls.sectionCount);
  const formula = pickFormula(playbook, controls.variant);
  const focusLine = buildFocusLine(context);
  const mainClaim = buildMainClaim(context);
  const audienceLine = summarizeAudience(context);
  const ctaPattern = pickCtaPattern(playbook, controls.variant);

  const outline = bodySections.map((section, index) => ({
    label: safeString(section.title || `正文块 ${index + 1}`),
    beat: safeString(
      index === 0
        ? `${formula.label}起手，先把「${safeString(context?.topic?.query || selectedTitle?.title || '当前主题')}」最值得听的判断抛出来，再带出背景和数据线索。`
        : `用${safeString(section.formula || formula.label)}把「${section.title}」这块讲透，别空讲，必须落到具体事实和结果。`,
    ),
    goal: safeString(
      index === 0
        ? `前 3 秒先抓住 ${audienceLine}，不铺垫。`
        : section.title.includes('产品细节')
          ? '至少讲出 3 个具体能力、功能点或执行结果。'
          : section.title.includes('竞品')
            ? '明确和同类产品/传统讲法的核心差异。'
            : section.title.includes('案例') || section.title.includes('场景')
              ? '给至少 2 个可代入的具体场景。'
              : '让这一块的信息比上一块更具体、更有画面感。',
    ),
    evidenceAnchor: pickEvidence(facts, index, selectedTitle?.evidenceAnchor || mainClaim),
  }));

  return {
    brief: {
      hookAngle: `围绕「${selectedTitle?.angle || '当前标题角度'}」切口，按${formula.label}起钩，先抛判断，再把产品细节、竞品差异和使用场景串起来。`,
      tone: buildToneText(context, controls, playbook),
      pacing: `${controls.targetDurationSeconds} 秒口播，约 ${controls.targetWordCount} 字，按 skill 要求拆成 ${controls.sectionCount} 块正文，每块 ${playbook.body.minSentences}-${playbook.body.maxSentences} 句，前 3 秒先抓人。`,
      ctaIntent: `结尾用${ctaPattern.label || '互动型'} CTA，把观众带进评论、关注或转发动作，同时让人记住「${mainClaim}」这条判断。`,
    },
    outline,
  };
}

function buildHookText(context, playbook, controls, mainClaim, focusLine) {
  const topicLabel = getTopicLabel(context);
  const formula = pickFormula(playbook, controls.variant);
  const templates = [
    `别把「${topicLabel}」当普通介绍，真正该先讲的是：${mainClaim}。`,
    `很多人讲「${topicLabel}」都先讲慢了，真正该先抓的是${focusLine || mainClaim}。`,
    `「${topicLabel}」到底怎么讲才不空？先把${focusLine || mainClaim}这一下讲透。`,
    `我先给你个判断：${mainClaim}，你再决定这条值不值得继续看。`,
  ];

  let hook = templates[controls.variant % templates.length];
  if (/情绪/.test(formula.label)) {
    hook = `很多人卡在「${topicLabel}」上，不是不会看，是没先抓住${focusLine || mainClaim}。`;
  }
  if (/痛点/.test(formula.label)) {
    hook = `「${topicLabel}」别再空讲了，先把${focusLine || mainClaim}讲清。`;
  }
  if (/互动/.test(formula.label)) {
    hook = `先记一句：${mainClaim}。你听完再看，这条是不是比普通讲法更值钱。`;
  }

  hook = sanitizeText(hook, controls, playbook, topicLabel);
  return compressTextToBudget(hook, playbook.hook.maxChars);
}

function buildBackgroundBlock(context, controls, playbook, mainClaim, facts) {
  const topicLabel = getTopicLabel(context);
  const releaseFact = pickFactByKeywords(
    facts,
    ['发布', '开源', '升级', '旗舰'],
    0,
    `${topicLabel} 这次不是喊口号，是正式发布并开源`,
  );
  const benchmarkFact = pickFactByKeywords(
    facts,
    ['持平', '优于', 'gpt', 'benchmark', 'bench', '考试'],
    2,
    `${topicLabel} 已经被拿去和顶级模型正面对比`,
  );

  return joinSentences([
    `${controls.profile.openingPhrases[controls.variant % controls.profile.openingPhrases.length]}，${releaseFact}。`,
    `更硬的点在后面，${benchmarkFact}。`,
    `所以这条内容别先铺背景，直接把判断压到前面：${mainClaim}。`,
  ]);
}

function buildCapabilityBlock(context, controls, playbook, focusLine, facts) {
  const topicLabel = getTopicLabel(context);
  const capabilityFact = pickFactByKeywords(
    facts,
    ['13', '4000', '300', 'agent', '代码', '编码'],
    1,
    `${topicLabel} 这次把长程编码、代码修改和多 Agent 协作一起拉上来了`,
  );
  const productFact = pickFactByKeywords(
    facts,
    ['技能', '实测', '场景', '效率', '开发者', '视觉理解'],
    3,
    `开发者真正在乎的，是它能不能把复杂任务拆完还能接得住`,
  );

  return joinSentences([
    `具体能力别讲空话，得直接落到“它能帮你做什么”。`,
    `先看最硬的一层，${capabilityFact}。`,
    `再往执行里落，${productFact}。`,
    `所以它值钱的地方不是参数好看，而是围着${focusLine || topicLabel}这条主线，真能帮你少试错、少返工。`,
  ]);
}

function buildComparisonBlock(context, controls, playbook, mainClaim, focusLine, facts) {
  const topicLabel = getTopicLabel(context);
  const competitor = getCompetitorLabel(context) || '同类闭源模型';
  const benchmarkFact = pickFactByKeywords(
    facts,
    ['持平', '优于', 'gpt', 'claude', 'gemini', 'benchmark', 'bench'],
    2,
    `${topicLabel} 已经能和顶级闭源模型摆到一张表上比`,
  );

  return joinSentences([
    `很多人一说国产模型就默认比 ${competitor} 弱，这个判断现在该改了。`,
    `${benchmarkFact}。`,
    `说白了，真正能拉开差异的，不是喊一句“国产也很强”，而是把${mainClaim}这条判断拿事实顶住。`,
    `别人还在讲概念的时候，这里已经能把${focusLine || topicLabel}放到结果层去比了。`,
  ]);
}

function buildScenarioBlock(context, controls, playbook, focusLine, mainClaim, facts) {
  const topicLabel = getTopicLabel(context);
  const audienceLine = summarizeAudience(context);
  const scenarioFact = pickFactByKeywords(
    facts,
    ['开发者', '场景', '技能', 'agent', '协作者', '实测'],
    3,
    `${mainClaim} 这条判断放到真实开发和协作场景里更有感觉`,
  );

  return joinSentences([
    `真到使用场景里，${audienceLine}最先要的不是背景，而是${focusLine || mainClaim}。`,
    `比如做内容的人，要在几十秒里讲清「${topicLabel}」，就会先拿这条判断做开场，再补事实和案例。`,
    `再比如做开发和执行的人，更在乎结果，所以他最先想知道的，是这件事到底能不能少走弯路、快一点看到差异。`,
    `而且${scenarioFact}。`,
  ]);
}

function buildMergedBlock(context, controls, playbook, mainClaim, focusLine, facts) {
  const comparisonLine = buildComparisonBlock(context, controls, playbook, mainClaim, focusLine, facts);
  const scenarioLine = buildScenarioBlock(context, controls, playbook, focusLine, mainClaim, facts);
  return joinSentences([
    comparisonLine,
    scenarioLine,
  ]);
}

function buildBodyBlocks(context, playbook, controls, mainClaim, focusLine, facts) {
  const sections = pickBodySections(playbook, controls.sectionCount);
  return sections.map((section, index) => {
    const title = safeString(section.title || `正文块 ${index + 1}`);
    let text = '';

    if (/背景|发布/.test(title)) {
      text = buildBackgroundBlock(context, controls, playbook, mainClaim, facts);
    } else if (/产品细节|具体能力/.test(title)) {
      text = buildCapabilityBlock(context, controls, playbook, focusLine, facts);
    } else if (/竞品/.test(title) && /场景|案例/.test(title)) {
      text = buildMergedBlock(context, controls, playbook, mainClaim, focusLine, facts);
    } else if (/竞品/.test(title)) {
      text = buildComparisonBlock(context, controls, playbook, mainClaim, focusLine, facts);
    } else if (/场景|案例/.test(title)) {
      text = buildScenarioBlock(context, controls, playbook, focusLine, mainClaim, facts);
    } else {
      text = joinSentences([
        `${controls.profile.bridgePhrases[index % controls.profile.bridgePhrases.length]}，先把这一块讲具体。`,
        `${pickFact(facts, index, focusLine || mainClaim)}。`,
        `别空讲，直接让观众知道它和自己有什么关系。`,
      ]);
    }

    return {
      label: title,
      text: sanitizeText(text, controls, playbook, getTopicLabel(context)),
    };
  });
}

function buildCtaText(context, playbook, controls, mainClaim) {
  const topicLabel = getTopicLabel(context);
  const pattern = pickCtaPattern(playbook, controls.variant);

  if (/关注/.test(pattern.label)) {
    return `如果你想继续把「${topicLabel}」讲透，先记住这条判断：${mainClaim}。关注我，下一条我继续往更具体的案例和动作里拆。`;
  }
  if (/转发/.test(pattern.label)) {
    return `这条如果对你有用，转给也在盯着「${topicLabel}」的人。别只停在标题上，真正值钱的是${mainClaim}这一下。`;
  }
  if (/问答/.test(pattern.label)) {
    return `你最想继续看「${topicLabel}」的哪一层？评论区留一句，我下一条就按你最关心的问题继续拆。`;
  }

  return `评论区告诉我，你现在最想继续看「${topicLabel}」的哪一层。要是你也认同${mainClaim}这条判断，就把你卡住的点直接丢过来。`;
}

function buildCopy(context, briefStagePayload, playbook) {
  const controls = getControls(context, playbook);
  const facts = getFacts(context);
  const focusLine = buildFocusLine(context);
  const mainClaim = buildMainClaim(context);
  const topicLabel = getTopicLabel(context);
  const competitor = getCompetitorLabel(context);

  const copy = {
    hook: buildHookText(context, playbook, controls, mainClaim, focusLine),
    body: buildBodyBlocks(context, playbook, controls, mainClaim, focusLine, facts),
    cta: sanitizeText(buildCtaText(context, playbook, controls, mainClaim), controls, playbook, topicLabel),
  };

  const minTargetLength = Math.round(controls.targetWordCount * 0.9);
  const maxTargetLength = Math.round(controls.targetWordCount * 1.1);
  let currentLength = measureCopyLength(copy);

  const expansionPool = uniqueStrings([
    pickFactByKeywords(facts, ['13', '4000', '300', 'agent', '代码'], 1, `${topicLabel} 这次把关键能力全摆上桌了。`),
    pickFactByKeywords(facts, ['持平', '优于', 'gpt', 'claude', 'gemini', 'benchmark'], 2, `${topicLabel} 现在已经能和顶级模型正面对比。`),
    pickFactByKeywords(facts, ['开源', '发布', '旗舰'], 0, `${topicLabel} 这次不是试水，是正式把能力放出来。`),
    competitor ? `${topicLabel} 之所以会被拿去和 ${competitor} 一起聊，不是情绪拉满，是能力已经进到同一档比较里了。` : '',
    `${mainClaim}。`,
    `说到底，${buildComparisonLine(topicLabel, focusLine)}。`,
    `放到真实执行里，重点不是“听起来强”，而是${focusLine || mainClaim}到底能不能落到结果。`,
    `你真拿去讲的时候，会发现把事实、差异和场景压成一条线，比堆背景有用得多。`,
  ]).map((item) => sanitizeText(item, controls, playbook, topicLabel));

  if (currentLength < minTargetLength) {
    let poolIndex = 0;
    let safety = 0;
    while (currentLength < minTargetLength && expansionPool.length > 0 && safety < expansionPool.length * 4) {
      const blockIndex = poolIndex % Math.max(1, copy.body.length);
      const fragment = expansionPool[poolIndex % expansionPool.length];
      copy.body[blockIndex].text = sanitizeText(`${copy.body[blockIndex].text}${fragment}`, controls, playbook, topicLabel);
      currentLength = measureCopyLength(copy);
      poolIndex += 1;
      safety += 1;
    }
  }

  if (currentLength > maxTargetLength) {
    const hookBudget = Math.max(playbook.hook.maxChars, Math.round(controls.targetWordCount * 0.16));
    const ctaBudget = Math.max(26, Math.round(controls.targetWordCount * 0.16));
    const bodyBudget = Math.max(120, controls.targetWordCount - hookBudget - ctaBudget);
    const perBodyBudget = Math.max(34, Math.round(bodyBudget / Math.max(1, copy.body.length)));

    copy.hook = compressTextToBudget(copy.hook, hookBudget);
    copy.body = copy.body.map((item) => ({
      ...item,
      text: compressTextToBudget(item.text, perBodyBudget),
    }));
    copy.cta = compressTextToBudget(copy.cta, ctaBudget);
  }

  currentLength = measureCopyLength(copy);
  if (currentLength < minTargetLength && copy.body.length > 0) {
    let refillIndex = 0;
    const refillFragments = uniqueStrings([
      pickFactByKeywords(facts, ['开源', '发布', '旗舰'], 0, `${topicLabel} 这次不是小修小补。`),
      pickFactByKeywords(facts, ['13', '4000', '300', 'agent', '代码'], 1, `${topicLabel} 这次最硬的还是代码和 Agent 这一层。`),
      pickFactByKeywords(facts, ['持平', '优于', 'gpt', 'benchmark', 'bench'], 2, `${topicLabel} 现在已经不是只能在国产模型里横向比了。`),
      competitor ? `${topicLabel} 开始被放进和 ${competitor} 的同场比较里，这才是压力真正出现的地方。` : '',
      `${mainClaim}。`,
    ]).map((item) => sanitizeText(item, controls, playbook, topicLabel));

    while (currentLength < minTargetLength && refillIndex < refillFragments.length * 3) {
      const blockIndex = refillIndex % copy.body.length;
      copy.body[blockIndex].text = sanitizeText(`${copy.body[blockIndex].text}${refillFragments[refillIndex % refillFragments.length]}`, controls, playbook, topicLabel);
      currentLength = measureCopyLength(copy);
      refillIndex += 1;
    }
  }

  return {copy};
}

function buildRuntimePayload(context, playbook, briefStagePayload) {
  const controls = getControls(context, playbook);
  const analysis = getAnalysisSource(context);
  const selectedTitle = getSelectedTitle(context);
  const facts = getFacts(context);
  const bodySections = pickBodySections(playbook, controls.sectionCount);

  return {
    topic: context?.topic || {},
    selectedTitle,
    analysis: {
      thesis: safeString(analysis?.thesis),
      audience: safeString(analysis?.audience),
      corePromise: safeString(analysis?.corePromise),
      analysisBrief: analysis?.analysisBrief || null,
    },
    researchFacts: facts,
    requirements: getRequirements(context),
    stepSkillOverride: getCurrentStepSkill(context),
    resolvedTargets: {
      targetDurationSeconds: controls.targetDurationSeconds,
      targetWordCount: controls.targetWordCount,
      antiAiLevel: controls.antiAiLevel,
      spokenPersona: controls.spokenPersona,
      sectionCount: controls.sectionCount,
    },
    skillRules: {
      hookRange: playbook.hook,
      body: {
        minBlocks: playbook.body.minBlocks,
        maxBlocks: playbook.body.maxBlocks,
        minSentences: playbook.body.minSentences,
        maxSentences: playbook.body.maxSentences,
        sections: bodySections,
      },
      requiredElements: playbook.requiredElements,
      ctaPatterns: playbook.ctaPatterns,
      antiAi: playbook.antiAi,
    },
    brief: briefStagePayload || null,
  };
}

function buildBriefPrompt(context, skillSpec) {
  const playbook = getStep3SkillPlaybook(skillSpec);
  const schema = {
    brief: {
      hookAngle: 'string',
      tone: 'string',
      pacing: 'string',
      ctaIntent: 'string',
    },
    outline: [
      {
        label: 'string',
        beat: 'string',
        goal: 'string',
        evidenceAnchor: 'string',
      },
    ],
  };

  return [
    '你必须把下面这份 video-pipeline-content SKILL.md 当作 Step 3 的唯一真源。',
    '现在先做第一阶段：输出 brief 和 outline，不直接写最终正文。',
    'outline 必须显式覆盖 skill 里的正文块、三要素、CTA 意图和去 AI 味规则。',
    '',
    '【SKILL Prompt 真源】',
    playbook.promptTemplate || playbook.rawSkill,
    '',
    '【运行时输入】',
    JSON.stringify(buildRuntimePayload(context, playbook), null, 2),
    '',
    '只返回这个 JSON 结构：',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

function buildCopyPrompt(context, briefStagePayload, skillSpec) {
  const playbook = getStep3SkillPlaybook(skillSpec);
  const schema = {
    copy: {
      hook: 'string',
      body: [
        {
          label: 'string',
          text: 'string',
        },
      ],
      cta: 'string',
    },
  };

  return [
    '你必须继续严格执行同一份 video-pipeline-content SKILL.md，不允许退回通用模板写法。',
    '现在做第二阶段：根据 brief 输出最终文案。',
    '必须满足：Hook 抓人、Body 覆盖产品细节/使用案例/竞品对比、CTA 用强引导、人话表达、少 AI 味。',
    '',
    '【SKILL Prompt 真源】',
    playbook.promptTemplate || playbook.rawSkill,
    '',
    '【运行时输入】',
    JSON.stringify(buildRuntimePayload(context, playbook, briefStagePayload), null, 2),
    '',
    '只返回这个 JSON 结构：',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

function buildStep3SkillDrivenBrief(context, skillSpec) {
  return buildBrief(context, getStep3SkillPlaybook(skillSpec));
}

function buildStep3SkillDrivenCopy(context, briefStagePayload, skillSpec) {
  return buildCopy(context, briefStagePayload, getStep3SkillPlaybook(skillSpec));
}

function buildStep3SkillDrivenBriefPrompt(context, skillSpec) {
  return buildBriefPrompt(context, skillSpec);
}

function buildStep3SkillDrivenCopyPrompt(context, briefStagePayload, skillSpec) {
  return buildCopyPrompt(context, briefStagePayload, skillSpec);
}

function validateStep3SkillAlignment(context, payload, skillSpec) {
  const playbook = getStep3SkillPlaybook(skillSpec);
  const controls = getControls(context, playbook);
  const expectedSections = pickBodySections(playbook, controls.sectionCount);
  const copy = payload?.copy || {};
  const body = Array.isArray(copy.body) ? copy.body : [];
  const joinedText = [
    safeString(copy.hook),
    ...body.map((item) => safeString(item?.text)),
    safeString(copy.cta),
  ].join('\n');
  const totalChars = joinedText.replace(/\s+/g, '').length;
  const minExpectedChars = Math.max(playbook.targetChars.min, Math.round(controls.targetWordCount * 0.82));
  const maxExpectedChars = Math.max(minExpectedChars + 30, Math.round(controls.targetWordCount * 1.18));
  const reasons = [];

  if (body.length !== expectedSections.length) {
    reasons.push(`正文块数量应为 ${expectedSections.length}，当前只有 ${body.length}`);
  }
  if (totalChars < minExpectedChars) {
    reasons.push(`正文偏短，应至少接近 ${minExpectedChars} 字，当前约 ${totalChars} 字`);
  }
  if (totalChars > maxExpectedChars) {
    reasons.push(`正文偏长，应控制在 ${maxExpectedChars} 字以内，当前约 ${totalChars} 字`);
  }
  if (!/(可以帮你|能帮你|功能|细节|效率|结果)/.test(joinedText)) {
    reasons.push('缺少产品细节或能力描述');
  }
  if (!/(同类|竞品|对比|差异|别人|传统讲法)/.test(joinedText)) {
    reasons.push('缺少竞品对比或差异化表达');
  }
  if (!/(比如|场景|案例|什么人|做内容|做执行|真实用法)/.test(joinedText)) {
    reasons.push('缺少具体使用场景或案例');
  }
  if (!/(评论|留言|关注|转发|下期|扣1)/.test(safeString(copy.cta))) {
    reasons.push('CTA 不够强，不符合 skill 强引导规则');
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

module.exports = {
  buildStep3SkillDrivenBrief,
  buildStep3SkillDrivenBriefPrompt,
  buildStep3SkillDrivenCopy,
  buildStep3SkillDrivenCopyPrompt,
  getStep3SkillPlaybook,
  validateStep3SkillAlignment,
};

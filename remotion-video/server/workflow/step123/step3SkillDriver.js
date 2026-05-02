const fs = require('fs');
const {
  analyzeTechnicalDetails,
  detectTechnicalTopic,
  scoreTechnicalDetails,
} = require('./technicalTopic');

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
    min: 800,
    max: 1000,
  },
  targetDurationSeconds: {
    min: 120,
    max: 240,
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
  return firstClause
    .slice(0, maxLength)
    .replace(/[，；:：、\-\s]+$/g, '')
    .trim();
}

function normalizeBlockType(label, index = 0) {
  const safe = safeString(label).toLowerCase();
  if (/tech-mechanism|技术原理|机制/.test(safe)) return 'tech-mechanism';
  if (/fact-hammer|震撼发布|背景|开场/.test(safe)) return 'fact-hammer';
  if (/comparison|竞品|对比/.test(safe)) return 'comparison';
  if (/capability|能力|产品细节/.test(safe)) return 'capability';
  if (/scenario|场景|案例/.test(safe)) return 'scenario';
  if (/cta|结尾/.test(safe)) return 'cta';

  return ['fact-hammer', 'tech-mechanism', 'capability', 'comparison', 'scenario'][index] || 'capability';
}

function isSafetyHeavyFact(value) {
  return /安全体系|安全评估|红队|防护/.test(safeString(value));
}

function normalizeComparableToken(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeModelLabel(value) {
  const safe = safeString(value);
  if (!safe) {
    return '';
  }

  const gptMatch = safe.match(/\bgpt\s*[- ]?\s*(\d+(?:\.\d+)?)\b/i);
  if (gptMatch?.[1]) {
    return `GPT-${gptMatch[1]}`;
  }

  const claudeMatch = safe.match(/\bclaude(?:\s+([a-z0-9.+-]+))?\b/i);
  if (claudeMatch) {
    return claudeMatch[1]
      ? `Claude ${claudeMatch[1]}`
      : 'Claude';
  }

  const geminiMatch = safe.match(/\bgemini(?:\s+([a-z0-9.+-]+))?\b/i);
  if (geminiMatch) {
    return geminiMatch[1]
      ? `Gemini ${geminiMatch[1]}`
      : 'Gemini';
  }

  const deepSeekMatch = safe.match(/\bdeepseek(?:\s+([a-z0-9.+-]+))?\b/i);
  if (deepSeekMatch) {
    return deepSeekMatch[1]
      ? `DeepSeek ${deepSeekMatch[1]}`
      : 'DeepSeek';
  }

  const kimiMatch = safe.match(/\bkimi\s*k?\s*(\d+(?:\.\d+)?)\b/i);
  if (kimiMatch?.[1]) {
    return `Kimi ${kimiMatch[1]}`;
  }

  return safe;
}

function isGenericFocusInstruction(value) {
  const safe = safeString(value);
  if (!safe) {
    return false;
  }

  return /(^只讲|^只拆|^聚焦|^围绕|重点讲|讲发布本身|能力变化|差异和影响|短句|结论先行|像真人拆重点|空话|背景铺垫|泛泛而谈|3\s*到\s*4\s*段推进)/.test(safe);
}

function splitTextSentences(text) {
  return (safeString(text).match(/[^。！？]+[。！？]?/g) || [])
    .map((item) => safeString(item))
    .filter(Boolean);
}

function dedupeSentences(text) {
  const seen = new Set();
  const output = [];

  for (const sentence of splitTextSentences(text)) {
    const key = normalizeComparableToken(sentence);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(sentence);
  }

  return output.join('');
}

function sanitizeFactText(value) {
  const cleaned = safeString(value)
    .replace(/点击了解详情!?/gi, '')
    .replace(/阅读原文|查看全文|来源[:：].*$/gi, '')
    .replace(/围绕[“"][^”"]+[”"]已经存在可整理的公开线索，?/g, '')
    .replace(/适合先回答“?这是什么、为什么被关注”?/g, '')
    .replace(/当前更值得展开的是这个主题的核心问题、实际影响和用户最在意的结果，而不是只复述名词定义。?/g, '')
    .replace(/这个主题适合做短视频拆解，因为可以把零散线索压缩成事实、判断和执行路径三层信息。?/g, '')
    .replace(/\.\.\.+/g, '')
    .replace(/……+/g, '')
    .replace(/…+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const firstSentence = cleaned.split(/[。！？]/)[0]?.trim() || '';
  if (firstSentence && firstSentence.length <= 96) {
    return firstSentence;
  }

  const firstClause = cleaned.split(/[；;，,]/)[0]?.trim() || '';
  if (firstClause && firstClause.length <= 96) {
    return firstClause;
  }

  return cleaned.slice(0, 96).replace(/[，；:：、\-\s]+$/g, '').trim();
}

function isLowSignalFact(value) {
  const safe = safeString(value);
  if (!safe) {
    return true;
  }

  return /已经存在可整理的公开线索|适合先回答|当前更值得展开|内容价值|点击了解详情|知识库|适合做短视频拆解|零散线索|事实、判断和执行路径|讲清楚/.test(safe);
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

function extractKeywords(text, max = 6) {
  const safe = safeString(text).toLowerCase();
  const matches = safe.match(/[\p{Script=Han}]{2,}|[\p{L}\p{N}]{3,}/gu) || [];
  const expanded = new Set();

  for (const token of matches) {
    expanded.add(token);
    if (/^[\p{Script=Han}]+$/u.test(token) && token.length > 6) {
      expanded.add(token.slice(0, 4));
      expanded.add(token.slice(-4));
      for (let index = 0; index < Math.min(3, token.length - 1); index += 1) {
        expanded.add(token.slice(index, index + 2));
      }
    }
  }

  return uniqueStrings([...expanded].filter((item) => item.length >= 2)).slice(0, max);
}

function extractDurationSeconds(text) {
  const safe = safeString(text);
  if (!safe) return null;

  const minuteRangeMatch = safe.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*分(?:钟)?/);
  if (minuteRangeMatch) {
    return round(((Number(minuteRangeMatch[1]) + Number(minuteRangeMatch[2])) / 2) * 60);
  }

  const minuteMatch = safe.match(/(\d+(?:\.\d+)?)\s*分(?:钟)?/);
  if (minuteMatch) {
    return round(Number(minuteMatch[1]) * 60);
  }

  const secondRangeMatch = safe.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*秒/);
  if (secondRangeMatch) {
    return round((Number(secondRangeMatch[1]) + Number(secondRangeMatch[2])) / 2);
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

function getCopyLengthBudget(playbook, controls) {
  const minTargetLength = Math.round(controls.targetWordCount * 0.9);
  const maxTargetLength = Math.round(controls.targetWordCount * 1.1);

  return {
    minTargetLength,
    maxTargetLength,
    minExpectedChars: minTargetLength,
    maxExpectedChars: maxTargetLength,
    hookBudget: Math.max(playbook.hook.maxChars, Math.round(controls.targetWordCount * 0.16)),
    ctaBudget: Math.max(26, Math.round(controls.targetWordCount * 0.16)),
  };
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
  console.log(`[parseRange] regex=${regex}, text=${String(text || '').slice(0, 100)}, match=${JSON.stringify(match)}`);
  if (!match) {
    return fallback;
  }

  return {
    min: round(match[1]),
    max: round(match[2]),
  };
}

function parseBodyRange(text) {
  const match = String(text || '').match(/Body[（(]?(\d+)\s*[-–]\s*(\d+)[块个]?[，,]\s*每[块个]?[段]?(\d+)\s*[-–]\s*(\d+)[句段][)）]?/);
  console.log(`[parseBodyRange] input="${text}", match=${JSON.stringify(match)}`);
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

  const targetChars = parseRange(safeRaw, /(?:目标(?:字数|时长).*?)?(?:约)?\s*(\d+)\s*-\s*(\d+)\s*字/, clone(FALLBACK_PLAYBOOK.targetChars));
  const durationMatch = safeRaw.match(/(\d+)\s*-\s*(\d+)\s*(秒|分钟)[口播]?[稿]?/);
  const targetDurationSeconds = durationMatch
    ? {
        min: durationMatch[3] === '分钟' ? round(durationMatch[1] * 60) : round(durationMatch[1]),
        max: durationMatch[3] === '分钟' ? round(durationMatch[2] * 60) : round(durationMatch[2]),
      }
    : clone(FALLBACK_PLAYBOOK.targetDurationSeconds);
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

  const entity = matchFirst(corpus, [
    /\bKimi\s*K\d+(?:\.\d+)?\b/i,
    /\bDeepSeek(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bClaude(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGemini(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGPT(?:[- ]?\d+(?:\.\d+)?)?\b/i,
  ]);
  return normalizeModelLabel(entity);
}

function getCompetitorLabel(context) {
  const entity = normalizeComparableToken(getTopicEntity(context));
  const corpus = buildContextCorpus(context);
  const candidates = [
    /\bGPT(?:[- ]?\d+(?:\.\d+)?)?\b/i,
    /\bClaude(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bGemini(?:\s*[A-Za-z0-9.+-]+)?\b/i,
    /\bDeepSeek(?:\s*[A-Za-z0-9.+-]+)?\b/i,
  ];

  for (const pattern of candidates) {
    const match = matchFirst(corpus, [pattern]);
    if (match && normalizeComparableToken(match) !== entity) {
      return normalizeModelLabel(match);
    }
  }

  return '';
}

function usesDomesticModelFraming(context) {
  const entity = getTopicEntity(context);
  const topic = safeString(context?.topic?.query || context?.topic?.inputTitleKeywords || context?.topic?.inputTopic);
  if (/^(gpt|claude|gemini)\b/i.test(entity)) {
    return false;
  }
  return /(kimi|deepseek|qwen|glm|豆包|文心|混元|通义|月之暗面|moonshot|国产|国内)/i.test(`${entity} ${topic}`);
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
  const allowsSafety = normalizedKeywords.some((keyword) => /安全|红队|防护/.test(keyword));

  const scoredFacts = pool
    .map((item, index) => {
      const fact = sanitizeFactText(item?.fact);
      if (!fact) {
        return null;
      }
      const haystack = `${fact} ${safeString(item?.evidenceAnchor)} ${safeString(item?.sourceTitle)}`.toLowerCase();
      const matches = normalizedKeywords.filter((keyword) => haystack.includes(keyword));
      return {
        index,
        fact,
        matches: matches.length,
        score: (
          matches.length * 5
          + (/\d/.test(fact) ? 1 : 0)
          + (/(agent|工作流|代码|发布|升级|benchmark|效率)/i.test(haystack) ? 2 : 0)
          - (/(安全|红队|防护)/.test(haystack) && !normalizedKeywords.some((keyword) => /安全|红队|防护/.test(keyword)) ? 3 : 0)
          - (isLowSignalFact(haystack) ? 4 : 0)
        ),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const preferred = scoredFacts.find((item) => item.score > 0 && (allowsSafety || !isSafetyHeavyFact(item.fact)));
  if (preferred) {
    return compactClause(preferred.fact, 64);
  }

  if (scoredFacts[0]?.score > 0 && allowsSafety) {
    return compactClause(scoredFacts[0].fact, 64);
  }

  return pickFact(pool, fallbackIndex, fallback);
}

function pickFactByCategories(facts, categories, fallbackIndex = 0, fallback = '') {
  const normalizedCategories = new Set((Array.isArray(categories) ? categories : []).map((item) => safeString(item)));
  const pool = Array.isArray(facts) ? facts : [];

  const scoredFacts = pool
    .map((item, index) => {
      const fact = sanitizeFactText(item?.fact);
      if (!fact) {
        return null;
      }

      const detail = analyzeTechnicalDetails({
        fact,
        evidenceAnchor: item?.evidenceAnchor,
        sourceTitle: item?.sourceTitle,
      });
      const matchCount = detail.categories.filter((itemCategory) => normalizedCategories.has(itemCategory)).length;

      return {
        index,
        fact,
        matchCount,
        score: scoreTechnicalDetails({
          fact,
          evidenceAnchor: item?.evidenceAnchor,
          sourceTitle: item?.sourceTitle,
        }) + matchCount * 6,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const preferred = scoredFacts.find((item) => item.matchCount > 0 && item.score > 0);
  if (preferred) {
    return compactClause(preferred.fact, 68);
  }

  return pickFact(pool, fallbackIndex, fallback);
}

function sanitizeLongFactText(value, maxLength = 132) {
  const cleaned = safeString(value)
    .replace(/点击了解详情!?/gi, '')
    .replace(/阅读原文|查看全文|来源[:：].*$/gi, '')
    .replace(/\.\.\.+/g, '')
    .replace(/……+/g, '')
    .replace(/…+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const firstSentence = cleaned.match(/[^。！？]+[。！？]?/)?.[0]?.trim() || '';
  if (firstSentence && firstSentence.length <= maxLength) {
    return firstSentence.replace(/[。！？]+$/g, '').trim();
  }

  return cleaned.slice(0, maxLength).replace(/[，；:：、\-\s]+$/g, '').trim();
}

function pickExpandedFactByCategories(facts, categories, fallbackIndex = 0, fallback = '') {
  const normalizedCategories = new Set((Array.isArray(categories) ? categories : []).map((item) => safeString(item)));
  const pool = Array.isArray(facts) ? facts : [];

  const scoredFacts = pool
    .map((item, index) => {
      const fact = sanitizeLongFactText(item?.fact, 140);
      if (!fact) {
        return null;
      }

      const detail = analyzeTechnicalDetails({
        fact,
        evidenceAnchor: item?.evidenceAnchor,
        sourceTitle: item?.sourceTitle,
      });
      const matchCount = detail.categories.filter((itemCategory) => normalizedCategories.has(itemCategory)).length;

      return {
        index,
        fact,
        matchCount,
        score: scoreTechnicalDetails({
          fact,
          evidenceAnchor: item?.evidenceAnchor,
          sourceTitle: item?.sourceTitle,
        }) + matchCount * 6,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const preferred = scoredFacts.find((item) => item.matchCount > 0 && item.score > 0);
  if (preferred) {
    return preferred.fact;
  }

  return sanitizeLongFactText(pool[fallbackIndex]?.fact || fallback, 140) || pickFact(pool, fallbackIndex, fallback);
}

function pickExpandedFactByKeywords(facts, keywords, fallbackIndex = 0, fallback = '') {
  const normalizedKeywords = (Array.isArray(keywords) ? keywords : [])
    .map((item) => safeString(item).toLowerCase())
    .filter(Boolean);
  const pool = Array.isArray(facts) ? facts : [];

  const scoredFacts = pool
    .map((item, index) => {
      const fact = sanitizeLongFactText(item?.fact, 140);
      if (!fact) {
        return null;
      }
      const haystack = `${fact} ${safeString(item?.evidenceAnchor)} ${safeString(item?.sourceTitle)}`.toLowerCase();
      const matches = normalizedKeywords.filter((keyword) => haystack.includes(keyword));
      return {
        index,
        fact,
        matches: matches.length,
        score: matches.length * 6 + scoreTechnicalDetails({fact, evidenceAnchor: item?.evidenceAnchor, sourceTitle: item?.sourceTitle}),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const preferred = scoredFacts.find((item) => item.matches > 0 && item.score > 0);
  if (preferred) {
    return preferred.fact;
  }

  return sanitizeLongFactText(pool[fallbackIndex]?.fact || fallback, 140) || pickFact(pool, fallbackIndex, fallback);
}

function getFacts(context) {
  const analysis = getAnalysisSource(context);
  const researchFacts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const analysisLayers = Array.isArray(analysis?.layers) ? analysis.layers : [];
  const topicResearch = Array.isArray(context?.pipeline?.topicResearch?.results) ? context.pipeline.topicResearch.results : [];
  const topicState = detectTechnicalTopic({
    topic: context?.topic?.query,
    selectedTitle: getSelectedTitle(context),
    researchFacts,
    searchResults: topicResearch,
  });

  const normalizedResearch = researchFacts.map((item, index) => ({
    label: safeString(item?.label || `事实 ${index + 1}`),
    fact: sanitizeFactText(item?.fact),
    evidenceAnchor: safeString(item?.evidenceAnchor || item?.sourceTitle),
    sourceTitle: safeString(item?.sourceTitle),
  }));
  const normalizedSearch = topicResearch.map((item, index) => ({
    label: safeString(item?.title || `搜索结果 ${index + 1}`),
    fact: sanitizeFactText(item?.snippet || item?.title),
    evidenceAnchor: safeString(item?.publishedAt ? `${item.title || ''} · ${item.publishedAt}` : item?.title),
    sourceTitle: safeString(item?.title),
  }));
  const normalizedLayers = analysisLayers.map((item, index) => ({
    label: safeString(item?.label || `逻辑层 ${index + 1}`),
    fact: sanitizeFactText(`${safeString(item?.insight)}。${safeString(item?.evidence)}`),
    evidenceAnchor: safeString(item?.evidence || item?.label),
    sourceTitle: safeString(item?.label),
  }));

  const merged = [];
  const seen = new Set();
  for (const item of normalizedResearch.concat(normalizedLayers, normalizedSearch)) {
    const key = `${item.fact}::${item.evidenceAnchor}`;
    if (!item.fact || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  if (merged.length > 0) {
    const ranked = topicState.requiresTechnicalDetail
      ? [...merged].sort((left, right) => (
          scoreTechnicalDetails({
            fact: right.fact,
            evidenceAnchor: right.evidenceAnchor,
            sourceTitle: right.sourceTitle,
          }) - scoreTechnicalDetails({
            fact: left.fact,
            evidenceAnchor: left.evidenceAnchor,
            sourceTitle: left.sourceTitle,
          })
        ))
      : merged;
    const preferred = ranked.filter((item) => !isLowSignalFact(`${item.fact} ${item.evidenceAnchor}`));
    const nonSafetyPreferred = preferred.filter((item) => !isSafetyHeavyFact(item.fact));
    const ordered = preferred.length >= Math.min(3, merged.length)
      ? [
          ...nonSafetyPreferred,
          ...preferred.filter((item) => !nonSafetyPreferred.includes(item)),
        ]
      : [
          ...nonSafetyPreferred,
          ...preferred.filter((item) => !nonSafetyPreferred.includes(item)),
          ...ranked.filter((item) => !preferred.includes(item)),
        ];
    return ordered.slice(0, 6);
  }

  const layers = Array.isArray(analysis?.layers) ? analysis.layers : [];
  return layers.slice(0, 4).map((item, index) => ({
    label: safeString(item?.label || `线索 ${index + 1}`),
    fact: compactClause(item?.insight || item?.evidence, 56),
    evidenceAnchor: safeString(item?.evidence || item?.label),
    sourceTitle: safeString(item?.label),
  }));
}

function buildTechnicalDetailContract(context, facts) {
  const topicState = detectTechnicalTopic({
    topic: context?.topic?.query,
    selectedTitle: getSelectedTitle(context),
    researchFacts: facts,
    searchResults: context?.pipeline?.topicResearch?.results,
  });

  if (!topicState.requiresTechnicalDetail) {
    return null;
  }

  return {
    topicKind: topicState.isReleaseTopic ? 'ai-model-release' : 'ai-technical-topic',
    minTechnicalBodyBlocks: 2,
    requireReleaseDetail: topicState.isReleaseTopic,
    requiredAngles: topicState.isReleaseTopic
      ? ['版本或发布时间', '能力或机制变化', 'benchmark/API/价格/限制中的至少一项']
      : ['能力或机制变化', 'benchmark/API/价格/限制中的至少一项'],
    bannedGenericClaims: [
      '只说更强了',
      '只说改工作流',
      '只说压力变大',
      '只说定位变化',
    ],
  };
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
  const analysis = getAnalysisSource(context);
  const selectedTitle = getSelectedTitle(context);
  const topicState = detectTechnicalTopic({
    topic: context?.topic?.query,
    inputTopic: context?.topic?.inputTopic || context?.pipeline?.inputTopic,
    inputTitleKeywords: context?.topic?.inputTitleKeywords || context?.pipeline?.inputTitleKeywords,
    selectedTitle,
    researchFacts: Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [],
    searchResults: context?.pipeline?.topicResearch?.results,
  });
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
  const requestedSectionCount = clamp(
    prefersFullStructure ? playbook.body.maxBlocks : playbook.body.minBlocks,
    playbook.body.minBlocks,
    playbook.body.maxBlocks,
  );
  const sectionCount = topicState.requiresTechnicalDetail
    ? Math.max(requestedSectionCount, Math.min(4, playbook.body.maxBlocks))
    : requestedSectionCount;

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
  const selectedTitle = getSelectedTitle(context);
  const facts = getFacts(context);
  const combinedFacts = facts.map((item) => safeString(item?.fact)).join(' ');
  const competitor = getCompetitorLabel(context);
  const selectedTitleText = safeString(selectedTitle?.title);

  if (/(开源|open source)/i.test(combinedFacts) && /代码|编码|code/i.test(combinedFacts)) {
    return '开源路线和代码能力';
  }
  if (/(Agent|子 Agent|智能体|集群)/i.test(combinedFacts) && /代码|编码|code/i.test(combinedFacts)) {
    return '代码能力和 Agent 集群';
  }
  if (/(工作流|workflow)/i.test(selectedTitleText)) {
    return /代码|开发|编程/.test(selectedTitleText)
      ? '开发工作流改写'
      : '工作流改写';
  }
  if (/(Agent|智能体)/i.test(selectedTitleText)) {
    return /代码|开发|编程/.test(selectedTitleText)
      ? 'Agent 能力和开发工作流'
      : 'Agent 能力和工作流';
  }
  if (competitor && /持平|优于|对标/.test(combinedFacts)) {
    return `${safeString(competitor)} 正面对比`;
  }

  return compactClause(
    (!isGenericFocusInstruction(skill.emphasis) ? skill.emphasis : '')
    || (!isGenericFocusInstruction(requirements.focus) ? requirements.focus : '')
    || analysis?.corePromise
    || analysis?.thesis
    || skill.goal
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
  const fact = sanitizeFactText(facts[index]?.fact);
  const resolved = fact || sanitizeFactText(fallback) || safeString(fallback);
  return compactClause(resolved, 52);
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

function buildStep3BlockDataPoints(items, fallbackText = '', max = 4) {
  const explicit = uniqueStrings(
    (Array.isArray(items) ? items : [])
      .map((item) => compactClause(item, 30))
      .filter(Boolean),
  );
  if (explicit.length > 0) {
    return explicit.slice(0, max);
  }

  const fallbackSentences = (safeString(fallbackText).match(/[^。！？；\n]+/g) || [])
    .map((item) => compactClause(item, 30))
    .filter((item) => item.length >= 4);

  return uniqueStrings(fallbackSentences).slice(0, max);
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
  safe = safe
    .replace(/\s+/g, ' ')
    .replace(/，，+/g, '，')
    .replace(/。。+/g, '。')
    .replace(/…+/g, '')
    .trim();
  return dedupeSentences(safe);
}

function normalizeSentenceKey(value, topicLabel = '') {
  const stripped = safeString(value)
    .replace(/^(另外|而且|再补一句|更硬的点在后面|再往执行里落|说白了|更关键的是|先把话说透|真到使用场景里|比如做内容的人|再比如做开发和执行的人)[，,:：]*/u, '')
    .trim();
  const substantive = stripped.includes('：')
    ? stripped.split(/[：:]/).slice(-1)[0].trim() || stripped
    : stripped;
  const normalized = normalizeComparableToken(
    isSafetyHeavyFact(substantive)
      ? substantive.replace(/^(另外|而且)/, '')
      : substantive,
  );
  const topicToken = normalizeComparableToken(topicLabel);
  if (!topicToken) {
    return normalized;
  }
  return normalized.replaceAll(topicToken, '');
}

function buildNonRepeatingFallback(item, topicLabel, maxLength = 56) {
  const sceneIntent = safeString(item?.sceneIntent || item?.label);
  const evidenceAnchor = safeString(item?.evidenceAnchor);
  const dataPoint = Array.isArray(item?.dataPoints)
    ? safeString(item.dataPoints[0])
    : '';

  return compactClause(
    dataPoint
    || (sceneIntent && evidenceAnchor ? `${sceneIntent}这一块直接落到${evidenceAnchor}` : '')
    || (sceneIntent ? `${sceneIntent}这一块重点是把结果讲明白` : '')
    || `这块直接回到${topicLabel || '主线'}的结果层`,
    maxLength,
  );
}

function dedupeCopyPayload(copy, topicLabel) {
  const seen = new Set();
  const dedupeText = (text, fallback = '') => {
    const kept = [];
    for (const sentence of splitTextSentences(text)) {
      const key = normalizeSentenceKey(sentence, topicLabel);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      kept.push(sentence);
    }

    const joined = kept.join('');
    return safeString(joined) || compactClause(fallback, 56);
  };

  const nextCopy = {
    ...copy,
    hook: dedupeText(copy.hook, copy.hook),
    body: (Array.isArray(copy.body) ? copy.body : []).map((item) => ({
      ...item,
      text: dedupeText(item?.text, buildNonRepeatingFallback(item, topicLabel)),
    })),
    cta: dedupeText(copy.cta, copy.cta),
  };

  return nextCopy;
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
  const topicLabel = getTopicLabel(context);
  const competitor = getCompetitorLabel(context);

  return compactClause(
    analysis?.thesis
    || analysis?.corePromise
    || (competitor
      ? `${topicLabel} 这次最值得讲的，是它开始正面给 ${competitor} 压力`
      : `${topicLabel} 真正该先讲的，是它怎么开始改真实工作流`),
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
  const technicalContract = buildTechnicalDetailContract(context, facts);
  const bodySections = pickBodySections(playbook, controls.sectionCount);
  const formula = pickFormula(playbook, controls.variant);
  const focusLine = buildFocusLine(context);
  const mainClaim = buildMainClaim(context);
  const audienceLine = summarizeAudience(context);
  const ctaPattern = pickCtaPattern(playbook, controls.variant);

  if (technicalContract) {
    const technicalOutline = [
      {
        label: 'fact-hammer',
        type: 'fact-hammer',
        beat: `先把「${safeString(context?.topic?.query || selectedTitle?.title || '当前主题')}」最值钱的结果抛出来，用时间、结果和反差把人钉住。`,
        goal: `前 3 秒先抓住 ${audienceLine}，直接证明任务闭环发生了，不铺背景。`,
        evidenceAnchor: pickEvidence(facts, 0, selectedTitle?.evidenceAnchor || mainClaim),
        sceneIntent: '让用户先看到模糊需求已经被收成完整方案',
        mustInclude: buildStep3BlockDataPoints([
          selectedTitle?.title,
          pickFact(facts, 0, mainClaim),
          '18分钟',
          '完整方案',
        ], '', 4),
        transitionToNext: '下一块转到 tech-mechanism',
        keywords: uniqueStrings(extractKeywords(`${selectedTitle?.title} ${pickFact(facts, 0, mainClaim)} 18分钟 完整方案`, 6)),
      },
      {
        label: 'tech-mechanism',
        type: 'tech-mechanism',
        beat: '解释它为什么能从回答走到执行，必须把 HOW 讲透，不准只说更强了。',
        goal: '让程序员理解 Agent、tool calling、长上下文为什么会把结果质量拉开。',
        evidenceAnchor: pickEvidence(facts, 1, mainClaim),
        sceneIntent: '让程序员理解它为什么开始像任务执行者',
        mustInclude: buildStep3BlockDataPoints([
          pickFactByCategories(facts, ['capability', 'product'], 1, mainClaim),
          'Agent',
          'tool calling',
          '长上下文',
        ], '', 4),
        transitionToNext: '下一块转到 capability',
        keywords: ['Agent', 'tool calling', '长上下文', '代码仓库', '机制'],
      },
      {
        label: 'capability',
        type: 'capability',
        beat: '把真实任务表现讲具体，不能只报分，得说明这个分数意味着什么。',
        goal: '让用户知道它在真实代码任务里到底能替你省掉什么判断和动作。',
        evidenceAnchor: pickEvidence(facts, 2, mainClaim),
        sceneIntent: '让用户知道它在真实代码任务里到底强在哪',
        mustInclude: buildStep3BlockDataPoints([
          pickFactByCategories(facts, ['benchmark', 'comparison'], 2, mainClaim),
          'benchmark',
          '真实 issue',
          '代码任务',
        ], '', 4),
        transitionToNext: '下一块转到 comparison',
        keywords: ['benchmark', '代码任务', '真实 issue', '能力证据'],
      },
      {
        label: 'comparison',
        type: 'comparison',
        beat: '把它和值不值得切换这件事说死，比较维度必须落到工作流、成本、限制或稳定性。',
        goal: '帮助用户判断它和旧版/其他模型相比，到底值不值得放进工作流。',
        evidenceAnchor: pickEvidence(facts, 3, mainClaim),
        sceneIntent: '让用户判断它值不值得放进真实工作流',
        mustInclude: buildStep3BlockDataPoints([
          pickFactByCategories(facts, ['pricing', 'comparison', 'product'], 3, mainClaim),
          '工作流',
          '调用成本',
          '长任务稳定性',
        ], '', 4),
        transitionToNext: '最后收束到 CTA',
        keywords: ['对比', '工作流', '调用成本', '长任务稳定性'],
      },
    ].slice(0, controls.sectionCount);

    return {
      brief: {
        hookAngle: `围绕「${selectedTitle?.angle || '当前标题角度'}」切口，先扔结果，再拆机制，再讲能力和切换判断。`,
        tone: buildToneText(context, controls, playbook),
        pacing: `${controls.targetDurationSeconds} 秒口播，约 ${controls.targetWordCount} 字，按 skill 要求拆成 ${controls.sectionCount} 块正文，每块 ${playbook.body.minSentences}-${playbook.body.maxSentences} 句，前 3 秒先抓人。`,
        ctaIntent: `结尾用${ctaPattern.label || '互动型'} CTA，把观众带进评论、关注或转发动作，同时让人记住「${mainClaim}」这条判断。`,
        techDepth: controls.detailLevel >= 3 ? 'deep' : controls.detailLevel >= 2 ? 'medium' : 'shallow',
      },
      outline: technicalOutline,
    };
  }

  const outline = bodySections.map((section, index) => {
    const label = safeString(section.title || `正文块 ${index + 1}`);
    const beat = safeString(
      index === 0
        ? `${formula.label}起手，先把「${safeString(context?.topic?.query || selectedTitle?.title || '当前主题')}」最值得听的判断抛出来，再带出背景和数据线索。`
        : `用${safeString(section.formula || formula.label)}把「${section.title}」这块讲透，别空讲，必须落到具体事实和结果。`,
    );
    const goal = safeString(
      index === 0
        ? `前 3 秒先抓住 ${audienceLine}，不铺垫。`
        : section.title.includes('产品细节')
          ? '至少讲出 3 个具体能力、功能点或执行结果。'
          : section.title.includes('竞品')
            ? '明确和同类产品/传统讲法的核心差异。'
            : section.title.includes('案例') || section.title.includes('场景')
              ? '给至少 2 个可代入的具体场景。'
              : '让这一块的信息比上一块更具体、更有画面感。',
    );
    const evidenceAnchor = pickEvidence(facts, index, selectedTitle?.evidenceAnchor || mainClaim);
    return {
      label,
      type: normalizeBlockType(section.title || label, index),
      beat,
      goal,
      evidenceAnchor,
      sceneIntent: compactClause(section.title || goal, 30),
      mustInclude: buildStep3BlockDataPoints([
        pickFact(facts, index, mainClaim),
        evidenceAnchor,
        ...(Array.isArray(section.rules) ? section.rules.slice(0, 2) : []),
      ], `${goal} ${beat}`, 3),
      transitionToNext: index < bodySections.length - 1
        ? `下一块转到 ${safeString(bodySections[index + 1]?.title || `正文块 ${index + 2}`)}`
        : '最后收束到 CTA',
      keywords: extractKeywords(`${label} ${evidenceAnchor} ${pickFact(facts, index, mainClaim)}`, 6),
    };
  });

  return {
    brief: {
      hookAngle: `围绕「${selectedTitle?.angle || '当前标题角度'}」切口，按${formula.label}起钩，先抛判断，再把产品细节、竞品差异和使用场景串起来。`,
      tone: buildToneText(context, controls, playbook),
      pacing: `${controls.targetDurationSeconds} 秒口播，约 ${controls.targetWordCount} 字，按 skill 要求拆成 ${controls.sectionCount} 块正文，每块 ${playbook.body.minSentences}-${playbook.body.maxSentences} 句，前 3 秒先抓人。`,
      ctaIntent: `结尾用${ctaPattern.label || '互动型'} CTA，把观众带进评论、关注或转发动作，同时让人记住「${mainClaim}」这条判断。`,
      techDepth: controls.detailLevel >= 3 ? 'deep' : controls.detailLevel >= 2 ? 'medium' : 'shallow',
    },
    outline,
  };
}

function buildHookText(context, playbook, controls, mainClaim, focusLine) {
  const topicLabel = getTopicLabel(context);
  const selectedTitle = getSelectedTitle(context);
  const formula = pickFormula(playbook, controls.variant);
  const titleText = safeString(selectedTitle?.title);
  const titleWorklowFrame = titleText.match(/(真正该先看的不是[^，。！？]+，而是[^，。！？]+)/)?.[1];
  const titleOutcome = titleText.match(/(\d+\s*分钟后[^，。！？]*)/);
  const titleSetup = titleText.match(/(我把[^，。！？]+丢给[^，。！？]+)/);
  if (titleSetup && titleOutcome) {
    const stitched = `${titleSetup[1]}，${titleOutcome[1]}。`;
    return compressTextToBudget(sanitizeText(stitched, controls, playbook, topicLabel), playbook.hook.maxChars);
  }
  if (titleWorklowFrame) {
    return compressTextToBudget(
      sanitizeText(`${titleWorklowFrame}。`, controls, playbook, topicLabel),
      Math.max(playbook.hook.maxChars, 34),
    );
  }

  const templates = [
    `别再只看热度了，真正该先看的，是${focusLine || mainClaim}。`,
    `「${topicLabel}」这事，核心就一句：${mainClaim}。`,
    `${focusLine || mainClaim}，不是热度，是${topicLabel}真正值得看的。`,
    `很多人讲「${topicLabel}」讲慢了——真正该先讲的，是${mainClaim}。`,
  ];

  let hook = templates[controls.variant % templates.length];
  if (/情绪/.test(formula.label)) {
    hook = `很多人卡在「${topicLabel}」上，不是不会看，是没抓住${focusLine || mainClaim}。`;
  }
  if (/痛点/.test(formula.label)) {
    hook = `「${topicLabel}」这事，核心就一句：${mainClaim}。`;
  }
  if (/互动/.test(formula.label)) {
    hook = `先记这句：${mainClaim}。`;
  }

  hook = sanitizeText(hook, controls, playbook, topicLabel);
  if (isGenericFocusInstruction(focusLine) || /^只讲|^只拆|^聚焦|^围绕/.test(safeString(focusLine))) {
    hook = sanitizeText(`「${topicLabel}」这事，核心就一句：${mainClaim}。`, controls, playbook, topicLabel);
  }
  return compressTextToBudget(hook, playbook.hook.maxChars);
}

function buildBackgroundBlock(context, controls, playbook, mainClaim, facts) {
  const topicLabel = getTopicLabel(context);
  const releaseFact = pickFactByCategories(
    facts,
    ['release'],
    0,
    `${topicLabel} 这次先要把版本和发布时间讲清，不是空喊升级`,
  );
  const capabilityFact = pickFactByCategories(
    facts,
    ['capability', 'product'],
    1,
    `${topicLabel} 这次不是普通聊天增强，而是把真实执行链路往前推了一步`,
  );
  const distinctCapabilityFact = (
    /安全体系也在同步升级/.test(capabilityFact)
    || normalizeComparableToken(capabilityFact) === normalizeComparableToken(releaseFact)
  )
    ? `${topicLabel} 这次不是普通聊天增强，而是把真实执行链路往前推了一步`
    : capabilityFact;

  return joinSentences([
    `${releaseFact}。`,
    `${distinctCapabilityFact}。`,
  ]);
}

function buildCapabilityBlock(context, controls, playbook, focusLine, facts) {
  const topicLabel = getTopicLabel(context);
  const capabilityFact = pickFactByCategories(
    facts,
    ['capability', 'product'],
    1,
    `${topicLabel} 这次把能力升级落到了工作流、工具调用和执行稳定性上`,
  );
  const benchmarkOrOpsFact = pickFactByCategories(
    facts,
    ['benchmark', 'pricing', 'product', 'comparison'],
    3,
    `真正值得讲的，不是“更聪明”，而是 benchmark、API 能力或限制有没有一起变`,
  );
  const distinctBenchmarkFact = normalizeComparableToken(benchmarkOrOpsFact) === normalizeComparableToken(capabilityFact)
    ? `真正值得讲的，不是“更聪明”，而是 benchmark、API 能力或限制有没有一起变`
    : benchmarkOrOpsFact;
  const distinctCapabilityFact = /安全体系也在同步升级/.test(capabilityFact)
    ? `${topicLabel} 这次把能力升级落到了工作流、工具调用和执行稳定性上`
    : capabilityFact;

  return joinSentences([
      `${distinctCapabilityFact}。`,
      `${distinctBenchmarkFact}。`,
    ]);
}

function toFullSentence(text) {
  const safe = safeString(text);
  if (!safe) {
    return '';
  }
  return /[。！？]$/.test(safe) ? safe : `${safe}。`;
}

function buildTechnicalNarrationBlocks(context, controls, playbook, mainClaim, focusLine, facts, outlineItems = []) {
  const topicLabel = getTopicLabel(context);
  const selectedTitle = getSelectedTitle(context);
  const analysis = getAnalysisSource(context);
  const audience = summarizeAudience(context);
  const titleText = safeString(selectedTitle?.title);
  const analysisCorpus = [
    titleText,
    safeString(analysis?.thesis),
    safeString(analysis?.corePromise),
    ...(Array.isArray(analysis?.layers) ? analysis.layers.flatMap((item) => [safeString(item?.insight), safeString(item?.evidence)]) : []),
    ...(Array.isArray(facts) ? facts.flatMap((item) => [safeString(item?.fact), safeString(item?.evidenceAnchor)]) : []),
  ].join(' ');
  const benchmarkName = analysisCorpus.match(/\b(SWE-bench|MMLU(?:-Pro)?|LiveCodeBench|GPQA|AIME|pass@1)\b/i)?.[1] || 'SWE-bench';
  const contextTerm = analysisCorpus.match(/\b\d+K\s*上下文\b/i)?.[0] || (/上下文/.test(analysisCorpus) ? '长上下文' : '长上下文');
  const agentTerm = /(agent|子\s*agent|智能体)/i.test(analysisCorpus) ? 'Agent' : '任务代理';
  const toolTerm = /(tool calling|工具调用|function calling)/i.test(analysisCorpus) ? 'tool calling' : '工具调用';
  const workflowTerm = /工作流/.test(analysisCorpus) ? '真实工作流' : '真实任务链';
  const codeBaseTerm = /代码仓库|仓库/.test(analysisCorpus) ? '代码仓库' : '整坨代码和约束';
  const topicState = detectTechnicalTopic({
    topic: context?.topic?.query,
    inputTopic: context?.topic?.inputTopic || context?.pipeline?.inputTopic,
    inputTitleKeywords: context?.topic?.inputTitleKeywords || context?.pipeline?.inputTitleKeywords,
    selectedTitle,
    researchFacts: Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [],
    searchResults: context?.pipeline?.topicResearch?.results,
  });
  const titleSetup = titleText.match(/(我把[^，。！？]+丢给[^，。！？]+)/)?.[1] || '';
  const titleOutcome = titleText.match(/(\d+\s*分钟后[^，。！？]*)/)?.[1] || '';
  const hasTaskClosureTitle = Boolean(titleSetup && titleOutcome);
  const isReleaseReading = topicState.isReleaseTopic && !hasTaskClosureTitle;
  const releaseFact = pickExpandedFactByCategories(
    facts,
    ['release'],
    0,
    `${topicLabel} 这次不是小修小补，而是真把新版本和默认链路一起推上来了`,
  );
  const capabilityFact = pickExpandedFactByCategories(
    facts,
    ['capability', 'product'],
    1,
    `${topicLabel} 这次把能力重点压到了工具调用、结构化输出和多步骤执行稳定性`,
  );
  const benchmarkFact = pickExpandedFactByCategories(
    facts,
    ['benchmark', 'comparison', 'pricing', 'product'],
    2,
    `${topicLabel} 已经开始被拿到真实代码任务、benchmark 和工具链成功率里一起对比`,
  );
  const pricingOrOpsFact = pickExpandedFactByCategories(
    facts,
    ['pricing', 'product', 'comparison'],
    3,
    `${topicLabel} 真要进工作流，还得一起看 API 接入、速率限制、成本和长任务稳定性`,
  );
  const mechanismFact = pickExpandedFactByKeywords(
    facts,
    ['1m 上下文', '1m', 'dsa', '稀疏注意力', 'token', 'tool calls', 'json output', 'agent'],
    1,
    `${topicLabel} 这次把长上下文、工具调用和 Agent 能力打成了一整条默认链路`,
  );
  const engineeringFact = pickExpandedFactByKeywords(
    facts,
    ['api', 'model', '折扣', '停用', 'json output', 'tool calls', '成本'],
    4,
    `${topicLabel} 真要落地，最后还是要看 API 接入、模型迁移、成本和停用时间`,
  );

  const releaseBlocks = [
    {
      label: safeString(outlineItems[0]?.label || 'fact-hammer'),
      type: normalizeBlockType(outlineItems[0]?.type || outlineItems[0]?.label || 'fact-hammer', 0),
      text: joinSentences([
        toFullSentence(`先把判断摆这，${selectedTitle?.title || `${topicLabel} 这次真正该先看的不是热度，而是工作流会不会被改写`}`),
        toFullSentence(`${releaseFact}`),
        toFullSentence(`所以这次最该盯的，不是发布会热度，也不是聊天观感，而是它有没有把默认做事链路往前拽一格`),
        toFullSentence(`${audience}真正想知道的，也不是“又发了个新模型”，而是这次会不会逼你改原来的干活顺序`),
      ]),
      evidenceAnchor: safeString(outlineItems[0]?.evidenceAnchor || releaseFact),
      sceneIntent: safeString(outlineItems[0]?.sceneIntent || '让用户先理解这次发布该看工作流，不该只看热度'),
      transitionToNext: safeString(outlineItems[0]?.transitionToNext || '下一块讲它到底改了哪一层机制'),
      keywords: uniqueStrings([
        ...(outlineItems[0]?.keywords || []),
        topicLabel,
        '发布',
        '工作流',
        '热度',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        topicLabel,
        '发布',
        '工作流',
        compactClause(releaseFact, 28),
      ], '', 4),
      mechanismDepth: null,
    },
    {
      label: safeString(outlineItems[1]?.label || 'tech-mechanism'),
      type: normalizeBlockType(outlineItems[1]?.type || outlineItems[1]?.label || 'tech-mechanism', 1),
      text: joinSentences([
        toFullSentence(`它改的不是一个按钮，核心是${mechanismFact}`),
        toFullSentence(`这几层一旦连起来，模型就不只是吐一句答案，而是能先理解上下文，再决定调什么工具、按什么顺序把任务往前推`),
        toFullSentence(`为什么这会改工作流？因为过去很多团队是“人来拆步骤，模型来补一句”，现在开始变成“模型先把步骤排好，人只做复核和取舍”`),
        toFullSentence(`短上下文像只看封面猜内容，${contextTerm}加 ${agentTerm} 更像把整本书翻完再写提纲，所以差距会直接出现在执行链里`),
      ]),
      evidenceAnchor: safeString(outlineItems[1]?.evidenceAnchor || mechanismFact),
      sceneIntent: safeString(outlineItems[1]?.sceneIntent || '让程序员理解这次为什么会改默认工作流'),
      transitionToNext: safeString(outlineItems[1]?.transitionToNext || '下一块讲这些能力怎么在真实任务里验出来'),
      keywords: uniqueStrings([
        ...(outlineItems[1]?.keywords || []),
        agentTerm,
        toolTerm,
        contextTerm,
        '工作流',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        contextTerm,
        agentTerm,
        toolTerm,
        '工作流',
      ], '', 4),
      mechanismDepth: {
        level: 'deep',
        explains: 'HOW',
        technicalTerms: [agentTerm, toolTerm, contextTerm],
        analogy: `短上下文像只看封面猜内容，${contextTerm}加 ${agentTerm} 像把整本书翻完再写提纲`,
        visualHint: 'pipeline-flow',
      },
    },
    {
      label: safeString(outlineItems[2]?.label || 'capability'),
      type: normalizeBlockType(outlineItems[2]?.type || outlineItems[2]?.label || 'capability', 2),
      text: joinSentences([
        toFullSentence(`${benchmarkFact}`),
        toFullSentence(`这类对比值钱，不是因为分数好看，而是它开始考工具链成功率、多步骤任务通过率，还有真实代码任务能不能被顺利关掉`),
        toFullSentence(`你看见 benchmark、JSON 结果更稳、函数调用更稳这些话时，别把它当参数海报，它们对应的是少返工、少补问、少手动拼接`),
        toFullSentence(`同样叫“能力升级”，有的是聊天更顺，有的是整条执行链更稳，这两种升级对真实团队不是一个量级`),
      ]),
      evidenceAnchor: safeString(outlineItems[2]?.evidenceAnchor || benchmarkFact),
      sceneIntent: safeString(outlineItems[2]?.sceneIntent || '让用户知道这次能力升级会怎样落到真实任务'),
      transitionToNext: safeString(outlineItems[2]?.transitionToNext || '下一块讲值不值得切换和接入'),
      keywords: uniqueStrings([
        ...(outlineItems[2]?.keywords || []),
        benchmarkName,
        'benchmark',
        '工具链',
        '多步骤任务',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        benchmarkName,
        'benchmark',
        '工具链成功率',
        '多步骤任务通过率',
      ], '', 4),
      mechanismDepth: null,
    },
    {
      label: safeString(outlineItems[3]?.label || 'comparison'),
      type: normalizeBlockType(outlineItems[3]?.type || outlineItems[3]?.label || 'comparison', 3),
      text: joinSentences([
        toFullSentence(`最后就看值不值得切，关键不是海报式跑分，而是${engineeringFact}`),
        toFullSentence(`如果它能让你少掉来回追问、补结构、补收尾那几轮人工，那它就不只是“发布了”，而是真的开始改工具栈`),
        toFullSentence(`反过来，如果成本、配额和稳定性接不住，再强的演示也只是演示，这就是为什么发布解读最后一定要落到工程后果`),
        toFullSentence(`所以这次真正该先看的不是热度，而是工作流会不会被改写；如果这句成立，升级才算有分量`),
      ]),
      evidenceAnchor: safeString(outlineItems[3]?.evidenceAnchor || engineeringFact),
      sceneIntent: safeString(outlineItems[3]?.sceneIntent || '让用户判断这次发布值不值得放进真实工作流'),
      transitionToNext: safeString(outlineItems[3]?.transitionToNext || ''),
      keywords: uniqueStrings([
        ...(outlineItems[3]?.keywords || []),
        '工作流',
        '调用成本',
        '速率限制',
        '稳定性',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        'API 接入',
        '速率限制',
        '成本',
        '长任务稳定性',
      ], '', 4),
      mechanismDepth: null,
    },
  ];

  const taskClosureBlocks = [
    {
      label: safeString(outlineItems[0]?.label || 'fact-hammer'),
      type: normalizeBlockType(outlineItems[0]?.type || outlineItems[0]?.label || 'fact-hammer', 0),
      text: joinSentences([
        toFullSentence(`${titleSetup || `我把一个模糊需求丢给${topicLabel}` }，${titleOutcome || `${topicLabel}把完整方案直接吐出来`}`),
        toFullSentence(`最反常识的地方，不是它答得快，而是需求本身很糊，它却能自己补步骤、收结果、把任务闭成环`),
        toFullSentence(`${mainClaim}`),
        toFullSentence(`${audience}最该看的，不是它会不会聊天，而是以前你得自己补问题、补步骤、补收尾，现在它开始把这几段往一块收`),
      ]),
      evidenceAnchor: safeString(outlineItems[0]?.evidenceAnchor || '18分钟完成模糊需求到可用方案'),
      sceneIntent: safeString(outlineItems[0]?.sceneIntent || '让用户先看到任务闭环真的发生了'),
      transitionToNext: safeString(outlineItems[0]?.transitionToNext || '下一块讲它为什么能做到'),
      keywords: uniqueStrings([
        ...(outlineItems[0]?.keywords || []),
        topicLabel,
        '18分钟',
        '模糊需求',
        '完整方案',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        '18分钟',
        '模糊需求',
        '完整方案',
        '任务闭环',
      ], '', 4),
      mechanismDepth: null,
    },
    {
      label: safeString(outlineItems[1]?.label || 'tech-mechanism'),
      type: normalizeBlockType(outlineItems[1]?.type || outlineItems[1]?.label || 'tech-mechanism', 1),
      text: joinSentences([
        toFullSentence(`这背后不是一句“更强了”，核心是${contextTerm}、${agentTerm}和多步骤 ${toolTerm} 开始一起工作`),
        toFullSentence(`先把${codeBaseTerm}、约束条件和历史信息吃进去，再决定先查什么、改什么、怎么收尾，所以它不是单轮问答碰运气`),
        toFullSentence(`为什么这一层重要？因为任务一旦超过一问一答，决定质量的就不只是会不会说，而是会不会拆和会不会收`),
        toFullSentence(`短上下文像看一张照片写影评，${contextTerm}加 ${agentTerm} 更像把整部电影看完再交剧本，所以它才开始像任务执行者`),
      ]),
      evidenceAnchor: safeString(outlineItems[1]?.evidenceAnchor || `${contextTerm} + ${agentTerm} + ${toolTerm}`),
      sceneIntent: safeString(outlineItems[1]?.sceneIntent || '让程序员知道它为什么从问答走到执行'),
      transitionToNext: safeString(outlineItems[1]?.transitionToNext || '下一块讲这个能力怎么被测出来'),
      keywords: uniqueStrings([
        ...(outlineItems[1]?.keywords || []),
        agentTerm,
        toolTerm,
        contextTerm,
        '代码仓库',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        contextTerm,
        agentTerm,
        toolTerm,
        '代码仓库',
      ], '', 4),
      mechanismDepth: {
        level: 'deep',
        explains: 'HOW',
        technicalTerms: [agentTerm, toolTerm, contextTerm],
        analogy: `短上下文像看照片写影评，${contextTerm}加 ${agentTerm} 像看完整部电影再交剧本`,
        visualHint: 'architecture-map',
      },
    },
    {
      label: safeString(outlineItems[2]?.label || 'capability'),
      type: normalizeBlockType(outlineItems[2]?.type || outlineItems[2]?.label || 'capability', 2),
      text: joinSentences([
        toFullSentence(`${benchmarkName} 这类评测值钱，不是因为它给了一个分数，而是它考的就是真实任务能不能被关掉`),
        toFullSentence(`它不是背答案，也不是做选择题，而是要读懂真实代码、定位真实 issue、把 patch 真正交出来`),
        toFullSentence(`所以这类能力一旦站住，代表的不是会聊，而是能不能把任务真正往前推，这才是你敢不敢把仓库、需求和约束一起丢进去的分界线`),
        toFullSentence(`同样一句“代码能力更强”，有的模型只是回答更像样，有的模型却真的能把一个任务推到可交付，这两者不是一回事`),
      ]),
      evidenceAnchor: safeString(outlineItems[2]?.evidenceAnchor || `${benchmarkName} / 真实代码任务`),
      sceneIntent: safeString(outlineItems[2]?.sceneIntent || '让用户知道这个能力在真实任务里怎么量化'),
      transitionToNext: safeString(outlineItems[2]?.transitionToNext || '下一块讲和其他模型比到底差在哪'),
      keywords: uniqueStrings([
        ...(outlineItems[2]?.keywords || []),
        benchmarkName,
        'benchmark',
        '真实代码',
        'issue',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        benchmarkName,
        'benchmark',
        '真实 issue',
        '代码任务',
      ], '', 4),
      mechanismDepth: null,
    },
    {
      label: safeString(outlineItems[3]?.label || 'comparison'),
      type: normalizeBlockType(outlineItems[3]?.type || outlineItems[3]?.label || 'comparison', 3),
      text: joinSentences([
        toFullSentence(`跟只会给建议、但长任务一跑就断的模型比，这次更大的差别，在于它终于有资格被塞进${workflowTerm}`),
        toFullSentence(`你让它写一段代码、读一坨文档、再给一版能落地的方案时，差别就会暴露出来`),
        toFullSentence(`判断值不值得切换，不该只看热度和海报式跑分，而要看它能不能少掉你来回追问、拼步骤和补收尾的那几轮人工`),
        toFullSentence(`如果答案是能，那这次升级才算真正有用`),
      ]),
      evidenceAnchor: safeString(outlineItems[3]?.evidenceAnchor || `${workflowTerm} / 长任务稳定性`),
      sceneIntent: safeString(outlineItems[3]?.sceneIntent || '让用户判断它值不值得切换'),
      transitionToNext: safeString(outlineItems[3]?.transitionToNext || ''),
      keywords: uniqueStrings([
        ...(outlineItems[3]?.keywords || []),
        '对比',
        workflowTerm,
        '人工拼接',
        '长任务',
      ]).slice(0, 6),
      dataPoints: buildStep3BlockDataPoints([
        workflowTerm,
        '长任务稳定性',
        '人工拼接',
        '长任务',
      ], '', 4),
      mechanismDepth: null,
    },
  ];

  const blocks = isReleaseReading ? releaseBlocks : taskClosureBlocks;
  return blocks.slice(0, Math.max(1, controls.sectionCount));
}

function buildComparisonBlock(context, controls, playbook, mainClaim, focusLine, facts) {
  const topicLabel = getTopicLabel(context);
  const competitor = getCompetitorLabel(context);
  const domesticModelFrame = usesDomesticModelFraming(context);
  const benchmarkFact = pickFactByCategories(
    facts,
    ['benchmark', 'comparison', 'pricing', 'product'],
    2,
    competitor
      ? `${topicLabel} 已经能和顶级闭源模型摆到一张表上比`
      : `${topicLabel} 现在更该和上一代“只会聊天”的理解方式拉开差距`,
  );

  if (!competitor) {
    return joinSentences([
      `${benchmarkFact}。`,
      `${focusLine || topicLabel}才是真正拉开差距的地方。`,
      `${mainClaim}这条判断，要拿结果去比，不是拿背景去堆。`,
    ]);
  }

  return joinSentences([
    domesticModelFrame
      ? `很多人一说国产模型就默认比 ${competitor} 弱，这个判断现在该改了。`
      : `很多人一说 ${topicLabel} 这种新版本，第一反应还是先看热度，不先看它能不能真的压到 ${competitor}，这个习惯现在该改了。`,
    `${benchmarkFact}。`,
    domesticModelFrame
      ? `说白了，真正能拉开差异的，不是喊一句“国产也很强”，而是把${mainClaim}这条判断拿 benchmark、工具链或价格限制去顶住。`
      : `说白了，真正能拉开差异的，不是先把热度喊满，而是把${mainClaim}这条判断拿 benchmark、工具链或价格限制去顶住。`,
    `别人还在讲概念的时候，这里已经能把${focusLine || topicLabel}放到结果层去比了。`,
  ]);
}

function buildScenarioBlock(context, controls, playbook, focusLine, mainClaim, facts) {
  const topicLabel = getTopicLabel(context);
  const audienceLine = summarizeAudience(context);
  const scenarioFact = pickFactByCategories(
    facts,
    ['product', 'capability', 'pricing'],
    3,
    `${mainClaim} 这条判断放到真实开发和协作场景里才有意义`,
  );

  return joinSentences([
    `${scenarioFact}。`,
    `${focusLine || mainClaim}才是关键。`,
  ]);}

function buildMergedBlock(context, controls, playbook, mainClaim, focusLine, facts) {
  const comparisonLine = buildComparisonBlock(context, controls, playbook, mainClaim, focusLine, facts);
  const scenarioLine = buildScenarioBlock(context, controls, playbook, focusLine, mainClaim, facts);
  return joinSentences([
    comparisonLine,
  ]);
}

function buildBodyBlocks(context, playbook, controls, mainClaim, focusLine, facts, outlineItems = []) {
  if (buildTechnicalDetailContract(context, facts)) {
    return buildTechnicalNarrationBlocks(context, controls, playbook, mainClaim, focusLine, facts, outlineItems);
  }

  const sections = pickBodySections(playbook, controls.sectionCount);
  return sections.map((section, index) => {
    const outlineItem = outlineItems[index] || {};
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
        `${pickFact(facts, index, focusLine || mainClaim)}。`,
        `${pickFact(facts, index, focusLine || mainClaim)}。`,
        `${focusLine || mainClaim}才是关键。`,
      ]);
    }

    return {
      label: safeString(outlineItem.label || title),
      type: normalizeBlockType(outlineItem.type || outlineItem.label || title, index),
      text: sanitizeText(text, controls, playbook, getTopicLabel(context)),
      sceneIntent: compactClause(outlineItem.sceneIntent || title, 30),
      evidenceAnchor: safeString(outlineItem.evidenceAnchor || pickEvidence(facts, index, mainClaim)),
      keywords: extractKeywords([
        safeString(outlineItem.sceneIntent || title),
        safeString(outlineItem.evidenceAnchor || pickEvidence(facts, index, mainClaim)),
        pickFact(facts, index, mainClaim),
      ].join(' '), 6),
      dataPoints: buildStep3BlockDataPoints(
        [
          ...(Array.isArray(outlineItem.mustInclude) ? outlineItem.mustInclude : []),
          pickFact(facts, index, mainClaim),
        ],
        text,
        4,
      ),
      transitionToNext: safeString(
        outlineItem.transitionToNext
        || (index < sections.length - 1 ? `下一块转到 ${safeString(sections[index + 1]?.title || `正文块 ${index + 2}`)}` : '最后收束到 CTA'),
      ),
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
  const outlineItems = Array.isArray(briefStagePayload?.outline) ? briefStagePayload.outline : [];

  const copy = {
    hook: buildHookText(context, playbook, controls, mainClaim, focusLine),
    body: buildBodyBlocks(context, playbook, controls, mainClaim, focusLine, facts, outlineItems),
    cta: sanitizeText(buildCtaText(context, playbook, controls, mainClaim), controls, playbook, topicLabel),
  };

  const {
    minTargetLength,
    maxTargetLength,
    minExpectedChars,
    maxExpectedChars,
  } = getCopyLengthBudget(playbook, controls);
  let currentLength = measureCopyLength(copy);

  const expansionPool = uniqueStrings([
    pickFactByCategories(facts, ['capability', 'product'], 1, `${topicLabel} 这次把关键能力摆上桌，不是只讲感觉。`),
    pickFactByCategories(facts, ['benchmark', 'comparison', 'pricing'], 2, `${topicLabel} 现在已经能和顶级模型正面对比。`),
    pickFactByCategories(facts, ['release'], 0, `${topicLabel} 这次不是试水，是正式把能力放出来。`),
    competitor ? `${topicLabel} 之所以会被拿去和 ${competitor} 一起聊，不是情绪拉满，是能力已经进到同一档比较里了。` : '',
    `${mainClaim}。`,
    `说到底，${buildComparisonLine(topicLabel, focusLine)}。`,
    `放到真实执行里，重点不是“听起来强”，而是${focusLine || mainClaim}到底能不能落到 benchmark、API 或结果。`,
    `你真拿去讲的时候，会发现把事实、差异和场景压成一条线，比堆背景有用得多。`,
  ])
    .map((item) => sanitizeText(item, controls, playbook, topicLabel))
    .filter((item) => item && !isLowSignalFact(item));

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
    const domesticModelFrame = usesDomesticModelFraming(context);
    const refillFragments = uniqueStrings([
      pickFactByCategories(facts, ['release'], 0, `${topicLabel} 这次不是小修小补。`),
      pickFactByCategories(facts, ['capability', 'product'], 1, `${topicLabel} 这次最硬的还是代码、工具调用和 Agent 这一层。`),
      pickFactByCategories(
        facts,
        ['benchmark', 'comparison', 'pricing'],
        2,
        domesticModelFrame
          ? `${topicLabel} 现在已经不是只能在国产模型里横向比了。`
          : `${topicLabel} 现在已经不能只拿发布热度衡量了，得直接看 benchmark、工具链和价格限制。`,
      ),
      competitor ? `${topicLabel} 开始被放进和 ${competitor} 的同场比较里，这才是压力真正出现的地方。` : '',
      `${mainClaim}。`,
    ])
      .map((item) => sanitizeText(item, controls, playbook, topicLabel))
      .filter((item) => item && !isLowSignalFact(item));

    while (currentLength < minTargetLength && refillIndex < refillFragments.length * 3) {
      const blockIndex = refillIndex % copy.body.length;
      copy.body[blockIndex].text = sanitizeText(`${copy.body[blockIndex].text}${refillFragments[refillIndex % refillFragments.length]}`, controls, playbook, topicLabel);
      currentLength = measureCopyLength(copy);
      refillIndex += 1;
    }
  }

  currentLength = measureCopyLength(copy);
  if (currentLength > maxTargetLength) {
    const hookBudget = Math.max(playbook.hook.maxChars, Math.round(controls.targetWordCount * 0.18));
    const ctaBudget = Math.max(26, Math.round(controls.targetWordCount * 0.16));
    const bodyBudget = Math.max(120, controls.targetWordCount - hookBudget - ctaBudget);
    const perBodyBudget = Math.max(34, Math.round(bodyBudget / Math.max(1, copy.body.length)));

    copy.hook = compressTextToBudget(copy.hook, hookBudget);
    copy.body = copy.body.map((item) => ({
      ...item,
      text: compressTextToBudget(dedupeSentences(item.text), perBodyBudget),
    }));
    copy.cta = compressTextToBudget(copy.cta, ctaBudget);
  }

  copy.hook = sanitizeText(copy.hook, controls, playbook, topicLabel);
  copy.body = copy.body.map((item) => ({
    ...item,
    text: sanitizeText(item.text, controls, playbook, topicLabel),
  }));
  copy.cta = sanitizeText(copy.cta, controls, playbook, topicLabel);

  const dedupedCopy = dedupeCopyPayload(copy, topicLabel);
  copy.hook = dedupedCopy.hook;
  copy.body = dedupedCopy.body;
  copy.cta = dedupedCopy.cta;

  currentLength = measureCopyLength(copy);
  if (currentLength > maxTargetLength) {
    const hookBudget = Math.max(playbook.hook.maxChars, Math.round(controls.targetWordCount * 0.16));
    const ctaBudget = Math.max(24, Math.round(controls.targetWordCount * 0.14));
    const bodyBudget = Math.max(110, controls.targetWordCount - hookBudget - ctaBudget);
    const perBodyBudget = Math.max(32, Math.round(bodyBudget / Math.max(1, copy.body.length)));

    copy.hook = compressTextToBudget(copy.hook, hookBudget);
    copy.body = copy.body.map((item) => ({
      ...item,
      text: compressTextToBudget(item.text, perBodyBudget),
    }));
    copy.cta = compressTextToBudget(copy.cta, ctaBudget);
  }

  return {copy};
}

function buildRuntimePayload(context, playbook, briefStagePayload) {
  const controls = getControls(context, playbook);
  const analysis = getAnalysisSource(context);
  const selectedTitle = getSelectedTitle(context);
  const facts = getFacts(context);
  const bodySections = pickBodySections(playbook, controls.sectionCount);
  const technicalDetailContract = buildTechnicalDetailContract(context, facts);

  return {
    topic: context?.topic || {},
    selectedTitle,
    titleBackbone: {
      title: safeString(selectedTitle?.title),
      angle: safeString(selectedTitle?.angle),
      rationale: safeString(selectedTitle?.rationale),
      evidenceAnchor: safeString(selectedTitle?.evidenceAnchor),
      hookStyle: safeString(selectedTitle?.hookStyle),
      titleKeywords: extractKeywords(selectedTitle?.title, 8),
    },
    analysis: {
      thesis: safeString(analysis?.thesis),
      audience: safeString(analysis?.audience),
      corePromise: safeString(analysis?.corePromise),
      analysisBrief: analysis?.analysisBrief || null,
    },
    researchFacts: facts,
    requirements: getRequirements(context),
    stepSkillOverride: getCurrentStepSkill(context),
    technicalDetailContract,
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
    outputContract: {
      outlineFields: ['label', 'type', 'beat', 'goal', 'evidenceAnchor', 'sceneIntent', 'mustInclude', 'transitionToNext', 'keywords'],
      bodyFields: ['label', 'type', 'text', 'sceneIntent', 'evidenceAnchor', 'keywords', 'dataPoints', 'transitionToNext', 'mechanismDepth'],
    },
    brief: briefStagePayload || null,
  };
}

function buildBriefPrompt(context, skillSpec) {
  const playbook = getStep3SkillPlaybook(skillSpec);
  const runtimePayload = buildRuntimePayload(context, playbook);
  const schema = {
    brief: {
      hookAngle: 'string',
      tone: 'string',
      pacing: 'string',
      ctaIntent: 'string',
      techDepth: 'shallow | medium | deep',
    },
    outline: [
      {
        label: 'string',
        type: 'fact-hammer | tech-mechanism | capability | comparison | scenario | cta',
        beat: 'string',
        goal: 'string',
        evidenceAnchor: 'string',
        sceneIntent: 'string',
        mustInclude: ['string'],
        transitionToNext: 'string',
        keywords: ['string'],
      },
    ],
  };

  return [
    '你必须把下面这份 video-pipeline-content SKILL.md 当作 Step 3 的唯一真源。',
    '现在先做第一阶段：输出 brief 和 outline，不直接写最终正文。',
    'outline 必须显式覆盖 skill 里的正文块、三要素、CTA 意图和去 AI 味规则。',
    `正文块数量必须是 ${runtimePayload.resolvedTargets.sectionCount} 块，并且块类型必须覆盖 fact-hammer、tech-mechanism、capability、comparison；如果还有第 5 块才允许 scenario。`,
    'tech-mechanism 块必须排在第 2 块，不能缺席，也不能被 capability 替代。',
    '每个 outline 块都必须给 type / sceneIntent / evidenceAnchor / mustInclude / transitionToNext / keywords，后续 Step 4 会直接消费这些字段。',
    runtimePayload.technicalDetailContract
      ? '这是 AI/模型技术选题，outline 不能只写“更强了/改工作流了”。必须明确分配发布细节、能力机制、benchmark/API/价格/限制这些硬信息到对应正文块。'
      : '',
    '',
    '【SKILL Prompt 真源】',
    playbook.promptTemplate || playbook.rawSkill,
    '',
    '【运行时输入】',
    JSON.stringify(runtimePayload, null, 2),
    '',
    '只返回这个 JSON 结构：',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

function buildCopyPrompt(context, briefStagePayload, skillSpec) {
  const playbook = getStep3SkillPlaybook(skillSpec);
  const controls = getControls(context, playbook);
  const runtimePayload = buildRuntimePayload(context, playbook, briefStagePayload);
  const schema = {
    copy: {
      hook: 'string',
      body: [
        {
          label: 'string',
          type: 'fact-hammer | tech-mechanism | capability | comparison | scenario | cta',
          text: 'string',
          sceneIntent: 'string',
          evidenceAnchor: 'string',
          keywords: ['string'],
          dataPoints: ['string'],
          transitionToNext: 'string',
          mechanismDepth: {
            level: 'shallow | medium | deep',
            explains: 'WHAT | HOW | WHY',
            technicalTerms: ['string'],
            analogy: 'string',
            visualHint: 'string',
          },
        },
      ],
      cta: 'string',
    },
  };

  return [
    '【强制执行】你必须严格遵守以下所有约束，不允许任何违反：',
    `1. 每块正文必须是 ${playbook.body.minSentences}-${playbook.body.maxSentences} 句（这是硬性要求，不是建议）`,
    `2. 总字数目标是 ${controls.targetWordCount} 字，范围 ${playbook.targetChars.min}-${playbook.targetChars.max} 字`,
    `3. Hook 必须是 ${playbook.hook.minChars}-${playbook.hook.maxChars} 字`,
    '4. 禁止废话开场："大家好""今天我们来""如果你"这些不准出现',
    '5. 禁止空洞句："产品定位变了""效率提升了""开始改工作流了""不只是聊天更是协作伙伴"这些不准出现',
    '6. Body 每块必须是短段落，每块最多4句，不准写成一大段',
    '7. 这不是摘要，也不是报告，必须像真人当面拆重点：短句、硬信息、判断明确。',
    '8. 不能只写概念结论，至少 3 块正文要带明确数字、版本、机制、benchmark、价格、限制中的一种。',
    '9. tech-mechanism 块必须写 mechanismDepth，且 level 不能是 shallow，必须解释 HOW 或 WHY，并给一个生活化类比。',
    '10. comparison 块不能只说“更便宜/更强”，必须明确比较维度和使用后果。',
    '',
    '现在做第二阶段：根据 brief 输出最终文案。',
    `Hook：${playbook.hook.minChars}-${playbook.hook.maxChars} 字，第一秒承接标题，不能把标题换个说法复述一遍。`,
    `Body：拆成 ${controls.sectionCount} 块，每块 ${playbook.body.minSentences}-${playbook.body.maxSentences} 句，保留 type / sceneIntent / evidenceAnchor / keywords / dataPoints / transitionToNext / mechanismDepth。`,
    `总字数必须尽量贴近 ${controls.targetWordCount} 字，低于 ${Math.round(controls.targetWordCount * 0.88)} 字视为失败。`,
    '四块正文的职责分别是：',
    '块1 fact-hammer：先把结果和时间/数字锚点钉死，不铺背景。',
    '块2 tech-mechanism：解释它为什么能做到，必须出现 HOW/WHY/MECHANISM 之一，且有类比。',
    '块3 capability：把真实任务表现讲具体，不能只报一个空分数。',
    '块4 comparison：讲清和旧版/竞品/传统做法相比到底差在哪，差异会影响什么。',
    runtimePayload.technicalDetailContract
      ? `正文至少 2 块要带具体技术更新：版本/发布日期/benchmark/API/价格/限制`
      : '',
    '如果上一版文案被判定为：太短、太泛、机制不够深、像摘要，请你直接重写，不要只修一两句。',
    '',
    '【SKILL Prompt 真源】',
    playbook.promptTemplate || playbook.rawSkill,
    '',
    '【运行时输入】',
    JSON.stringify(runtimePayload, null, 2),
    '',
    '只返回这个 JSON 结构：',
    JSON.stringify(schema, null, 2),
  ].filter(Boolean).join('\n');
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
  const {minExpectedChars, maxExpectedChars} = getCopyLengthBudget(playbook, controls);
  const expectedSections = pickBodySections(playbook, controls.sectionCount);
  const copy = payload?.copy || {};
  const body = Array.isArray(copy.body) ? copy.body : [];
  const joinedText = [
    safeString(copy.hook),
    ...body.map((item) => safeString(item?.text)),
    safeString(copy.cta),
  ].join('\n');
  const totalChars = joinedText.replace(/\s+/g, '').length;
  const reasons = [];
  const shortTextWarnings = [];
  const structuredBlockCount = body.filter((item) => (
    safeString(item?.sceneIntent)
    && safeString(item?.evidenceAnchor)
    && Array.isArray(item?.keywords)
    && item.keywords.length > 0
    && Array.isArray(item?.dataPoints)
    && item.dataPoints.length > 0
  )).length;
  const bodyTypes = body.map((item) => safeString(item?.type || item?.label).toLowerCase());
  const hasTechMechanism = bodyTypes.some((item) => /tech-mechanism/.test(item));
  const comparisonBlocks = body.filter((item) => /comparison/.test(safeString(item?.type || item?.label).toLowerCase()));
  const scenarioCovered = /(比如|场景|案例|具体到|你真拿去|开发者|程序员|团队|代码仓库|真实公司)/.test(joinedText);
  const hardSignalCount = (joinedText.match(/(\d+(?:\.\d+)?%|\d+K|\d+\s*分钟|\d+\s*秒|\d{4}-\d{2}-\d{2}|benchmark|API|tool calling|上下文|rate limit|价格)/gi) || []).length;
  const genericPatterns = [
    '它不是在回答问题，它在替你把事情做完',
    '这跟传统聊天机器人完全不同',
    '对于需要处理复杂代码库、做完整方案的用户来说',
    '真正值得讲的，不是',
  ];
  const genericHitCount = genericPatterns.filter((item) => joinedText.includes(item)).length;
  const mechanismBlock = body.find((item) => /tech-mechanism/.test(safeString(item?.type || item?.label).toLowerCase()));
  const mechanismDepth = mechanismBlock?.mechanismDepth || null;
  const mechanismText = safeString(mechanismBlock?.text);

  if (body.length !== expectedSections.length) {
    reasons.push(`正文块数量应为 ${expectedSections.length}，当前只有 ${body.length}`);
  }
  if (totalChars < minExpectedChars) {
    reasons.push(`正文偏短，应至少接近 ${minExpectedChars} 字，当前约 ${totalChars} 字`);
  }
  if (totalChars > maxExpectedChars) {
    reasons.push(`正文偏长，应控制在 ${maxExpectedChars} 字以内，当前约 ${totalChars} 字`);
  }
  if (!/(帮你|执行|干活|功能|细节|效率|结果|拆任务|规划|主动)/.test(joinedText)) {
    reasons.push('缺少产品细节或能力描述');
  }
  if (!/(同类|竞品|对比|差异|差别|旧模型|之前的模型|以前|传统讲法|端到端)/.test(joinedText)) {
    reasons.push('缺少竞品对比或差异化表达');
  }
  if (!/(比如|场景|案例|什么人|做内容|做执行|真实用法|程序员|开发者|产品)/.test(joinedText)) {
    reasons.push('缺少具体使用场景或案例');
  }
  if (structuredBlockCount < Math.max(1, body.length - 1)) {
    reasons.push('正文结构化字段不足，缺少 sceneIntent / evidenceAnchor / keywords / dataPoints');
  }
  if (!/(评论|留言|关注|转发|下期|扣1)/.test(safeString(copy.cta))) {
    reasons.push('CTA 不够强，不符合 skill 强引导规则');
  }
  if (!hasTechMechanism) {
    reasons.push('缺少 tech-mechanism 正文块');
  }
  if (comparisonBlocks.length < 1) {
    reasons.push('缺少 comparison 正文块');
  }
  if (!scenarioCovered) {
    reasons.push('文案缺少真实使用场景，仍然像抽象说明');
  }
  if (hardSignalCount < Math.max(4, body.length)) {
    reasons.push(`硬信息密度不够，至少要有 ${Math.max(4, body.length)} 处数字/机制/API/benchmark 信号，当前只有 ${hardSignalCount} 处`);
  }
  if (genericHitCount >= 2) {
    reasons.push('文案套话过多，像模板摘要，不像按 skill 生成的口播拆解');
  }
  if (mechanismBlock) {
    if (!mechanismDepth || !safeString(mechanismDepth.level) || /shallow/i.test(safeString(mechanismDepth.level))) {
      reasons.push('tech-mechanism 块缺少足够深的 mechanismDepth');
    }
    if (!/(怎么做到|为什么|怎么测出来|相当于|像是)/.test(mechanismText)) {
      reasons.push('tech-mechanism 块没有把 HOW/WHY/类比讲出来');
    }
  }
  for (const item of body) {
    const text = safeString(item?.text);
    const sentenceCount = splitTextSentences(text).length;
    if (sentenceCount < playbook.body.minSentences || sentenceCount > playbook.body.maxSentences) {
      shortTextWarnings.push(`${safeString(item?.label || item?.type || '正文块')} 句数不符合要求`);
    }
  }
  reasons.push(...shortTextWarnings);

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

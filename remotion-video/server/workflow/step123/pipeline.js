const {buildStep123Context, getInputTopic, searchTopicResearch} = require('./context');
const {WorkflowGenerationError, toWorkflowGenerationError} = require('./errors');
const {
  DEFAULT_MODEL,
  generateStructuredJson,
  getWorkflowLLMCapabilities,
  hasWorkflowLLM,
} = require('./llm');
const {
  normalizeStep1Payload,
  normalizeStep2Payload,
  normalizeStep3Payload,
} = require('./normalizers');
const { ensureStepSkillReady, enrichStepResult } = require('../skillRegistry');
const {
  validateStep1Analysis,
  validateStep1Research,
  validateStep2Strategy,
  validateStep2Titles,
  validateStep3Brief,
  validateStep3Copy,
} = require('./quality');
const {
  buildStep3SkillDrivenBrief,
  buildStep3SkillDrivenBriefPrompt,
  buildStep3SkillDrivenCopy,
  buildStep3SkillDrivenCopyPrompt,
  validateStep3SkillAlignment,
} = require('./step3SkillDriver');

const STEP1_FACT_LABELS = ['搜索事实', '讨论焦点', '内容切口', '补充证据', '延展线索'];
const STEP2_STRATEGY_LIBRARY = [
  {
    angle: '结论先行',
    hookStyle: '先抛判断',
    titleTemplates: [
      '别再泛讲「{topic}」了，真正该先说的是这个结论',
      '如果只讲一句「{topic}」，我会先讲这个判断',
      '看懂「{topic}」，先别看功能，先看这个结论',
      '真正值得讲的「{topic}」，第一句就该这么说',
    ],
  },
  {
    angle: '问题追问',
    hookStyle: '抛关键问题',
    titleTemplates: [
      '为什么现在都在讲「{topic}」？关键不在热度，在这件事',
      '「{topic}」到底先看什么？很多人第一步就看错了',
      '想讲清「{topic}」，先回答这个问题再往下走',
      '大家为什么会继续搜「{topic}」？答案其实很直接',
    ],
  },
  {
    angle: '反差拆解',
    hookStyle: '先打反差',
    titleTemplates: [
      '别把「{topic}」当工具介绍，它真正值钱的是这层反差',
      '看起来在讲「{topic}」，其实真正该拆的是另一层逻辑',
      '很多人讲「{topic}」都太平了，差别就在这一下',
      '「{topic}」最容易被忽略的，不是功能，是这层差异',
    ],
  },
  {
    angle: '解释型',
    hookStyle: '先讲清对象',
    titleTemplates: [
      '「{topic}」到底在解决什么？这次直接讲清楚',
      '如果你想一次看懂「{topic}」，先抓这 3 个重点',
      '「{topic}」最适合这样讲，清楚又能继续展开',
      '别被名词带跑，「{topic}」其实讲的是这条主线',
    ],
  },
];
const STEP3_SKILL_DEFAULTS = {
  'dense-short': {
    targetDurationSeconds: 45,
    targetWordCount: 170,
    antiAiLevel: 'strong',
    spokenPersona: '像懂行的人当面拆重点，短句、快节奏、别绕。',
  },
  'spoken-breakdown': {
    targetDurationSeconds: 60,
    targetWordCount: 230,
    antiAiLevel: 'max',
    spokenPersona: '像真人面对面讲给你听，不背稿，不端着。',
  },
  'emotion-push': {
    targetDurationSeconds: 55,
    targetWordCount: 210,
    antiAiLevel: 'strong',
    spokenPersona: '像一个有情绪起伏、但判断很稳的人在讲。',
  },
  'dry-goods-review': {
    targetDurationSeconds: 75,
    targetWordCount: 290,
    antiAiLevel: 'strong',
    spokenPersona: '像做完一轮实战后的复盘口播，克制但很实。',
  },
};
const STEP3_ANTI_AI_PROFILES = {
  natural: {
    label: '自然口播',
    openingPhrases: ['先说结论', '先把核心点拎出来', '先别绕背景'],
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
const STEP3_BLUEPRINTS = [
  {
    hookLabels: ['开场判断', '硬事实', '差异落点', '收束推进'],
    bodyLabels: ['先把误区掰正', '补一条硬事实', '把差异和场景说透', '最后把节奏收住'],
  },
  {
    hookLabels: ['先拆误区', '核心事实', '真实场景', '收束推进'],
    bodyLabels: ['先别按老路讲', '先顶住一个事实', '再把真实场景放进来', '最后把结论落死'],
  },
  {
    hookLabels: ['先抛问题', '直接回答', '真正主线', '收束推进'],
    bodyLabels: ['先把问题抛出去', '用事实接答案', '把真正主线讲清', '最后留下动作'],
  },
  {
    hookLabels: ['先上场景', '补关键点', '给出判断', '收束推进'],
    bodyLabels: ['先让人代入场景', '再补关键事实', '把判断直接说死', '最后把话收住'],
  },
];

function uniqueBy(items, pickKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = pickKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function deriveStep1ResearchFromSearch(context) {
  const topicQuery = String(
    context?.topic?.query
    || context?.topic?.inputTitleKeywords
    || context?.topic?.inputTopic
    || '当前主题',
  ).trim();
  const searchResults = Array.isArray(context?.pipeline?.topicResearch?.results)
    ? context.pipeline.topicResearch.results
    : [];

  const facts = uniqueBy(
    searchResults.map((item, index) => {
      const title = String(item?.title || '').trim();
      const snippet = String(item?.snippet || '').trim();
      const publishedAt = String(item?.publishedAt || '').trim();
      const evidenceBase = title || `${topicQuery} 相关结果 ${index + 1}`;
      const evidenceAnchor = publishedAt ? `${evidenceBase} · ${publishedAt}` : evidenceBase;
      const fact = snippet || title;

      if (!fact) {
        return null;
      }

      return {
        label: STEP1_FACT_LABELS[index] || `事实 ${index + 1}`,
        fact,
        evidenceAnchor,
        sourceTitle: title,
      };
    }).filter(Boolean),
    (item) => `${item.fact}::${item.evidenceAnchor}`,
  );

  const fallbackFacts = [
    {
      label: '主题入口',
      fact: `围绕“${topicQuery}”已经存在可整理的公开线索，适合先回答“这是什么、为什么被关注”。`,
      evidenceAnchor: searchResults[0]?.title || topicQuery,
      sourceTitle: String(searchResults[0]?.title || '').trim(),
    },
    {
      label: '关注重点',
      fact: `当前更值得展开的是这个主题的核心问题、实际影响和用户最在意的结果，而不是只复述名词定义。`,
      evidenceAnchor: searchResults[1]?.title || topicQuery,
      sourceTitle: String(searchResults[1]?.title || '').trim(),
    },
    {
      label: '内容价值',
      fact: `这个主题适合做短视频拆解，因为可以把零散线索压缩成事实、判断和执行路径三层信息。`,
      evidenceAnchor: searchResults[2]?.title || topicQuery,
      sourceTitle: String(searchResults[2]?.title || '').trim(),
    },
  ];

  const mergedFacts = [...facts];
  for (const fact of fallbackFacts) {
    if (mergedFacts.length >= 3) {
      break;
    }
    mergedFacts.push(fact);
  }

  return {
    researchFacts: mergedFacts.slice(0, 5),
    mainQuestion: `围绕“${topicQuery}”，观众最想先搞清楚的是什么，为什么现在值得看？`,
    audienceFocus: `想快速看懂“${topicQuery}”的普通用户、行业观察者和实际使用者。`,
    contentAngle: `先提炼公开线索，再把“${topicQuery}”压缩成可继续生成标题和文案的分析骨架。`,
    whyNow: searchResults[0]?.publishedAt
      ? `当前检索结果仍有公开更新时间，说明“${topicQuery}”还有现实讨论价值。`
      : `“${topicQuery}”已经形成公开讨论，可直接整理成短视频分析入口。`,
  };
}

function deriveTopicEntity(topicQuery, facts) {
  const combined = [
    String(topicQuery || '').trim(),
    ...(Array.isArray(facts) ? facts.map((item) => `${item?.sourceTitle || ''} ${item?.fact || ''}`.trim()) : []),
  ].join(' ');

  const matches = [
    combined.match(/\bKimi\s*K\d+(?:\.\d+)?\b/i),
    combined.match(/\bDeepSeek\b/i),
    combined.match(/\bClaude\b/i),
    combined.match(/\bGemini\b/i),
    combined.match(/\bGPT[- ]?\d+(?:\.\d+)?\b/i),
  ].filter(Boolean);

  if (matches[0]?.[0]) {
    return matches[0][0].replace(/\s+/g, ' ').trim();
  }

  return compactClause(topicQuery, 18) || '当前主题';
}

function deriveCompetitorLabel(topicQuery, facts) {
  const combined = [
    String(topicQuery || '').trim(),
    ...(Array.isArray(facts) ? facts.map((item) => `${item?.sourceTitle || ''} ${item?.fact || ''}`.trim()) : []),
  ].join(' ');

  const match = combined.match(/\bGPT(?:-\d+(?:\.\d+)?)?\b/i)
    || combined.match(/\bClaude(?:\s+Opus)?(?:\s+\d+(?:\.\d+)?)?\b/i)
    || combined.match(/\bGemini(?:\s+\d+(?:\.\d+)?)?\b/i);

  return match?.[0]?.replace(/\s+/g, ' ').trim() || '';
}

function deriveFocusPhrase(topicQuery, facts) {
  const combined = [
    String(topicQuery || '').trim(),
    ...(Array.isArray(facts) ? facts.map((item) => `${item?.sourceTitle || ''} ${item?.fact || ''}`.trim()) : []),
  ].join(' ');
  const mappings = [
    [/开源|open source/i, '开源路线'],
    [/代码|编码|code|swe-bench/i, '代码能力'],
    [/agent|智能体/i, 'Agent能力'],
    [/长程|长上下文|long[- ]?horizon|context/i, '长程任务'],
    [/视觉|多模态|video|image/i, '多模态'],
    [/推理|reason/i, '推理能力'],
  ];
  const picked = [];

  for (const [pattern, label] of mappings) {
    if (pattern.test(combined) && !picked.includes(label)) {
      picked.push(label);
    }
  }

  if (picked.length === 0) {
    return '真实竞争力';
  }

  return picked.slice(0, 2).join('和');
}

function deriveStep1AnalysisFromResearch(context, researchStagePayload) {
  const topicQuery = String(
    context?.topic?.query
    || context?.topic?.inputTitleKeywords
    || context?.topic?.inputTopic
    || '当前主题',
  ).trim();
  const facts = Array.isArray(researchStagePayload?.researchFacts)
    ? researchStagePayload.researchFacts
    : [];

  const primaryFact = facts[0]?.fact || `“${topicQuery}”已经具备可整理的公开讨论。`;
  const secondaryFact = facts[1]?.fact || `围绕“${topicQuery}”的讨论更适合拆成问题、影响和执行路径。`;
  const tertiaryFact = facts[2]?.fact || `这个主题可以直接沉淀成后续标题、文案和分镜的统一骨架。`;
  const entity = deriveTopicEntity(topicQuery, facts);
  const competitor = deriveCompetitorLabel(topicQuery, facts);
  const focus = deriveFocusPhrase(topicQuery, facts);
  const thesis = competitor
    ? `${entity} 这次真正值得讲的，不是“又一个国产模型”，而是它在${focus}上开始正面给 ${competitor} 压力。`
    : `${entity} 这次真正值得讲的，不是热闹本身，而是它把${focus}推进到了更能落地的阶段。`;

  return {
    analysis: {
      thesis,
      audience: `想快速看懂 ${entity}、${focus} 和实际竞争格局的普通用户、从业者与开发者。`,
      corePromise: `把 ${entity} 这次升级到底强在哪、为什么会形成压力、适合什么场景讲清楚。`,
      layers: [
        {
          label: '升级事实',
          insight: compactClause(primaryFact, 72) || thesis,
          evidence: facts[0]?.evidenceAnchor || topicQuery,
        },
        {
          label: '能力焦点',
          insight: `${entity} 这次最该拆的是 ${focus}，而不是泛泛聊“厉害不厉害”。`,
          evidence: facts[1]?.evidenceAnchor || facts[0]?.evidenceAnchor || topicQuery,
        },
        {
          label: '竞争落点',
          insight: competitor
            ? `${entity} 为什么会让 ${competitor} 阵营感到压力，要落到真实能力和场景。`
            : compactClause(tertiaryFact, 72),
          evidence: facts[2]?.evidenceAnchor || facts[1]?.evidenceAnchor || topicQuery,
        },
      ],
      process: [
        {
          label: '确认升级事实',
          detail: `先确认 ${entity} 这次到底发布了什么、公开信息里最硬的点是什么。`,
        },
        {
          label: '拆能力重点',
          detail: `${entity} 不是只看热度，重点要落到 ${focus}。`,
        },
        {
          label: '收束竞争判断',
          detail: competitor
            ? `最后收成一句判断：${entity} 在${focus}上已经开始给 ${competitor} 压力。`
            : `最后收成一句判断：${entity} 在${focus}上已经进入更值得关注的阶段。`,
        },
      ],
    },
    analysisBrief: {
      mainQuestion: researchStagePayload?.mainQuestion || `${entity} 这次到底强在哪，为什么会被拿来和 ${competitor || '第一梯队模型'} 放在一起聊？`,
      audienceFocus: researchStagePayload?.audienceFocus || `用户想快速看懂 ${entity} 的真实能力、竞争位置和使用价值。`,
      narrativeApproach: `先抛判断，再拆 ${focus}，最后落到${competitor ? `${competitor} 竞争格局` : '现实使用价值'}。`,
      whyNow: researchStagePayload?.whyNow || `${entity} 的公开线索已经足够形成一条明确的内容主线。`,
    },
  };
}

function fillTemplate(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] || ''));
}

function getStep2Variant(context) {
  return Math.max(0, Number(context?.generation?.attempt || 0) % STEP2_STRATEGY_LIBRARY.length);
}

function buildStep2AudienceTrigger(analysis, strategy) {
  const audience = String(analysis?.audience || '').trim();
  const briefAudience = String(analysis?.analysisBrief?.audienceFocus || '').trim();
  return audience || briefAudience || `想快速看懂这个主题的人会先被“${strategy.angle}”这类切口打动。`;
}

function buildStep2EvidenceAnchor(analysis, facts, index) {
  return String(
    facts[index]?.evidenceAnchor
    || facts[index]?.sourceTitle
    || analysis?.layers?.[index]?.evidence
    || analysis?.corePromise
    || analysis?.thesis
    || '当前已确认分析',
  ).trim();
}

function deriveStep2StrategyFromAnalysis(context) {
  const topicQuery = String(context?.topic?.query || '当前主题').trim();
  const analysis = context?.pipeline?.selectedAnalysis || {};
  const facts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const skill = getCurrentStepSkill(context);
  const variant = getStep2Variant(context);

  const rotated = STEP2_STRATEGY_LIBRARY.slice(variant).concat(STEP2_STRATEGY_LIBRARY.slice(0, variant));
  const strategies = rotated.slice(0, 4).map((item, index) => ({
    angle: item.angle,
    audienceTrigger: buildStep2AudienceTrigger(analysis, item),
    evidenceAnchor: buildStep2EvidenceAnchor(analysis, facts, index),
    hookStyle: skill.style || item.hookStyle,
    rationale: [
      `这条角度适合先把“${topicQuery}”讲清楚，再继续展开事实和执行路径。`,
      `这一版更容易承接 Step 1 里的主判断，不会把内容带回泛介绍。`,
      `它和已确认分析保持同一条主线，同时给 Step 3 留出明确开场方式。`,
      `这一版既有传播钩子，也能承接后续文案和分镜。`,
    ][index],
  }));

  return {
    strategies,
    directionSummary: `${topicQuery} 这一轮标题优先围绕「${analysis?.thesis || analysis?.corePromise || topicQuery}」做结论化表达，同时保证不同角度之间能明显区分。`,
  };
}

function deriveStep2TitlesFromStrategy(context, strategyStagePayload) {
  const topicQuery = String(context?.topic?.query || '当前主题').trim();
  const analysis = context?.pipeline?.selectedAnalysis || {};
  const facts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const skill = getCurrentStepSkill(context);
  const variant = getStep2Variant(context);
  const previousOptions = Array.isArray(context?.generation?.previousPayload?.options)
    ? context.generation.previousPayload.options
    : [];
  const entity = deriveTopicEntity(topicQuery, facts);
  const competitor = deriveCompetitorLabel(topicQuery, facts) || 'GPT';
  const focus = deriveFocusPhrase(topicQuery, facts);
  const angleTemplates = {
    '结论先行': [
      `${entity} 这次真上强度了，${focus}开始给${competitor}压力了`,
      `${entity} 最该看的不是热闹，是${focus}`,
    ],
    '问题追问': [
      `${entity} 真能给${competitor}压力吗？先看${focus}`,
      `${entity} 值不值得重点盯？关键看${focus}`,
    ],
    '反差拆解': [
      `很多人还把 ${entity} 当热闹，但它真正猛的是${focus}`,
      `别只看 ${entity} 的名气，这次最狠的是${focus}`,
    ],
    '解释型': [
      `${entity} 这次到底强在哪？我会先看${focus}`,
      `如果只看 ${entity} 一个点，我会先看${focus}`,
    ],
  };

  const strategies = Array.isArray(strategyStagePayload?.strategies) ? strategyStagePayload.strategies : [];
  const options = strategies.map((strategy, index) => {
    const library = STEP2_STRATEGY_LIBRARY.find((item) => item.angle === strategy.angle) || STEP2_STRATEGY_LIBRARY[index % STEP2_STRATEGY_LIBRARY.length];
    const candidateTemplates = angleTemplates[strategy.angle] || library.titleTemplates.map((template) => fillTemplate(template, {topic: topicQuery}));
    const title = compactClause(candidateTemplates[(variant + index) % candidateTemplates.length], 34);
    const previousTitle = String(previousOptions[index]?.title || '').trim();
    const score = Math.max(76, 92 - index * 3 - (variant % 2));

    return {
      title: title === previousTitle ? `${title}（这次换个切口）` : title,
      angle: strategy.angle,
      score,
      rationale: `标题围绕「${strategy.angle}」展开，直接承接 Step 1 的主判断：${analysis?.thesis || analysis?.corePromise || topicQuery}。`,
      evidenceAnchor: strategy.evidenceAnchor,
      hookStyle: skill.style || strategy.hookStyle || '先抛结论',
    };
  });

  const selectedIndex = 0;
  return {
    titles: {
      options,
      selectedIndex,
      selectedReason: `这一条最适合作为当前主标题，因为它最直接承接 Step 1 的主结论，同时保留继续生成 Hook 和正文的空间。`,
    },
    projectName: options[selectedIndex]?.title || `${topicQuery} 标题拆解`,
  };
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toRoundedPositiveNumber(value, fallback = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function compactClause(value, maxLength = 58) {
  const safe = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[。！？]+/g, '。')
    .trim();
  if (!safe) {
    return '';
  }

  const firstClause = safe.split(/[。！？；\n]/)[0]?.trim() || safe;
  if (firstClause.length <= maxLength) {
    return firstClause;
  }
  return `${firstClause.slice(0, maxLength - 1).trim()}…`;
}

function splitInstructionTerms(text) {
  return [...new Set(
    String(text || '')
      .split(/[，,、；;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2),
  )];
}

function extractDurationSeconds(lengthInstruction) {
  const safe = String(lengthInstruction || '').trim();
  if (!safe) {
    return null;
  }

  const minuteMatch = safe.match(/(\d+(?:\.\d+)?)\s*分(?:钟)?/);
  if (minuteMatch) {
    return Math.round(Number(minuteMatch[1]) * 60);
  }

  const secondMatch = safe.match(/(\d+(?:\.\d+)?)\s*秒/);
  if (secondMatch) {
    return Math.round(Number(secondMatch[1]));
  }

  return null;
}

function extractWordCount(lengthInstruction) {
  const safe = String(lengthInstruction || '').trim();
  if (!safe) {
    return null;
  }

  const rangeMatch = safe.match(/(\d+)\s*[-~到至]\s*(\d+)\s*字/);
  if (rangeMatch) {
    return Math.round((Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2);
  }

  const exactMatch = safe.match(/(\d+)\s*字/);
  if (exactMatch) {
    return Math.round(Number(exactMatch[1]));
  }

  return null;
}

function joinCopySentences(sentences) {
  return sentences
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('');
}

function measureStep3CopyLength(copy) {
  return [
    String(copy?.hook || '').trim(),
    ...(Array.isArray(copy?.body) ? copy.body.map((item) => String(item?.text || '').trim()) : []),
    String(copy?.cta || '').trim(),
  ].join('').length;
}

function compressTextToBudget(text, budget) {
  const safe = String(text || '').trim();
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

  const trimmed = result.trim();
  if (!trimmed) {
    return compactClause(safe, budget);
  }
  return trimmed.length > budget ? compactClause(trimmed, budget) : trimmed;
}

function stageTemperature(mode, baseline, regenerate) {
  return mode === 'regenerate' ? regenerate : baseline;
}

function baseMessages(systemInstruction, prompt) {
  return [
    {
      role: 'developer',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];
}

function buildSharedPrompt(stepId, stageName, context, extraInstructions, schema, contextPayload) {
  const stepLabel = {
    1: '逻辑分析',
    2: '标题生成',
    3: '内容生成',
  }[stepId] || `步骤 ${stepId}`;
  const regenerateInstruction = context.generation.mode === 'regenerate'
    ? `这是第 ${context.generation.attempt} 次重新生成，你必须与上一版明显不同，至少改变切入角度、结构顺序、措辞风格中的两项。上一版摘要：${context.generation.previousOutputSummary || '无'}`
    : '这是首次生成，优先保证稳定、具体、可执行。';

  return [
    `你正在为短视频工作流生成 Step ${stepId}「${stepLabel}」的${stageName}结果。`,
    '你必须返回严格 JSON，不要返回 markdown，不要解释。',
    '内容服务中文短视频策划工作流，避免空话、营销腔、模板句。',
    regenerateInstruction,
    extraInstructions,
    '',
    '上下文：',
    JSON.stringify(contextPayload, null, 2),
    '',
    '只允许返回这个 JSON 结构：',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

function getCurrentStepSkill(context) {
  const skill = context?.pipeline?.currentStepSkill && typeof context.pipeline.currentStepSkill === 'object'
    ? context.pipeline.currentStepSkill
    : {};
  const step3Defaults = STEP3_SKILL_DEFAULTS[String(skill.presetId || '').trim()] || {};

  return {
    presetId: String(skill.presetId || '').trim(),
    presetLabel: String(skill.presetLabel || '').trim(),
    goal: String(skill.goal || '').trim(),
    style: String(skill.style || '').trim(),
    emphasis: String(skill.emphasis || '').trim(),
    avoid: String(skill.avoid || '').trim(),
    notes: String(skill.notes || '').trim(),
    targetDurationSeconds: toRoundedPositiveNumber(skill.targetDurationSeconds, step3Defaults.targetDurationSeconds || null),
    targetWordCount: toRoundedPositiveNumber(skill.targetWordCount, step3Defaults.targetWordCount || null),
    antiAiLevel: ['natural', 'strong', 'max'].includes(String(skill.antiAiLevel || '').trim())
      ? String(skill.antiAiLevel).trim()
      : (step3Defaults.antiAiLevel || 'strong'),
    spokenPersona: String(skill.spokenPersona || step3Defaults.spokenPersona || '').trim(),
  };
}

function buildStepSkillInstruction(context) {
  const skill = getCurrentStepSkill(context);
  const fragments = [];

  if (skill.goal) {
    fragments.push(`goal：${skill.goal}`);
  }
  if (skill.style) {
    fragments.push(`style：${skill.style}`);
  }
  if (skill.emphasis) {
    fragments.push(`emphasis：${skill.emphasis}`);
  }
  if (skill.avoid) {
    fragments.push(`avoid：${skill.avoid}`);
  }
  if (skill.notes) {
    fragments.push(`notes：${skill.notes}`);
  }
  if (skill.targetDurationSeconds) {
    fragments.push(`targetDurationSeconds：${skill.targetDurationSeconds}`);
  }
  if (skill.targetWordCount) {
    fragments.push(`targetWordCount：${skill.targetWordCount}`);
  }
  if (skill.antiAiLevel) {
    fragments.push(`antiAiLevel：${skill.antiAiLevel}`);
  }
  if (skill.spokenPersona) {
    fragments.push(`spokenPersona：${skill.spokenPersona}`);
  }

  if (fragments.length === 0) {
    return '如果没有额外 skill 约束，就按最稳的中文短视频工作流结果输出。';
  }

  return `当前步骤还有结构化 skill 约束，你必须优先满足：${fragments.join('；')}。`;
}

function buildStep1ResearchPrompt(context) {
  const searchResults = Array.isArray(context.pipeline.topicResearch?.results)
    ? context.pipeline.topicResearch.results
    : [];
  const schema = {
    researchFacts: [
      {
        label: 'string',
        fact: 'string',
        evidenceAnchor: 'string',
        sourceTitle: 'string',
      },
    ],
    mainQuestion: 'string',
    audienceFocus: 'string',
    contentAngle: 'string',
    whyNow: 'string',
  };

  return buildSharedPrompt(
    1,
    '检索事实整理',
    context,
    [
      '必须优先基于搜索结果提炼 3-5 条稳定事实线索，不要杜撰搜索结果里没有出现的具体事实。',
      buildStepSkillInstruction(context),
    ].join(' '),
    schema,
    {
      topic: context.topic,
      searchResults,
      stepSkill: getCurrentStepSkill(context),
    },
  );
}

function buildStep1AnalysisPrompt(context, research) {
  const schema = {
    analysis: {
      thesis: 'string',
      audience: 'string',
      corePromise: 'string',
      layers: [
        {label: 'string', insight: 'string', evidence: 'string'},
      ],
      process: [
        {label: 'string', detail: 'string'},
      ],
    },
    analysisBrief: {
      mainQuestion: 'string',
      audienceFocus: 'string',
      narrativeApproach: 'string',
      whyNow: 'string',
    },
  };

  return buildSharedPrompt(
    1,
    '逻辑分析成稿',
    context,
    [
      '必须把搜索事实压缩成短视频可继续复用的分析骨架，layers 与 process 都要能直接进入后续标题和文案环节。',
      buildStepSkillInstruction(context),
    ].join(' '),
    schema,
    {
      topic: context.topic,
      research,
      stepSkill: getCurrentStepSkill(context),
    },
  );
}

function buildStep2StrategyPrompt(context) {
  const schema = {
    strategies: [
      {
        angle: 'string',
        audienceTrigger: 'string',
        evidenceAnchor: 'string',
        hookStyle: 'string',
        rationale: 'string',
      },
    ],
    directionSummary: 'string',
  };

  return buildSharedPrompt(
    2,
    '标题策略设计',
    context,
    [
      '必须先基于已确认的 Step 1 分析，拆出 3-4 个明显不同的标题角度，每个角度都要指向不同的触发点与证据锚点。',
      buildStepSkillInstruction(context),
    ].join(' '),
    schema,
    {
      topic: context.topic,
      analysis: context.pipeline.selectedAnalysis,
      researchFacts: context.pipeline.selectedAnalysis?.researchFacts || [],
      stepSkill: getCurrentStepSkill(context),
    },
  );
}

function buildStep2TitlesPrompt(context, strategy) {
  const schema = {
    titles: {
      options: [
        {
          title: 'string',
          angle: 'string',
          score: '0-100 number',
          rationale: 'string',
          evidenceAnchor: 'string',
          hookStyle: 'string',
        },
      ],
      selectedIndex: 'number',
      selectedReason: 'string',
    },
    projectName: 'string',
  };

  return buildSharedPrompt(
    2,
    '标题池成稿',
    context,
    [
      '必须输出 4-5 个差异明显的标题，避免只换个别字；每个标题都要能看出对应的角度、证据锚点和开场方式。',
      buildStepSkillInstruction(context),
    ].join(' '),
    schema,
    {
      topic: context.topic,
      analysis: context.pipeline.selectedAnalysis,
      strategies: strategy.strategies,
      directionSummary: strategy.directionSummary,
      stepSkill: getCurrentStepSkill(context),
    },
  );
}

function getStep3Requirements(context) {
  const requirements = context?.pipeline?.copy?.requirements && typeof context.pipeline.copy.requirements === 'object'
    ? context.pipeline.copy.requirements
    : {};

  return {
    focus: String(requirements.focus || '').trim(),
    avoid: String(requirements.avoid || '').trim(),
    style: String(requirements.style || '').trim(),
    length: String(requirements.length || '').trim(),
  };
}

function getStep3Variant(context) {
  return Math.max(0, Number(context?.generation?.attempt || 0) % STEP3_BLUEPRINTS.length);
}

function getStep3Profile(level) {
  return STEP3_ANTI_AI_PROFILES[level] || STEP3_ANTI_AI_PROFILES.strong;
}

function getStep3AnalysisSource(context) {
  return context?.pipeline?.selectedAnalysis || context?.pipeline?.analysis || {};
}

function getStep3Facts(context) {
  const analysis = getStep3AnalysisSource(context);
  const facts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const layers = Array.isArray(analysis?.layers) ? analysis.layers : [];

  if (facts.length > 0) {
    return facts.slice(0, 4);
  }

  return layers.slice(0, 4).map((item, index) => ({
    label: item?.label || `线索 ${index + 1}`,
    fact: item?.insight || item?.evidence || '',
    evidenceAnchor: item?.evidence || item?.label || '',
    sourceTitle: item?.label || '',
  }));
}

function getStep3Controls(context) {
  const skill = getCurrentStepSkill(context);
  const requirements = getStep3Requirements(context);
  const targetDurationSeconds = clampValue(
    toRoundedPositiveNumber(
      skill.targetDurationSeconds,
      extractDurationSeconds(requirements.length) || 60,
    ),
    15,
    240,
  );
  const targetWordCount = clampValue(
    toRoundedPositiveNumber(
      skill.targetWordCount,
      extractWordCount(requirements.length) || Math.round(targetDurationSeconds * 3.5),
    ),
    80,
    1200,
  );
  const antiAiLevel = ['natural', 'strong', 'max'].includes(String(skill.antiAiLevel || '').trim())
    ? String(skill.antiAiLevel).trim()
    : 'strong';
  const spokenPersona = String(
    skill.spokenPersona
    || (antiAiLevel === 'max'
      ? '像真人对着你直接讲，不背稿，不端着。'
      : '像真人口播，在说重点，不是在写报告。'),
  ).trim();

  return {
    targetDurationSeconds,
    targetWordCount,
    antiAiLevel,
    spokenPersona,
    profile: getStep3Profile(antiAiLevel),
    sectionCount: targetDurationSeconds >= 95 || targetWordCount >= 360 ? 4 : 3,
    detailLevel: targetWordCount >= 420 ? 3 : targetWordCount >= 240 ? 2 : 1,
    variant: getStep3Variant(context),
    avoidTerms: [
      ...splitInstructionTerms(skill.avoid),
      ...splitInstructionTerms(requirements.avoid),
    ],
  };
}

function buildStep3ToneText(context, controls) {
  const skill = getCurrentStepSkill(context);
  const requirements = getStep3Requirements(context);
  const styleText = compactClause(requirements.style || skill.style || '短句、口语、结论先行', 42);
  return `${controls.profile.label}，${controls.spokenPersona} ${styleText}`.trim();
}

function summarizeAudience(analysis) {
  return compactClause(
    analysis?.analysisBrief?.audienceFocus
    || analysis?.audience
    || '想快速看懂这件事、又不想听空话的人',
    40,
  );
}

function buildStep3FocusLine(context) {
  const skill = getCurrentStepSkill(context);
  const requirements = getStep3Requirements(context);
  return compactClause(
    requirements.focus
    || skill.emphasis
    || skill.goal
    || getStep3AnalysisSource(context)?.corePromise
    || getStep3AnalysisSource(context)?.thesis
    || context?.topic?.query,
    46,
  );
}

function buildStep3ComparisonLine(topicLabel, focusLine) {
  return compactClause(
    `和那种只报概念、只堆背景的讲法比，这次更该把重点压在${focusLine || topicLabel}上。`,
    54,
  );
}

function sanitizeStep3Text(text, controls, topicLabel) {
  let safe = String(text || '').trim();
  for (const term of controls.avoidTerms || []) {
    if (!term || term === topicLabel) {
      continue;
    }
    safe = safe.replaceAll(term, '');
  }
  return safe
    .replace(/\s+/g, ' ')
    .replace(/，，+/g, '，')
    .replace(/。。+/g, '。')
    .trim();
}

function deriveStep3BriefFromContext(context) {
  return buildStep3SkillDrivenBrief(context, ensureStepSkillReady(3));
}

function deriveStep3CopyFromBrief(context, briefStagePayload) {
  return buildStep3SkillDrivenCopy(context, briefStagePayload, ensureStepSkillReady(3));
}

function buildStep3RequirementsInstruction(context) {
  const requirements = getStep3Requirements(context);
  if (!Object.values(requirements).some(Boolean)) {
    return buildStepSkillInstruction(context);
  }

  return [
    buildStepSkillInstruction(context),
    '如果 requirements 提供了生成要求，你必须优先满足：focus 决定主推进重点；avoid 里的内容和表达禁止写进输出；style 决定文风口吻；length 决定篇幅、段落密度和推进速度。',
  ].join(' ');
}

function buildStep3BriefPrompt(context) {
  return buildStep3SkillDrivenBriefPrompt(context, ensureStepSkillReady(3));
}

function buildStep3CopyPrompt(context, brief) {
  return buildStep3SkillDrivenCopyPrompt(context, brief, ensureStepSkillReady(3));
}

async function runStage(stepId, stageKey, context, buildPrompt, validator, options = {}) {
  const prompt = buildPrompt(context, options.previousStage);
  const result = await generateStructuredJson({
    messages: baseMessages(
      'You generate strict JSON for a Chinese short-video workflow. Return valid JSON only.',
      prompt,
    ),
    temperature: stageTemperature(context.generation.mode, options.temperature || 0.55, options.regenerateTemperature || 0.85),
    topP: options.topP || 1,
  });
  const payload = validator(result.payload, context);
  return {
    stepId,
    stageKey,
    model: result.model,
    payload,
  };
}

function enrichInputWithTopicResearch(stepId, input, topicResearch) {
  const topicQuery = getInputTopic(input);
  return {
    ...input,
    pipelineState: {
      ...(input.pipelineState || {}),
      inputTopic: input.pipelineState?.inputTopic || topicQuery,
      inputTitleKeywords: input.pipelineState?.inputTitleKeywords || topicQuery,
      ...(topicResearch ? {topicResearch} : {}),
    },
  };
}

async function generateStep123Workflow(input) {
  const stepId = Number(input.stepId);
  if (![1, 2, 3].includes(stepId)) {
    throw new WorkflowGenerationError({
      status: 500,
      code: 'STEP123_UNSUPPORTED',
      message: `Step 1-3 生成器不支持步骤 ${stepId}`,
    });
  }

  if (stepId === 2 && !input.pipelineState?.selectedAnalysis) {
    throw new WorkflowGenerationError({
      status: 409,
      code: 'STEP1_NOT_CONFIRMED',
      message: '请先确认 Step 1（逻辑分析）后再生成标题',
    });
  }

  if (stepId === 3 && !input.pipelineState?.selectedTitleId) {
    throw new WorkflowGenerationError({
      status: 409,
      code: 'STEP2_TITLE_REQUIRED',
      message: '请先在 Step 2 选择并确认标题',
    });
  }

  const skillSpec = ensureStepSkillReady(stepId);
  const topicQuery = getInputTopic(input);
  if (!topicQuery) {
    throw new WorkflowGenerationError({
      status: 422,
      code: 'STEP_TOPIC_REQUIRED',
      message: '请先输入明确的标题关键词',
    });
  }

  let topicResearch = input.pipelineState?.topicResearch || null;
  if (stepId === 1) {
    try {
      topicResearch = await searchTopicResearch(topicQuery);
    } catch (error) {
      throw new WorkflowGenerationError({
        status: 422,
        code: 'STEP1_SEARCH_FAILED',
        message: `标题检索失败：${error.message}`,
      });
    }
  }

  const enrichedInput = enrichInputWithTopicResearch(stepId, input, topicResearch);
  const context = buildStep123Context(stepId, enrichedInput);

  try {
    if (stepId === 1) {
      const researchStage = {
        stepId,
        stageKey: 'research',
        model: 'search-derived',
        payload: validateStep1Research(deriveStep1ResearchFromSearch(context), context),
      };
      const analysisStage = {
        stepId,
        stageKey: 'analysis',
        model: 'deterministic-step1',
        payload: validateStep1Analysis(deriveStep1AnalysisFromResearch(context, researchStage.payload)),
      };
      const enriched = enrichStepResult(
        stepId,
        normalizeStep1Payload(researchStage.payload, analysisStage.payload, enrichedInput),
        enrichedInput,
        skillSpec,
      );

      return {
        stepId,
        source: 'deterministic',
        model: analysisStage.model,
        generatedAt: new Date().toISOString(),
        payload: enriched.payload,
        resolvedSkill: enriched.resolvedSkill,
        evaluation: enriched.evaluation,
      };
    }

    if (stepId === 2) {
      const strategyStage = {
        stepId,
        stageKey: 'strategy',
        model: 'deterministic-step2',
        payload: validateStep2Strategy(deriveStep2StrategyFromAnalysis(context), context),
      };
      const titlesStage = {
        stepId,
        stageKey: 'titles',
        model: 'deterministic-step2',
        payload: validateStep2Titles(deriveStep2TitlesFromStrategy(context, strategyStage.payload), context),
      };
      const enriched = enrichStepResult(
        stepId,
        normalizeStep2Payload(strategyStage.payload, titlesStage.payload, enrichedInput),
        enrichedInput,
        skillSpec,
      );

      return {
        stepId,
        source: 'deterministic',
        model: titlesStage.model,
        generatedAt: new Date().toISOString(),
        payload: enriched.payload,
        resolvedSkill: enriched.resolvedSkill,
        evaluation: enriched.evaluation,
      };
    }

    const llmEnabled = hasWorkflowLLM();
    if (llmEnabled) {
      try {
        const briefStage = await runStage(
          stepId,
          'brief',
          context,
          (stageContext) => buildStep3BriefPrompt(stageContext),
          validateStep3Brief,
          {
            temperature: 0.42,
            regenerateTemperature: 0.68,
          },
        );
        const copyStage = await runStage(
          stepId,
          'copy',
          context,
          (stageContext, previousStage) => buildStep3CopyPrompt(stageContext, previousStage),
          validateStep3Copy,
          {
            previousStage: briefStage.payload,
            temperature: 0.52,
            regenerateTemperature: 0.78,
          },
        );
        const normalizedSkillPayload = normalizeStep3Payload(briefStage.payload, copyStage.payload, enrichedInput);
        const alignment = validateStep3SkillAlignment(context, normalizedSkillPayload, skillSpec);
        if (!alignment.ok) {
          throw new Error(`Step 3 LLM 结果未通过 skill 对齐检查：${alignment.reasons.join('；')}`);
        }
        const enriched = enrichStepResult(
          stepId,
          normalizedSkillPayload,
          enrichedInput,
          skillSpec,
        );

        return {
          stepId,
          source: 'skill-llm',
          model: copyStage.model,
          generatedAt: new Date().toISOString(),
          payload: enriched.payload,
          resolvedSkill: enriched.resolvedSkill,
          evaluation: enriched.evaluation,
        };
      } catch (error) {
        // Keep Step 3 responsive: if the model path fails, fall back to deterministic skill execution.
      }
    }

    const briefStage = {
      stepId,
      stageKey: 'brief',
      model: llmEnabled ? 'skill-deterministic-step3-fallback' : 'skill-deterministic-step3',
      payload: validateStep3Brief(deriveStep3BriefFromContext(context), context),
    };
    const copyStage = {
      stepId,
      stageKey: 'copy',
      model: llmEnabled ? 'skill-deterministic-step3-fallback' : 'skill-deterministic-step3',
      payload: validateStep3Copy(deriveStep3CopyFromBrief(context, briefStage.payload), context),
    };
    const enriched = enrichStepResult(
      stepId,
      normalizeStep3Payload(briefStage.payload, copyStage.payload, enrichedInput),
      enrichedInput,
      skillSpec,
    );

    return {
      stepId,
      source: llmEnabled ? 'skill-deterministic-fallback' : 'skill-deterministic',
      model: copyStage.model,
      generatedAt: new Date().toISOString(),
      payload: enriched.payload,
      resolvedSkill: enriched.resolvedSkill,
      evaluation: enriched.evaluation,
    };
  } catch (error) {
    throw toWorkflowGenerationError(error, {
      status: 500,
      code: 'STEP123_GENERATION_FAILED',
      message: `Step ${stepId} 生成失败`,
    });
  }
}

module.exports = {
  generateStep123Workflow,
};

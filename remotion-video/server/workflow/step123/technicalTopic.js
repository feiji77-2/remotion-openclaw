function safeString(value) {
  return String(value || '').trim();
}

function pushText(parts, value) {
  const safe = safeString(value);
  if (safe) {
    parts.push(safe);
  }
}

function buildCorpus(input) {
  if (Array.isArray(input)) {
    return input.map((item) => buildCorpus(item)).filter(Boolean).join(' ');
  }

  if (typeof input === 'string' || typeof input === 'number') {
    return safeString(input);
  }

  if (!input || typeof input !== 'object') {
    return '';
  }

  const parts = [];
  if (typeof input.topic === 'object' && input.topic !== null) {
    pushText(parts, buildCorpus(input.topic));
  } else {
    pushText(parts, input.topic);
  }
  if (typeof input.pipeline === 'object' && input.pipeline !== null) {
    pushText(parts, buildCorpus(input.pipeline));
  }
  pushText(parts, input.query);
  pushText(parts, input.title);
  pushText(parts, input.inputTopic);
  pushText(parts, input.inputTitleKeywords);
  pushText(parts, input.fact);
  pushText(parts, input.text);
  pushText(parts, input.label);
  pushText(parts, input.goal);
  pushText(parts, input.beat);
  pushText(parts, input.sceneIntent);
  pushText(parts, input.evidenceAnchor);
  pushText(parts, input.sourceTitle);

  if (Array.isArray(input.dataPoints)) {
    pushText(parts, input.dataPoints.join(' '));
  }
  if (Array.isArray(input.keywords)) {
    pushText(parts, input.keywords.join(' '));
  }
  if (Array.isArray(input.mustInclude)) {
    pushText(parts, input.mustInclude.join(' '));
  }

  if (input.selectedTitle && typeof input.selectedTitle === 'object') {
    pushText(parts, input.selectedTitle.title);
    pushText(parts, input.selectedTitle.angle);
    pushText(parts, input.selectedTitle.rationale);
  }

  const factGroups = [
    input.researchFacts,
    input.searchResults,
    input.body,
  ];

  for (const group of factGroups) {
    if (!Array.isArray(group)) {
      continue;
    }

    for (const item of group) {
      if (!item || typeof item !== 'object') {
        pushText(parts, item);
        continue;
      }

      pushText(parts, item.label);
      pushText(parts, item.fact);
      pushText(parts, item.text);
      pushText(parts, item.goal);
      pushText(parts, item.beat);
      pushText(parts, item.snippet);
      pushText(parts, item.title);
      pushText(parts, item.evidenceAnchor);
      pushText(parts, item.sourceTitle);

      if (Array.isArray(item.dataPoints)) {
        pushText(parts, item.dataPoints.join(' '));
      }
      if (Array.isArray(item.keywords)) {
        pushText(parts, item.keywords.join(' '));
      }
      if (Array.isArray(item.mustInclude)) {
        pushText(parts, item.mustInclude.join(' '));
      }
    }
  }

  return parts.join(' ');
}

const AI_TOPIC_PATTERN = /(openai|chatgpt|gpt|claude|anthropic|gemini|deepseek|kimi|moonshot|llama|mistral|qwen|model\s+studio|大模型|模型|人工智能|ai|llm|智能体|agent|多模态|推理模型)/i;
const RELEASE_INTENT_PATTERN = /(发布|上线|更新|升级|新版本|版本|version|release|released|launch|launched|announcement|preview|beta|stable|changelog|发布会)/i;
const DATE_PATTERN = /(?:\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b|\b20\d{2}年\d{1,2}月\d{1,2}日\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*\s+\d{1,2}(?:,\s*20\d{2})?\b)/i;
const VERSION_PATTERN = /(?:\b(?:gpt|claude|gemini|kimi|deepseek|llama|qwen)[- ]?[a-z0-9.]+\b|\bv\d+(?:\.\d+){1,3}\b|\b\d+(?:\.\d+){1,3}\b)/i;
const CAPABILITY_PATTERN = /(agent|workflow|工作流|工具调用|tool use|tool calling|function calling|函数调用|多步骤|multi-step|代码|编码|code|browser|搜索|search|长上下文|context window|上下文窗口|推理|reasoning|多模态|语音|视觉|image|video|memory|mcp|responses api|structured output|json mode|deep research|operator|codex)/i;
const BENCHMARK_PATTERN = /(benchmark|bench|arena|mmlu|mmlu-pro|aime|gpqa|swe-bench|livecodebench|mathvista|pass@1|score|得分|排名|胜率|排行榜|评测|测试集)/i;
const PRODUCT_PATTERN = /(api|sdk|cli|chatgpt|copilot|codex|responses|assistants|agent sdk|mcp|integration|集成|插件|workspace|企业版|开发者|deployment|部署|兼容|兼容性|support|支持平台)/i;
const PRICING_PATTERN = /(价格|定价|免费|套餐|token|tokens?|每百万|million tokens|rate limit|速率限制|配额|额度|latency|延迟|上下文窗口|成本|enterprise|plus|pro)/i;
const SAFETY_PATTERN = /(安全|安全评估|红队|red team|guardrail|对齐|防护|审核|safety)/i;
const COMPARISON_PATTERN = /(对比|相比|差异|差别|优于|超过|领先|落后|持平|vs\b|against|better than|worse than|排行|排名)/i;
const NUMERIC_DETAIL_PATTERN = /(?:\b\d+(?:\.\d+)?\s*(?:%|x|倍|ms|s|秒|分钟|小时|天|周|月|年|k|m|b|万|亿)\b|\$\d+(?:\.\d+)?|\b\d{2,}\b)/gi;
const GENERIC_PATTERN = /(定位变化|角色变化|效率提升|工作流改变|能力更强|更聪明|更厉害|更强大|更好用了|不只是|而是)/i;

function detectTechnicalTopic(input) {
  const corpus = buildCorpus(input);
  const isAiTopic = AI_TOPIC_PATTERN.test(corpus);
  const isReleaseTopic = isAiTopic && RELEASE_INTENT_PATTERN.test(corpus);

  return {
    corpus,
    isAiTopic,
    isReleaseTopic,
    requiresTechnicalDetail: isAiTopic,
  };
}

function analyzeTechnicalDetails(input) {
  const text = buildCorpus(input);
  const categories = new Set();

  if (RELEASE_INTENT_PATTERN.test(text) || DATE_PATTERN.test(text) || VERSION_PATTERN.test(text)) {
    categories.add('release');
  }
  if (CAPABILITY_PATTERN.test(text)) {
    categories.add('capability');
  }
  if (BENCHMARK_PATTERN.test(text)) {
    categories.add('benchmark');
  }
  if (PRODUCT_PATTERN.test(text)) {
    categories.add('product');
  }
  if (PRICING_PATTERN.test(text)) {
    categories.add('pricing');
  }
  if (SAFETY_PATTERN.test(text)) {
    categories.add('safety');
  }
  if (COMPARISON_PATTERN.test(text)) {
    categories.add('comparison');
  }

  const numericMatches = [...new Set((text.match(NUMERIC_DETAIL_PATTERN) || []).map((item) => item.trim()))];
  const hasVersionOrDate = DATE_PATTERN.test(text) || VERSION_PATTERN.test(text);
  const hasReleaseDetail = categories.has('release') && hasVersionOrDate;
  const hasHardUpdateCategory = categories.has('capability')
    || categories.has('benchmark')
    || categories.has('product')
    || categories.has('pricing')
    || categories.has('safety');
  const hasConcreteDetail = hasReleaseDetail
    || (hasHardUpdateCategory && numericMatches.length > 0)
    || categories.size >= 2;
  const genericOnly = categories.size === 0 && GENERIC_PATTERN.test(text);

  return {
    text,
    categories: [...categories],
    categoryCount: categories.size,
    numericMatches,
    hasVersionOrDate,
    hasReleaseDetail,
    hasHardUpdateCategory,
    hasConcreteDetail,
    hasComparison: categories.has('comparison'),
    genericOnly,
  };
}

function scoreTechnicalDetails(input) {
  const detail = analyzeTechnicalDetails(input);
  return (
    (detail.hasReleaseDetail ? 10 : 0)
    + (detail.hasHardUpdateCategory ? 8 : 0)
    + (detail.categories.includes('benchmark') ? 4 : 0)
    + (detail.categories.includes('product') ? 3 : 0)
    + (detail.categories.includes('pricing') ? 3 : 0)
    + (detail.categories.includes('safety') ? 2 : 0)
    + (detail.categories.includes('comparison') ? 2 : 0)
    + Math.min(detail.numericMatches.length, 4)
    - (detail.genericOnly ? 6 : 0)
  );
}

const REQUIRED_FACT_CATEGORIES = {
  release: { pattern: /(发布|上线|更新|新版本|版本|v\d|20\d{2}|发布日)/i, label: '发布动作' },
  capability: { pattern: /(能力|功能|特性|支持|增强|升级|提升|改进|优化)/i, label: '核心能力' },
  benchmark: { pattern: /(\d+%|提升\d|快\d|强\d|基准|benchmark|性能|效率|速度)/i, label: '性能数据' },
  api: { pattern: /(api|接口|函数调用|tool.?call|插件|扩展)/i, label: 'API变化' },
  pricing: { pattern: /(价格|定价|免费|付费|token|成本|$|费用|限制|quota)/i, label: '定价限制' },
  comparison: { pattern: /(对比|比较|优于|不如|超过|差距|Claude|GPT|Gemini|竞品)/i, label: '竞品对比' },
};

const GENERIC_PATTERNS = [
  /(更强了|更好了|有提升|进步了|升级了)/,
  /(压力|热度|关注|讨论)/,
  /(工作流|改变|影响)/,
];

function isGenericFact(fact) {
  return GENERIC_PATTERNS.some(pattern => pattern.test(fact));
}

function classifyFact(fact) {
  const categories = [];
  for (const [key, config] of Object.entries(REQUIRED_FACT_CATEGORIES)) {
    if (config.pattern.test(fact)) {
      categories.push(key);
    }
  }
  return categories;
}

const GENERATE_FACT_PROMPT = `你是科技内容事实生成专家。根据给定的主题，生成具体的、有信息量的技术事实。

主题：{topic}

需要生成的事实类别：{categories}

要求：
1. 每个事实必须包含具体的数字、数据、对比或可验证的信息
2. 不要泛泛而谈，要有具体的锚点
3. 用中文输出
4. 格式要求：直接输出事实内容，不要解释，不要前缀

示例格式：
- 性能提升：在标准 benchmark 测试中，效率相比上一代提升约 40%
- API 变化：新增函数调用能力，支持 128K 上下文窗口
- 定价策略：每 1000 token $0.01，比 GPT-4 便宜 80%

直接输出 {count} 个事实：`;

async function generateSpecificFactsViaLLM(topicLabel, categories, generateFn) {
  const categoryLabels = categories.map(c => REQUIRED_FACT_CATEGORIES[c]?.label || c).join('、');
  const prompt = GENERATE_FACT_PROMPT
    .replace('{topic}', topicLabel)
    .replace('{categories}', categoryLabels)
    .replace('{count}', categories.length);

  const messages = [
    { role: 'system', content: '你是一个科技内容创作助手，擅长生成具体、有信息量的技术事实。' },
    { role: 'user', content: prompt },
  ];

  try {
    const result = await generateFn({ messages, temperature: 0.7 });
    const content = typeof result === 'string' ? result : (result?.content || result?.text || '');

    const facts = content
      .split(/\n|；|。/)
      .map(line => line.replace(/^[-\d]+[\.、:：]\s*/, '').trim())
      .filter(line => line.length > 10 && line.length < 200);

    return facts.slice(0, categories.length);
  } catch (error) {
    console.warn('[Step1] LLM 生成事实失败:', error.message);
    return [];
  }
}

function buildDefaultFact(category, topicLabel) {
  const defaults = {
    release: `${topicLabel || '该技术'} 这类发布至少要确认版本号、发布时间和官方 release note，先判断是不是主线升级。`,
    capability: `${topicLabel || '该技术'} 至少要补一条机制变化，例如 Agent、多步骤 tool calling、长上下文或代码任务能力，不要只说“更强了”。`,
    benchmark: `${topicLabel || '该技术'} 还需要 benchmark 锚点，例如 SWE-bench、MMLU、成功率或 pass@1 这类评测结果，不能只写“性能提升”。`,
    api: `${topicLabel || '该技术'} 要补开发者侧更新，比如 Responses API、函数调用、SDK 兼容性或 rate limit 变化。`,
    pricing: `${topicLabel || '该技术'} 的真实落地还要看 token 定价、配额、上下文窗口成本或速率限制。`,
    comparison: `${topicLabel || '该技术'} 最好补充与 GPT、Claude、Gemini 或旧版本的 benchmark / API 差异。`,
  };
  return {
    label: REQUIRED_FACT_CATEGORIES[category].label,
    fact: defaults[category] || `${topicLabel || '该技术'} 的 ${category} 信息`,
    evidenceAnchor: '需要核实',
    isAutoGenerated: true,
  };
}

async function validateAndEnrichFacts(facts, context, generateStructuredJsonFn) {
  if (!Array.isArray(facts) || facts.length === 0) {
    return { facts: [], missingCategories: Object.keys(REQUIRED_FACT_CATEGORIES), enriched: false };
  }

  const topicLabel = context?.topic?.query || context?.pipeline?.inputTopic || '该技术';
  const topicState = detectTechnicalTopic(context);

  if (!topicState.requiresTechnicalDetail) {
    return { facts, missingCategories: [], enriched: false };
  }

  const existingCategories = new Set();
  const validatedFacts = facts.map(fact => {
    const text = [fact.label, fact.fact, fact.evidenceAnchor].join(' ');
    const categories = classifyFact(text);

    if (categories.length > 0) {
      categories.forEach(cat => existingCategories.add(cat));
    }

    if (isGenericFact(fact.fact)) {
      return { ...fact, _isGeneric: true };
    }

    return { ...fact, _categories: categories };
  });

  const hardCategories = ['capability', 'benchmark', 'api', 'pricing'];
  const requiredSet = topicState.isReleaseTopic
    ? ['release', ...hardCategories]
    : hardCategories.slice(0, 2);

  const missingCategories = requiredSet.filter(cat => !existingCategories.has(cat));

  if (missingCategories.length === 0) {
    return { facts: validatedFacts, missingCategories: [], enriched: false };
  }

  const enrichedFacts = [...validatedFacts];

  if (generateStructuredJsonFn) {
    const llmFacts = await generateSpecificFactsViaLLM(topicLabel, missingCategories, generateStructuredJsonFn);

    for (let i = 0; i < missingCategories.length; i++) {
      const category = missingCategories[i];
      const llmFact = llmFacts[i];

      if (llmFact && llmFact.length > 10) {
        enrichedFacts.push({
          label: REQUIRED_FACT_CATEGORIES[category].label,
          fact: llmFact,
          evidenceAnchor: 'LLM 生成',
          isAutoGenerated: true,
          isLLMGenerated: true,
        });
      } else {
        const defaultFact = buildDefaultFact(category, topicLabel);
        enrichedFacts.push(defaultFact);
      }
      existingCategories.add(category);
    }

    return {
      facts: enrichedFacts,
      missingCategories: [],
      enriched: true,
      warning: `已通过 LLM 补充缺失类别: ${missingCategories.join(', ')}`,
    };
  }

  for (const category of missingCategories) {
    const defaultFact = buildDefaultFact(category, topicLabel);
    enrichedFacts.push(defaultFact);
    existingCategories.add(category);
  }

  return {
    facts: enrichedFacts,
    missingCategories: [],
    enriched: true,
    warning: `已自动补充缺失类别: ${missingCategories.join(', ')}`,
  };
}

module.exports = {
  analyzeTechnicalDetails,
  detectTechnicalTopic,
  scoreTechnicalDetails,
  validateAndEnrichFacts,
  generateSpecificFactsViaLLM,
  classifyFact,
  isGenericFact,
};

const {WorkflowGenerationError} = require('./errors');
const {analyzeTechnicalDetails, detectTechnicalTopic} = require('./technicalTopic');

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function tokenize(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (!safe) {
    return [];
  }

  const tokens = safe
    .replace(/[“”"'‘’]+/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  const expanded = new Set(tokens);
  for (const token of tokens) {
    const segments = token.match(/[\p{Script=Han}]+|[\p{L}\p{N}]+/gu) || [];
    for (const segment of segments) {
      if (/^[\p{Script=Han}]+$/u.test(segment) && segment.length >= 2) {
        expanded.add(segment);
        for (let index = 0; index < segment.length - 1; index += 1) {
          expanded.add(segment.slice(index, index + 2));
        }
      } else if (segment.length >= 2) {
        expanded.add(segment);
      }
    }
  }

  return [...expanded].filter((item) => item.length >= 2);
}

function shingle(text, size = 3) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return new Set();
  }

  if (normalized.length <= size) {
    return new Set([normalized]);
  }

  const shards = new Set();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    shards.add(normalized.slice(index, index + size));
  }
  return shards;
}

function jaccard(leftSet, rightSet) {
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  }

  return intersection / (leftSet.size + rightSet.size - intersection);
}

function fail(message, code, details) {
  throw new WorkflowGenerationError({
    status: 422,
    code,
    message,
    details,
  });
}

function ensureString(value, label, code) {
  const safe = String(value || '').trim();
  if (!safe) {
    fail(`${label} 不能为空`, code, {label});
  }
  return safe;
}

function ensureArray(value, label, minLength, code) {
  const safe = Array.isArray(value) ? value : [];
  if (safe.length < minLength) {
    fail(`${label} 至少需要 ${minLength} 项`, code, {label, minLength});
  }
  return safe;
}

function ensureStringArray(value, fallback = [], max = 8) {
  const normalized = [...new Set(
    (Array.isArray(value) ? value : fallback)
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];
  return normalized.slice(0, max);
}

function normalizeMechanismDepth(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const normalized = {
    level: String(value.level || '').trim(),
    explains: String(value.explains || '').trim(),
    technicalTerms: ensureStringArray(value.technicalTerms, [], 6),
    analogy: String(value.analogy || '').trim(),
    visualHint: String(value.visualHint || '').trim(),
  };

  return Object.values(normalized).some((item) => (
    Array.isArray(item) ? item.length > 0 : Boolean(item)
  ))
    ? normalized
    : null;
}

function buildTechnicalTopicState(context, extra = {}) {
  return detectTechnicalTopic({
    topic: context?.topic?.query,
    inputTopic: context?.topic?.inputTopic || context?.pipeline?.inputTopic,
    inputTitleKeywords: context?.topic?.inputTitleKeywords || context?.pipeline?.inputTitleKeywords,
    selectedTitle: context?.pipeline?.selectedTitle,
    researchFacts: extra.researchFacts,
    searchResults: context?.pipeline?.topicResearch?.results,
    body: extra.body,
  });
}

function validateStep1TechnicalResearch(facts, context) {
  const topicState = buildTechnicalTopicState(context, {researchFacts: facts});
  if (!topicState.requiresTechnicalDetail) {
    return;
  }

  const analyses = facts.map((item) => analyzeTechnicalDetails({
    fact: item.fact,
    evidenceAnchor: item.evidenceAnchor,
    sourceTitle: item.sourceTitle,
  }));
  const concreteFacts = analyses.filter((item) => item.hasConcreteDetail);
  const releaseFacts = analyses.filter((item) => item.hasReleaseDetail);
  const hardFacts = analyses.filter((item) => item.hasHardUpdateCategory);
  const operationalFacts = analyses.filter((item) => (
    item.categories.includes('benchmark')
    || item.categories.includes('product')
    || item.categories.includes('pricing')
    || item.categories.includes('safety')
    || item.categories.includes('comparison')
  ));

  if (concreteFacts.length < 2) {
    fail('AI/模型技术选题的搜索事实太空，至少 2 条要带版本、日期、机制、benchmark、API/工具链或价格限制等硬信息', 'STEP1_RESEARCH_TECH_DETAIL_WEAK', {
      concreteFacts: concreteFacts.length,
      totalFacts: facts.length,
    });
  }

  if (topicState.isReleaseTopic && releaseFacts.length < 1) {
    fail('AI/模型发布选题缺少版本号或发布时间这类发布细节', 'STEP1_RESEARCH_RELEASE_DETAIL_MISSING', {
      releaseFacts: releaseFacts.length,
      totalFacts: facts.length,
    });
  }

  if (hardFacts.length < 2) {
    fail('AI/模型技术选题至少要有 2 条事实讲清具体能力、机制、benchmark、API/工具链或限制，不要只讲“更强了”', 'STEP1_RESEARCH_HARD_UPDATE_MISSING', {
      hardFacts: hardFacts.length,
      totalFacts: facts.length,
    });
  }

  if (operationalFacts.length < 1) {
    fail('AI/模型技术选题至少要补 1 条可执行层更新，例如 benchmark、API/工具链、价格/限制、兼容性或安全机制', 'STEP1_RESEARCH_OPERATIONAL_DETAIL_MISSING', {
      operationalFacts: operationalFacts.length,
      totalFacts: facts.length,
    });
  }
}

function validateStep3TechnicalCopy(copy, body, context) {
  const topicState = buildTechnicalTopicState(context, {body});
  if (!topicState.requiresTechnicalDetail) {
    return;
  }

  const hookAnalysis = analyzeTechnicalDetails(copy.hook);
  const ctaAnalysis = analyzeTechnicalDetails(copy.cta);
  // 技术口播质检只看真正会被说出口的正文，不能让 keywords/dataPoints 这种结构化辅助字段“作弊过关”。
  const blockAnalyses = body.map((item) => analyzeTechnicalDetails(item.text));
  const technicalBlocks = blockAnalyses.filter((item) => item.hasConcreteDetail);
  const hardDetailBlocks = blockAnalyses.filter((item) => item.hasHardUpdateCategory);
  const releaseCovered = hookAnalysis.hasReleaseDetail || blockAnalyses.some((item) => item.hasReleaseDetail);
  const operationalCovered = blockAnalyses.some((item) => (
    item.categories.includes('benchmark')
    || item.categories.includes('product')
    || item.categories.includes('pricing')
    || item.categories.includes('safety')
  ));
  const technicalComparisonCovered = blockAnalyses.some((item) => item.hasComparison && item.hasHardUpdateCategory)
    || blockAnalyses.some((item) => item.categories.includes('benchmark'));
  const totalTechnicalSignals = [
    hookAnalysis,
    ...blockAnalyses,
    ctaAnalysis,
  ].filter((item) => item.hasConcreteDetail || item.hasHardUpdateCategory);

  if (technicalBlocks.length < 1) {
    fail('AI/模型技术选题文案缺少技术细节，建议补充 benchmark、API、能力机制或价格限制等信息', 'STEP3_COPY_TECH_DETAIL_WEAK', {
      technicalBlocks: technicalBlocks.length,
      bodyBlocks: body.length,
    });
  }

  if (topicState.isReleaseTopic && !releaseCovered) {
    fail('AI/模型发布选题文案缺少版本号或发布时间这类发布细节', 'STEP3_COPY_RELEASE_DETAIL_MISSING');
  }

  if (hardDetailBlocks.length < 1 || totalTechnicalSignals.length < 2) {
    fail('AI/模型技术选题文案缺少真正的技术更新点，至少要讲清 2 处能力/机制/benchmark/API/限制变化', 'STEP3_COPY_HARD_UPDATE_MISSING', {
      hardDetailBlocks: hardDetailBlocks.length,
      technicalSignals: totalTechnicalSignals.length,
    });
  }

  if (!operationalCovered) {
    console.warn('[Step3] Warning: operational details check skipped');
  }

  if (!technicalComparisonCovered) {
    console.warn('[Step3] Warning: comparison details check skipped');
  }
}

function validateStep1Research(candidate, context) {
  const facts = ensureArray(candidate?.researchFacts, '搜索事实', 2, 'STEP1_RESEARCH_INVALID')
    .slice(0, 5)
    .map((item, index) => ({
      label: ensureString(item?.label || `事实 ${index + 1}`, '事实标签', 'STEP1_RESEARCH_INVALID'),
      fact: ensureString(item?.fact, '事实内容', 'STEP1_RESEARCH_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '证据锚点', 'STEP1_RESEARCH_INVALID'),
      sourceTitle: String(item?.sourceTitle || '').trim(),
    }));

  validateStep1TechnicalResearch(facts, context);

  return {
    researchFacts: facts,
    mainQuestion: ensureString(candidate?.mainQuestion, '主问题', 'STEP1_RESEARCH_INVALID'),
    audienceFocus: ensureString(candidate?.audienceFocus, '受众关注点', 'STEP1_RESEARCH_INVALID'),
    contentAngle: ensureString(candidate?.contentAngle, '内容角度', 'STEP1_RESEARCH_INVALID'),
    whyNow: ensureString(candidate?.whyNow, '时效说明', 'STEP1_RESEARCH_INVALID'),
  };
}

function validateStep1Analysis(candidate) {
  const analysis = candidate?.analysis && typeof candidate.analysis === 'object' ? candidate.analysis : {};
  const layers = ensureArray(analysis.layers, '逻辑层', 3, 'STEP1_ANALYSIS_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `逻辑层 ${index + 1}`, '逻辑层标签', 'STEP1_ANALYSIS_INVALID'),
      insight: ensureString(item?.insight, '逻辑层洞察', 'STEP1_ANALYSIS_INVALID'),
      evidence: ensureString(item?.evidence, '逻辑层证据', 'STEP1_ANALYSIS_INVALID'),
    }));
  const process = ensureArray(analysis.process, '执行路径', 3, 'STEP1_ANALYSIS_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `步骤 ${index + 1}`, '执行路径标签', 'STEP1_ANALYSIS_INVALID'),
      detail: ensureString(item?.detail, '执行路径说明', 'STEP1_ANALYSIS_INVALID'),
    }));

  return {
    analysis: {
      thesis: ensureString(analysis.thesis, '主命题', 'STEP1_ANALYSIS_INVALID'),
      audience: ensureString(analysis.audience, '受众画像', 'STEP1_ANALYSIS_INVALID'),
      corePromise: ensureString(analysis.corePromise, '核心承诺', 'STEP1_ANALYSIS_INVALID'),
      layers,
      process,
    },
    analysisBrief: {
      mainQuestion: ensureString(candidate?.analysisBrief?.mainQuestion, '分析主问题', 'STEP1_ANALYSIS_INVALID'),
      audienceFocus: ensureString(candidate?.analysisBrief?.audienceFocus, '分析受众关注点', 'STEP1_ANALYSIS_INVALID'),
      narrativeApproach: ensureString(candidate?.analysisBrief?.narrativeApproach, '叙事路径', 'STEP1_ANALYSIS_INVALID'),
      whyNow: ensureString(candidate?.analysisBrief?.whyNow, '时效判断', 'STEP1_ANALYSIS_INVALID'),
    },
  };
}

function validateStep2Strategy(candidate, context) {
  if (!context.pipeline.selectedAnalysis) {
    fail('请先确认 Step 1（逻辑分析）', 'STEP1_NOT_CONFIRMED');
  }

  const strategies = ensureArray(candidate?.strategies, '标题策略', 3, 'STEP2_STRATEGY_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      angle: ensureString(item?.angle || `角度 ${index + 1}`, '标题角度', 'STEP2_STRATEGY_INVALID'),
      audienceTrigger: ensureString(item?.audienceTrigger, '受众触发点', 'STEP2_STRATEGY_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '证据锚点', 'STEP2_STRATEGY_INVALID'),
      hookStyle: ensureString(item?.hookStyle, '开场方式', 'STEP2_STRATEGY_INVALID'),
      rationale: ensureString(item?.rationale, '策略理由', 'STEP2_STRATEGY_INVALID'),
    }));

  return {
    strategies,
    directionSummary: ensureString(candidate?.directionSummary, '策略总结', 'STEP2_STRATEGY_INVALID'),
  };
}

function validateStep2Titles(candidate, context) {
  const titles = candidate?.titles && typeof candidate.titles === 'object' ? candidate.titles : {};
  const options = ensureArray(titles.options, '标题候选', 4, 'STEP2_TITLES_INVALID')
    .slice(0, 5)
    .map((item) => ({
      title: ensureString(item?.title, '标题', 'STEP2_TITLES_INVALID'),
      angle: ensureString(item?.angle, '角度', 'STEP2_TITLES_INVALID'),
      score: Math.max(0, Math.min(100, Math.round(Number(item?.score) || 0))),
      rationale: ensureString(item?.rationale, '标题理由', 'STEP2_TITLES_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '证据锚点', 'STEP2_TITLES_INVALID'),
      hookStyle: ensureString(item?.hookStyle, '开场方式', 'STEP2_TITLES_INVALID'),
    }));
  const uniqueTitles = new Set(options.map((item) => normalizeText(item.title)));
  if (uniqueTitles.size < options.length) {
    fail('标题候选重复度过高，请重新生成', 'STEP2_TITLES_DUPLICATED');
  }

  if (context.generation.mode === 'regenerate' && context.generation.previousPayload?.options) {
    const previousTitles = ensureArray(context.generation.previousPayload.options, '上一版标题候选', 1, 'STEP2_REGENERATE_TOO_SIMILAR')
      .map((item) => normalizeText(item?.title));
    const currentTitles = options.map((item) => normalizeText(item.title));
    const overlap = currentTitles.filter((item) => previousTitles.includes(item)).length / Math.max(previousTitles.length, currentTitles.length);
    if (overlap >= 0.6) {
      fail('重新生成的标题与上一版过于接近，请再次调整角度后重试', 'STEP2_REGENERATE_TOO_SIMILAR', {
        overlap,
      });
    }
  }

  const selectedIndex = Math.max(0, Math.min(options.length - 1, Math.round(Number(titles.selectedIndex) || 0)));

  return {
    titles: {
      options,
      selectedIndex,
      selectedReason: ensureString(titles.selectedReason, '入选理由', 'STEP2_TITLES_INVALID'),
    },
    projectName: ensureString(candidate?.projectName, '项目名称', 'STEP2_TITLES_INVALID'),
  };
}

function validateStep3Brief(candidate, context) {
  if (!context.pipeline.selectedTitle) {
    fail('请先在 Step 2 选择并确认标题', 'STEP2_TITLE_REQUIRED');
  }

  const outline = ensureArray(candidate?.outline, '文案大纲', 2, 'STEP3_BRIEF_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `节拍 ${index + 1}`, '大纲标签', 'STEP3_BRIEF_INVALID'),
      type: ensureString(item?.type || item?.label || `节拍 ${index + 1}`, '大纲类型', 'STEP3_BRIEF_INVALID'),
      beat: ensureString(item?.beat, '大纲节拍', 'STEP3_BRIEF_INVALID'),
      goal: ensureString(item?.goal, '大纲目标', 'STEP3_BRIEF_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '大纲证据锚点', 'STEP3_BRIEF_INVALID'),
      sceneIntent: ensureString(item?.sceneIntent || item?.label || item?.goal, '大纲场景意图', 'STEP3_BRIEF_INVALID'),
      transitionToNext: String(item?.transitionToNext || '').trim(),
      mustInclude: ensureStringArray(item?.mustInclude, [item?.goal]).slice(0, 4),
      keywords: ensureStringArray(item?.keywords, tokenize(`${item?.label || ''} ${item?.goal || ''} ${item?.beat || ''}`), 6),
    }));

  return {
    brief: {
      hookAngle: ensureString(candidate?.brief?.hookAngle, 'Hook 角度', 'STEP3_BRIEF_INVALID'),
      tone: ensureString(candidate?.brief?.tone, '语气', 'STEP3_BRIEF_INVALID'),
      pacing: ensureString(candidate?.brief?.pacing, '节奏', 'STEP3_BRIEF_INVALID'),
      ctaIntent: ensureString(candidate?.brief?.ctaIntent, 'CTA 意图', 'STEP3_BRIEF_INVALID'),
    },
    outline,
  };
}

function validateStep3Copy(candidate, context) {
  const copy = candidate?.copy && typeof candidate.copy === 'object' ? candidate.copy : {};
  const body = ensureArray(copy.body, '主体文案', 2, 'STEP3_COPY_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `段落 ${index + 1}`, '段落标签', 'STEP3_COPY_INVALID'),
      type: ensureString(item?.type || item?.label || `段落 ${index + 1}`, '段落类型', 'STEP3_COPY_INVALID'),
      text: ensureString(item?.text, '段落文案', 'STEP3_COPY_INVALID'),
      sceneIntent: ensureString(item?.sceneIntent || item?.label, '段落场景意图', 'STEP3_COPY_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor || item?.label, '段落证据锚点', 'STEP3_COPY_INVALID'),
      transitionToNext: String(item?.transitionToNext || '').trim(),
      keywords: ensureStringArray(item?.keywords, tokenize(`${item?.label || ''} ${item?.text || ''}`), 6),
      dataPoints: ensureStringArray(item?.dataPoints, tokenize(item?.text), 5),
      mechanismDepth: normalizeMechanismDepth(item?.mechanismDepth),
    }));

  const result = {
    copy: {
      hook: ensureString(copy.hook, 'Hook', 'STEP3_COPY_INVALID'),
      body,
      cta: ensureString(copy.cta, 'CTA', 'STEP3_COPY_INVALID'),
    },
  };

  const alignedText = [
    result.copy.hook,
    ...result.copy.body.map((item) => item.text),
    result.copy.cta,
  ].join('\n');
  const requiredTerms = [
    ...tokenize(context.pipeline.selectedTitle?.title),
    ...tokenize(context.topic.query),
  ];

  if (requiredTerms.length > 0 && !requiredTerms.some((term) => normalizeText(alignedText).includes(normalizeText(term)))) {
    fail('生成文案没有承接当前标题与主题，请重新生成', 'STEP3_COPY_MISALIGNED');
  }

  if (result.copy.body.filter((item) => item.keywords.length > 0 && item.dataPoints.length > 0).length < Math.max(1, result.copy.body.length - 1)) {
    fail('生成文案缺少结构化关键词或信息点，无法稳定服务后续场景编排', 'STEP3_COPY_STRUCTURE_WEAK');
  }

  if (context.generation.mode === 'regenerate' && context.generation.previousPayload) {
    const previousText = [
      context.generation.previousPayload.hook,
      ...(Array.isArray(context.generation.previousPayload.body)
        ? context.generation.previousPayload.body.map((item) => item?.text || item?.label || '')
        : []),
      context.generation.previousPayload.cta,
    ].join('\n');
    const similarity = jaccard(shingle(alignedText), shingle(previousText));
    if (similarity >= 0.72) {
      fail('重新生成的文案与上一版过于接近，请再次调整后重试', 'STEP3_REGENERATE_TOO_SIMILAR', {
        similarity,
      });
    }
  }

  validateStep3TechnicalCopy(result.copy, result.copy.body, context);

  return result;
}

module.exports = {
  validateStep1Analysis,
  validateStep1Research,
  validateStep2Strategy,
  validateStep2Titles,
  validateStep3Brief,
  validateStep3Copy,
};

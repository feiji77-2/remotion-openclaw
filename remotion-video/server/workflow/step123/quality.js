const {WorkflowGenerationError} = require('./errors');

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

function validateStep1Research(candidate, context) {
  const facts = ensureArray(candidate?.researchFacts, '搜索事实', 2, 'STEP1_RESEARCH_INVALID')
    .slice(0, 5)
    .map((item, index) => ({
      label: ensureString(item?.label || `事实 ${index + 1}`, '事实标签', 'STEP1_RESEARCH_INVALID'),
      fact: ensureString(item?.fact, '事实内容', 'STEP1_RESEARCH_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '证据锚点', 'STEP1_RESEARCH_INVALID'),
      sourceTitle: String(item?.sourceTitle || '').trim(),
    }));

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

  const outline = ensureArray(candidate?.outline, '文案大纲', 3, 'STEP3_BRIEF_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `节拍 ${index + 1}`, '大纲标签', 'STEP3_BRIEF_INVALID'),
      beat: ensureString(item?.beat, '大纲节拍', 'STEP3_BRIEF_INVALID'),
      goal: ensureString(item?.goal, '大纲目标', 'STEP3_BRIEF_INVALID'),
      evidenceAnchor: ensureString(item?.evidenceAnchor, '大纲证据锚点', 'STEP3_BRIEF_INVALID'),
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
  const body = ensureArray(copy.body, '主体文案', 3, 'STEP3_COPY_INVALID')
    .slice(0, 4)
    .map((item, index) => ({
      label: ensureString(item?.label || `段落 ${index + 1}`, '段落标签', 'STEP3_COPY_INVALID'),
      text: ensureString(item?.text, '段落文案', 'STEP3_COPY_INVALID'),
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

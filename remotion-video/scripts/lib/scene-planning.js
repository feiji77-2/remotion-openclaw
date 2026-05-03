// Scene planning — family selection, rhythm layer, diversity tracking

const {
  ULTIMATE_SCENE_FAMILIES,
  RHYTHM_LAYER_MAP,
  SCENE_CYCLE,
  FAMILY_DIVERSITY_BITS,
} = require('./constants.js');
const {safeString, asArray, uniqueList: uList, splitNarrationUnits} = require('./text-utils.js');
const {getDisplayTitle} = require('./extractors.js');
const {
  buildCompareRows,
  buildDataStreamItems,
  buildBenchmarkItems,
  buildTimelineItems,
  buildEvidenceCards,
  buildArchitectureNodes,
  buildMemoryGraphNodes,
  buildPipelineStages,
  buildStepItems,
  buildFeatureItems,
  buildTagItems,
  extractNumberTokens,
} = require('./scene-items.js');

const getRhythmLayer = (family) => RHYTHM_LAYER_MAP.get(family) || 'context';

const hasStandaloneAsciiToken = (text, token) => new RegExp(`(?:^|[^a-z])${token}(?:[^a-z]|$)`).test(text);

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
    safeString(shot?.visualFocusZh),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const buildSceneCycleCandidates = (index) => {
  const offset = ((index - 1) % SCENE_CYCLE.length + SCENE_CYCLE.length) % SCENE_CYCLE.length;
  return [
    ...SCENE_CYCLE.slice(offset),
    ...SCENE_CYCLE.slice(0, offset),
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
  const hasQuoteIntent = /[""'']|(一句话|关键判断|核心结论|真正该讲的是|最狠的一句)/.test(text);
  const hasGlossaryIntent = /(是什么|什么意思|本质上|指的是|可以理解成|术语|定义)/.test(text);
  const {extractModelTokens} = require('./extractors.js');
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

  if (/(场景|开发者|团队|问题|痛点|案例|想象一下)/.test(text) && buildFeatureItems(shot).items.length >= 3) {
    candidates.push('feature-rail');
  }

  if (extractNumberTokens(text).length >= 2) {
    candidates.push('metrics');
  }

  if (asArray(shot?.keywords).length + asArray(shot?.dataPoints).length >= 5) {
    candidates.push('tag-matrix');
  }

  if (hasQuoteIntent && splitNarrationUnits(shot?.narration || shot?.title).length <= 3) {
    candidates.push('quote-highlight');
  }

  if (safeString(shot?.visualFocusZh).length > 0 && safeString(shot?.visualFocusZh).length <= 24) {
    candidates.push('focus');
  }

  return uList([
    ...candidates,
    ...buildSceneCycleCandidates(index),
    'focus',
  ]);
};

const inferSceneFamily = (shot, index, total, previousFamily = '') => {
  const candidates = collectSceneFamilyCandidates(shot, index, total);
  if (candidates.length === 0) {
    return 'feature-rail';
  }
  if (candidates.includes('compare-board') && previousFamily !== 'compare-board') {
    return 'compare-board';
  }
  return candidates[0];
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

  const rawCostDiff = left.rawCost - right.rawCost;
  if (rawCostDiff !== 0) {
    return rawCostDiff < 0 ? 1 : -1;
  }

  const positionDiff = left.positionIndex - right.positionIndex;
  return positionDiff < 0 ? 1 : -1;
};

const selectSceneFamilies = (shots) => {
  const total = shots.length;
  const candidateMatrix = shots.map((shot, index) => collectSceneFamilyCandidates(shot, index, total));
  const memo = new Map();

  const solve = (index, previousFamily, usedMask, runLayer, runLength, parentCandidateIndex = 0) => {
    if (index >= total) {
      return {
        uniqueCount: 0,
        repeatCount: 0,
        adjacentRepeatCount: 0,
        layerRunPenalty: 0,
        weightedCost: 0,
        rawCost: 0,
        families: [],
        positionIndex: parentCandidateIndex,
      };
    }

    const memoKey = `${index}::${previousFamily || '-'}::${usedMask}::${runLayer || '-'}::${Math.min(runLength, 5)}`;
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
      const suffixPlan = solve(index + 1, family, nextMask, layer, nextRunLength, candidateIndex);
      const candidatePlan = {
        uniqueCount: uniqueGain + suffixPlan.uniqueCount,
        repeatCount: (isRepeatedFamily ? 1 : 0) + suffixPlan.repeatCount,
        adjacentRepeatCount:
          (isMiddleScene && previousFamily && family === previousFamily ? 1 : 0) + suffixPlan.adjacentRepeatCount,
        layerRunPenalty: runPenalty + suffixPlan.layerRunPenalty,
        weightedCost: candidateIndex * deviationWeight + suffixPlan.weightedCost,
        rawCost: candidateIndex + suffixPlan.rawCost,
        families: [family, ...suffixPlan.families],
        positionIndex: candidateIndex,
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

module.exports = {
  getRhythmLayer,
  collectSceneFamilyCandidates,
  inferSceneFamily,
  compareFamilyPlans,
  selectSceneFamilies,
};
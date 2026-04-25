import type {SkillDrivenStepId, Step3AntiAiLevel, StepSkillConfig} from '../app/pipelineTypes';

export interface StepSkillPreset extends StepSkillConfig {
  id: string;
  label: string;
}

const STEP3_NORMAL_SPOKEN_CHARS_PER_SECOND = 3.5;

function normalizeOptionalNumber(value: unknown, fallback: number | null = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function roundEstimatedWordCount(value: number) {
  return Math.max(60, Math.round(value / 10) * 10);
}

function normalizeAntiAiLevel(value: unknown, fallback: Step3AntiAiLevel = 'strong'): Step3AntiAiLevel {
  const normalized = String(value || '').trim();
  if (normalized === 'natural' || normalized === 'strong' || normalized === 'max') {
    return normalized;
  }
  return fallback;
}

export function estimateStep3WordCount(targetDurationSeconds: unknown) {
  const duration = normalizeOptionalNumber(targetDurationSeconds);
  if (!duration) {
    return null;
  }

  return roundEstimatedWordCount(duration * STEP3_NORMAL_SPOKEN_CHARS_PER_SECOND);
}

export function estimateStep3Duration(targetWordCount: unknown) {
  const wordCount = normalizeOptionalNumber(targetWordCount);
  if (!wordCount) {
    return null;
  }

  return Math.max(15, Math.round(wordCount / STEP3_NORMAL_SPOKEN_CHARS_PER_SECOND));
}

export const SKILL_STEP_IDS: SkillDrivenStepId[] = [1, 2, 3, 4, 5];

export const STEP_SKILL_PRESETS: Record<SkillDrivenStepId, StepSkillPreset[]> = {
  1: [
    {
      id: 'hot-topic-breakdown',
      label: '热点拆解',
      presetId: 'hot-topic-breakdown',
      presetLabel: '热点拆解',
      goal: '快速提炼热点事实、核心问题和观众最关心的判断点。',
      style: '结论先行，短句拆解，不绕背景。',
      emphasis: '高频争议、信息增量、为什么值得看。',
      avoid: '空泛行业黑话、长背景铺垫、无证据判断。',
      notes: '优先输出能继续给标题和文案复用的事实骨架。',
    },
    {
      id: 'product-analysis',
      label: '产品分析',
      presetId: 'product-analysis',
      presetLabel: '产品分析',
      goal: '把产品动作、用户价值和差异化讲清楚。',
      style: '像产品复盘，冷静、具体、可比较。',
      emphasis: '功能变化、用户场景、替代关系。',
      avoid: '营销口号、模糊赞美、无场景描述。',
      notes: '主命题要能自然进入“为什么火/为什么变”。',
    },
    {
      id: 'tutorial-planning',
      label: '教程规划',
      presetId: 'tutorial-planning',
      presetLabel: '教程规划',
      goal: '先把新手最需要知道的步骤、门槛和顺序理顺。',
      style: '像路线图，清楚、顺序化、低废话。',
      emphasis: '起点、步骤、常见卡点。',
      avoid: '概念堆砌、一步到位式夸张承诺。',
      notes: '执行路径要明确到能直接展开成教程文案。',
    },
    {
      id: 'opinion-commentary',
      label: '观点评论',
      presetId: 'opinion-commentary',
      presetLabel: '观点评论',
      goal: '快速形成鲜明观点，并给出能支撑观点的事实线索。',
      style: '有判断、有锋芒，但不要失控。',
      emphasis: '争议点、立场、反常识结论。',
      avoid: '人身攻击、情绪化乱喷、空结论。',
      notes: '主命题必须可辩护，不能只是态度输出。',
    },
  ],
  2: [
    {
      id: 'hard-hook',
      label: '强钩子',
      presetId: 'hard-hook',
      presetLabel: '强钩子',
      goal: '优先产出能抢停留的主标题。',
      style: '强对比、强问题、强结果感。',
      emphasis: '反差、悬念、明确收益。',
      avoid: '平铺直叙、摘要式标题、太像文章标题。',
      notes: '主标题第一眼就要有点击欲。',
    },
    {
      id: 'explainer',
      label: '解释型',
      presetId: 'explainer',
      presetLabel: '解释型',
      goal: '让标题一眼说明这条内容会讲清什么。',
      style: '简洁解释，读完立刻懂主题。',
      emphasis: '问题对象、解释价值、清晰承诺。',
      avoid: '故作神秘、过度夸张、信息缺失。',
      notes: '标题池里保留至少一条偏稳的解释型标题。',
    },
    {
      id: 'contrast',
      label: '反差型',
      presetId: 'contrast',
      presetLabel: '反差型',
      goal: '用反常识或前后反差拉开标题层次。',
      style: '前后对照明显，判断鲜明。',
      emphasis: '没想到、真正原因、表面与底层差异。',
      avoid: '纯标题党、无内容支撑的惊讶词。',
      notes: '不同标题之间要有明显角度变化。',
    },
    {
      id: 'question-led',
      label: '问题型',
      presetId: 'question-led',
      presetLabel: '问题型',
      goal: '用问题带动阅读，让用户想继续看答案。',
      style: '像追问，不像考试题。',
      emphasis: '用户真正会问的问题。',
      avoid: '太空泛的问题、答案感不足。',
      notes: '至少保留一个问题式主标题候选。',
    },
  ],
  3: [
    {
      id: 'dense-short',
      label: '短促高密',
      presetId: 'dense-short',
      presetLabel: '短促高密',
      goal: '用更少字数把重点打满。',
      style: '短句、快节奏、结论不断往前顶。',
      emphasis: '每段都要有信息增量。',
      avoid: '大段抒情、重复总结、慢热铺垫。',
      notes: '默认按短视频首屏留人逻辑写。',
      targetDurationSeconds: 45,
      targetWordCount: 170,
      antiAiLevel: 'strong',
      spokenPersona: '像懂行的人当面拆重点，句子短，反应快。',
    },
    {
      id: 'spoken-breakdown',
      label: '口语拆解',
      presetId: 'spoken-breakdown',
      presetLabel: '口语拆解',
      goal: '把复杂内容讲得像面对面说明白。',
      style: '口语化、好读、像真人讲解。',
      emphasis: '顺着用户理解路径往下讲。',
      avoid: '书面腔、报告腔、太多抽象词。',
      notes: 'Hook 需要自然，正文像人在带着听众往下走。',
      targetDurationSeconds: 60,
      targetWordCount: 230,
      antiAiLevel: 'max',
      spokenPersona: '像真人面对面讲给你听，不背稿，不端着。',
    },
    {
      id: 'emotion-push',
      label: '情绪推进',
      presetId: 'emotion-push',
      presetLabel: '情绪推进',
      goal: '让文案不只有信息，还要带情绪起伏。',
      style: '有张力、有抬升，但不狗血。',
      emphasis: '惊讶点、冲突点、结论落点。',
      avoid: '平叙到底、鸡汤化情绪、无信息煽动。',
      notes: 'CTA 要顺着情绪收口，不要硬拐。',
      targetDurationSeconds: 55,
      targetWordCount: 210,
      antiAiLevel: 'strong',
      spokenPersona: '像一个有情绪起伏、但脑子很清楚的人在讲。',
    },
    {
      id: 'dry-goods-review',
      label: '干货复盘',
      presetId: 'dry-goods-review',
      presetLabel: '干货复盘',
      goal: '写成一条有判断的干货复盘。',
      style: '克制、实用、像复盘笔记。',
      emphasis: '关键判断、方法、复用价值。',
      avoid: '空喊价值、结论飘、广告口吻。',
      notes: '正文每段都要能独立成立。',
      targetDurationSeconds: 75,
      targetWordCount: 290,
      antiAiLevel: 'strong',
      spokenPersona: '像做完一轮实战之后的复盘口播，克制但很实。',
    },
  ],
  4: [
    {
      id: 'fast-cut',
      label: '快切场景',
      presetId: 'fast-cut',
      presetLabel: '快切场景',
      goal: '把文案拆成节奏更快的横版场景推进。',
      style: '每个场景只讲一刀，切换利落。',
      emphasis: '开场抓人、场景短、推进快。',
      avoid: '一个场景塞太多信息、节奏拖。',
      notes: '场景标题要一眼看懂作用，并尽量命中不同模板。',
    },
    {
      id: 'explainer-structure',
      label: '讲解结构',
      presetId: 'explainer-structure',
      presetLabel: '讲解结构',
      goal: '按解释型视频逻辑组织横版场景。',
      style: '先结论，再展开，再收束。',
      emphasis: '场景顺序清楚，用户跟得上。',
      avoid: '场景职责混乱、跳跃太大。',
      notes: '优先保证信息结构稳定和模板多样性。',
    },
    {
      id: 'comparison-demo',
      label: '对比演示',
      presetId: 'comparison-demo',
      presetLabel: '对比演示',
      goal: '让场景天然适合做前后对比或对象对照。',
      style: '场景间要有参照关系。',
      emphasis: '差异、对照、结果变化。',
      avoid: '全程一个视角、没有层次变化。',
      notes: '场景标题里要体现对比意图，并尽量命中 compare-board / benchmark-chart。',
    },
    {
      id: 'list-rhythm',
      label: '清单节奏',
      presetId: 'list-rhythm',
      presetLabel: '清单节奏',
      goal: '把内容拆成清单式、节拍式场景。',
      style: '像逐条列重点，节奏稳定。',
      emphasis: '编号感、层次感、可记忆。',
      avoid: '场景命名混乱、节奏失衡。',
      notes: '优先让场景数量和信息颗粒度匹配。',
    },
  ],
  5: [
    {
      id: 'real-scene',
      label: '真实场景',
      presetId: 'real-scene',
      presetLabel: '真实场景',
      goal: '让每个场景的画面更像真实拍摄现场。',
      style: '写实、可信、少假概念图。',
      emphasis: '人物、设备、空间、环境细节。',
      avoid: '抽象光效堆砌、无主体的概念海报。',
      notes: '视觉 prompt 优先服务场景信息，默认按 16:9 横版组织。',
    },
    {
      id: 'infographic',
      label: '信息图解',
      presetId: 'infographic',
      presetLabel: '信息图解',
      goal: '让画面天然适合解释和信息承载。',
      style: '结构化、图解化、重点明确。',
      emphasis: '图层、标签、信息焦点。',
      avoid: '只有氛围没有信息承载。',
      notes: '负面提示里要压住花哨噪音，并优先命中结构化模板。',
    },
    {
      id: 'tech-ui',
      label: '科技 UI',
      presetId: 'tech-ui',
      presetLabel: '科技 UI',
      goal: '把镜头画面做得更像高级科技工作流界面。',
      style: '高对比、科技感、界面信息层丰富。',
      emphasis: '面板、数据、系统感。',
      avoid: '廉价霓虹风、过度赛博、看不懂主体。',
      notes: '先保证内容表达，再加科技感，默认按 Ultimate 横版场景生成。',
    },
    {
      id: 'high-contrast-cover',
      label: '高对比封面',
      presetId: 'high-contrast-cover',
      presetLabel: '高对比封面',
      goal: '让场景缩略图和首屏冲击力更强。',
      style: '主体突出、对比明显、视觉焦点单一。',
      emphasis: '封面感、主体、标题留白。',
      avoid: '元素过多、视觉焦点分散、灰度太平。',
      notes: 'prompt 要明确主体与背景关系。',
    },
  ],
};

export function getStepSkillPresets(stepId: SkillDrivenStepId) {
  return STEP_SKILL_PRESETS[stepId] || [];
}

export function getStepSkillPreset(stepId: SkillDrivenStepId, presetId?: string | null) {
  return getStepSkillPresets(stepId).find((preset) => preset.id === presetId) || null;
}

export function getDefaultStepSkill(stepId: SkillDrivenStepId): StepSkillConfig {
  const fallback = getStepSkillPresets(stepId)[0];
  if (!fallback) {
    return {
      presetId: '',
      presetLabel: '',
      goal: '',
      style: '',
      emphasis: '',
      avoid: '',
      notes: '',
      targetDurationSeconds: null,
      targetWordCount: null,
      antiAiLevel: 'strong',
      spokenPersona: '',
    };
  }

  const defaultDuration = normalizeOptionalNumber(fallback.targetDurationSeconds);

  return {
    presetId: fallback.presetId,
    presetLabel: fallback.presetLabel,
    goal: fallback.goal,
    style: fallback.style,
    emphasis: fallback.emphasis,
    avoid: fallback.avoid,
    notes: fallback.notes,
    targetDurationSeconds: defaultDuration,
    targetWordCount: estimateStep3WordCount(defaultDuration) ?? normalizeOptionalNumber(fallback.targetWordCount),
    antiAiLevel: normalizeAntiAiLevel(fallback.antiAiLevel),
    spokenPersona: String(fallback.spokenPersona || '').trim(),
  };
}

export function normalizeStepSkill(stepId: SkillDrivenStepId, skill?: StepSkillConfig | null): StepSkillConfig {
  const base = getDefaultStepSkill(stepId);
  const baseDuration = normalizeOptionalNumber(base.targetDurationSeconds);
  const requestedDuration = normalizeOptionalNumber(skill?.targetDurationSeconds);
  const requestedWordCount = normalizeOptionalNumber(skill?.targetWordCount);
  const effectiveStep3Duration = requestedDuration
    ?? estimateStep3Duration(requestedWordCount)
    ?? baseDuration;
  const effectiveStep3WordCount = estimateStep3WordCount(effectiveStep3Duration)
    ?? requestedWordCount
    ?? normalizeOptionalNumber(base.targetWordCount);

  return {
    ...base,
    ...(skill || {}),
    presetId: String(skill?.presetId || base.presetId || '').trim(),
    presetLabel: String(skill?.presetLabel || base.presetLabel || '').trim(),
    goal: String(skill?.goal || base.goal || '').trim(),
    style: String(skill?.style || base.style || '').trim(),
    emphasis: String(skill?.emphasis || base.emphasis || '').trim(),
    avoid: String(skill?.avoid || base.avoid || '').trim(),
    notes: String(skill?.notes || base.notes || '').trim(),
    targetDurationSeconds: stepId === 3
      ? effectiveStep3Duration
      : null,
    targetWordCount: stepId === 3
      ? effectiveStep3WordCount
      : null,
    antiAiLevel: stepId === 3
      ? normalizeAntiAiLevel(skill?.antiAiLevel, normalizeAntiAiLevel(base.antiAiLevel))
      : undefined,
    spokenPersona: stepId === 3
      ? String(skill?.spokenPersona || base.spokenPersona || '').trim()
      : '',
  };
}

export function buildSkillFromPreset(stepId: SkillDrivenStepId, presetId: string): StepSkillConfig {
  const preset = getStepSkillPreset(stepId, presetId);
  return normalizeStepSkill(stepId, preset || null);
}

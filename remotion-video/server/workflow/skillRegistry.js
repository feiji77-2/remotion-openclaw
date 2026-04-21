const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME_DIR = os.homedir();
const REMOTION_PROJECT_ROOT = path.resolve(__dirname, '../..');
const REMOTION_BUILD_FILES = [
  'src/Root.tsx',
  'src/OpenClawVideo.tsx',
  'src/data/storyboard.ts',
  'src/animations/video-effects.tsx',
];

const STEP_TO_SKILL_ID = {
  1: 'video-pipeline-analysis',
  2: 'video-pipeline-title',
  3: 'video-pipeline-content',
  4: 'video-pipeline-storyboard',
  5: 'video-pipeline-storyboard',
  6: 'video-pipeline-audio',
  7: 'remotion-video-maker',
  8: 'video-pipeline-video',
};

const SKILL_DEFINITIONS = [
  {
    skillId: 'video-pipeline-analysis',
    category: 'step',
    stepId: 1,
    stepLabel: 'Step 1 · 逻辑分析',
    name: 'video-pipeline-analysis',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-analysis', 'SKILL.md'),
    displaySummary: '先检索相关内容，再提炼事实、多角度切口和分析骨架。',
    inputs: ['topic', 'platform', 'tone', 'targetDuration', 'audienceHint', 'searchScope'],
    outputs: ['searchPhase', 'thesis', 'audience', 'corePromise', 'multiAngleExploration', 'structure', 'keyDataPoints', 'sources'],
    defaults: {
      platform: '抖音',
      tone: '专业',
      targetDuration: 45,
      searchScope: '轻量',
      goal: '先从公开线索中提炼出可继续生成标题和文案的分析框架。',
      style: '数据驱动、结论先行、避免空泛背景。',
      emphasis: '事实线索、观众关注点、多角度切口。',
      avoid: '模板化分析、无证据判断、长背景铺垫。',
      notes: 'Step 1 输出要同时服务 Step 2/3/4。',
    },
    constraints: [
      '必须先有检索事实，再进入分析成稿。',
      'Step 1 不只给一个结论，还要保留 2-3 个可继续展开的角度。',
      '搜索失败时要显式标记回退状态，不能伪装成真实搜索结果。',
    ],
    qualityRules: [
      '至少 2 条 researchFacts。',
      'analysis 需要 thesis / audience / corePromise / layers / process。',
      '输出要能直接给标题和文案复用。',
    ],
    uiHints: [
      '优先展示主结论、事实、执行路径。',
      'researchFacts 适合标签化或列表化呈现。',
    ],
    evalRules: [
      '相关性、清晰度、平台适配、完整性。',
    ],
  },
  {
    skillId: 'video-pipeline-title',
    category: 'step',
    stepId: 2,
    stepLabel: 'Step 2 · 标题生成',
    name: 'video-pipeline-title',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-title', 'SKILL.md'),
    displaySummary: '围绕已确认分析生成多角度标题池，并附平台适配和钩子强度。',
    inputs: ['inputTopic', 'analysis.thesis', 'analysis.audience', 'analysis.corePromise'],
    outputs: ['titles.options[].title', 'titles.options[].angle', 'titles.options[].platform', 'titles.options[].hookStrength', 'titles.options[].suitableFor'],
    defaults: {
      goal: '生成 4-5 个差异明显的短视频标题候选。',
      style: '短促、抓人、先给判断。',
      emphasis: '多角度、平台适配、主标题可选。',
      avoid: '标题党、标题重复、摘要式平铺直叙。',
      notes: '默认优先抖音/视频号传播语气。',
    },
    constraints: [
      '必须依赖已确认的 Step 1 分析。',
      '标题长度控制在短视频口播常见区间内。',
      '不同标题角度不能高度重复。',
    ],
    qualityRules: [
      '至少 4 个标题候选。',
      '必须有 selectedId 或可回落的默认选项。',
      '每个标题保留 rationale / evidenceAnchor / hookStyle。',
    ],
    uiHints: [
      '标题列表需要突出当前入选。',
      '高分标题适合做高亮 pill。',
    ],
    evalRules: [
      '钩子力、平台适配、原创性、完整性。',
    ],
  },
  {
    skillId: 'video-pipeline-content',
    category: 'step',
    stepId: 3,
    stepLabel: 'Step 3 · 内容生成',
    name: 'video-pipeline-content',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-content', 'SKILL.md'),
    displaySummary: '根据标题、分析和生成要求，产出口语化 Hook / Body / CTA。',
    inputs: ['inputTopic', 'selectedTitle', 'analysis.thesis', 'analysis.audience', 'analysis.searchPhase'],
    outputs: ['copy.brief', 'copy.hook', 'copy.body[]', 'copy.cta', 'copy.totalChars', 'copy.readingTime', 'copy.keywords'],
    defaults: {
      goal: '生成适合中文短视频口播的拟人化文案。',
      style: '结论先行、口语化、少 AI 味。',
      emphasis: 'Hook 留人、正文递进、CTA 自然。',
      avoid: '机器人说明文、过长铺垫、空洞价值词。',
      notes: '支持单独控制时长、字数、去 AI 味和拟人口播。',
      targetDurationSeconds: 60,
      targetWordCount: 230,
      antiAiLevel: 'strong',
      spokenPersona: '像真人面对面讲，不背稿，不端着。',
    },
    constraints: [
      '必须依赖已确认标题。',
      '文案要和 Step 1 事实线索一致。',
      '保留最终可直接进入 Step 4 的 hook/body/cta 结构。',
    ],
    qualityRules: [
      'hook / body / cta 不可为空。',
      '需要 totalChars / readingTime / keywords。',
      '正文段落数量与目标时长基本匹配。',
    ],
    uiHints: [
      '适合拆为文案策略、大纲节拍、最终文案三块。',
      '展示字数和预估口播时长。',
    ],
    evalRules: [
      '信息密度、口语化、节奏、CTA 力度、合规性。',
    ],
  },
  {
    skillId: 'video-pipeline-storyboard',
    category: 'step',
    stepId: 4,
    stepLabel: 'Step 4 / 5 · 分镜与视觉 Prompt',
    name: 'video-pipeline-storyboard',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-storyboard', 'SKILL.md'),
    displaySummary: '固定 6 镜头结构，先拆内容层级，再给每镜视觉和图像提示词。',
    inputs: ['copy.hook', 'copy.body[]', 'copy.cta', 'analysis.keyDataPoints'],
    outputs: ['shots[]', 'shots[].level', 'shots[].visual', 'prompts.byShotId', 'prompts.byShotId[].imagePrompt'],
    defaults: {
      goal: '把文案拆成固定 6 镜头结构，并给每镜完整视觉信息。',
      style: '层级清楚、便于渲染、适合竖屏解释类短视频。',
      emphasis: '开场钩子、核心信息、对比、案例、CTA。',
      avoid: '镜头数量漂移、层级错位、无视觉焦点。',
      notes: 'Step 4 和 Step 5 共用同一个 storyboard 真源。',
    },
    constraints: [
      '固定 6 个镜头，顺序不可乱。',
      '每镜都要有层级、类型和时长。',
      'Step 5 提示词要承接 Step 4 镜头语义。',
    ],
    qualityRules: [
      'shots 长度必须为 6。',
      '每镜 durationSeconds 控制在 3-15s 区间附近。',
      '提示词数量与镜头数量一致。',
    ],
    uiHints: [
      'Step 4 适合镜头卡片列表。',
      'Step 5 适合每镜 prompt 卡片 + 状态。',
    ],
    evalRules: [
      '时长准确、节奏分配、画面感、完整性。',
    ],
  },
  {
    skillId: 'video-pipeline-audio',
    category: 'step',
    stepId: 6,
    stepLabel: 'Step 6 · 配音脚本',
    name: 'video-pipeline-audio',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-audio', 'SKILL.md'),
    displaySummary: '根据镜头结构产出配音引擎、参数、逐镜脚本和时长统计。',
    inputs: ['shots[]', 'copy', 'targetDuration'],
    outputs: ['voice.engine', 'voice.language', 'voice.speed', 'voice.pitch', 'voice.script[]', 'voice.totalDuration', 'voice.totalChars'],
    defaults: {
      engine: 'chattts',
      language: 'zh-CN',
      speed: '1.0',
      pitch: 0,
      goal: '生成可直接提交 TTS 的逐镜脚本。',
      style: '口语化、节奏稳定、适合 ChatTTS。',
      emphasis: '镜头时长匹配、总时长统计、脚本清晰。',
      avoid: '书面腔、镜头间时长失衡。',
      notes: 'ChatTTS 为默认引擎，Melo / OpenVoice 为回退。',
    },
    constraints: [
      '脚本数量要和镜头数量对齐。',
      '每镜文本长度和镜头时长要大致匹配。',
    ],
    qualityRules: [
      'voice.script 不能为空。',
      'totalDuration / totalChars 需要可计算。',
      '默认引擎为 ChatTTS。',
    ],
    uiHints: [
      '展示引擎、总时长、总字数和逐镜脚本。',
    ],
    evalRules: [
      '时长匹配、口语化、停顿节奏。',
    ],
  },
  {
    skillId: 'remotion-video-maker',
    category: 'step',
    stepId: 7,
    stepLabel: 'Step 7 · Remotion 项目生成',
    name: 'remotion-video-maker',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'remotion-video-maker', 'SKILL.md'),
    displaySummary: '复用现有 remotion-video 工程，生成项目构建摘要、composition 和渲染命令。',
    inputs: ['analysis', 'titles', 'copy', 'shots', 'images', 'voice'],
    outputs: ['projectBuild.projectPath', 'projectBuild.compositionId', 'projectBuild.stylePreset', 'projectBuild.buildStatus', 'projectBuild.renderCommand', 'projectBuild.eval'],
    defaults: {
      stylePreset: 'tech-dark',
      goal: '把当前流水线结果映射到 Remotion 项目载体上。',
      style: '复用现有工程，不重复搭仓库。',
      emphasis: 'composition、项目路径、渲染命令、构建可用性。',
      avoid: '重新创建新工程、丢失已有产物路径。',
      notes: 'Step 7 只做项目构建摘要，Step 8 只做渲染设置和导出。',
    },
    constraints: [
      '底层复用当前 remotion-video 工程。',
      'projectBuild 需要包含 compositionId 和 renderCommand。',
      '构建状态只提示，不自动执行 render。',
    ],
    qualityRules: [
      'projectPath / compositionId / buildStatus / renderCommand 缺一不可。',
      'files 里至少列出核心载体文件。',
    ],
    uiHints: [
      '适合展示项目路径、composition 和构建检查项。',
    ],
    evalRules: [
      '文件完整性、可编译性、shot 覆盖率。',
    ],
  },
  {
    skillId: 'video-pipeline-video',
    category: 'step',
    stepId: 8,
    stepLabel: 'Step 8 · 最终渲染',
    name: 'video-pipeline-video',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-video', 'SKILL.md'),
    displaySummary: '只负责最终渲染参数、预估时长大小、预览和导出，不再混入项目构建。',
    inputs: ['script', 'shots.length', 'template', 'quality'],
    outputs: ['render.template', 'render.quality', 'render.fps', 'render.width', 'render.height', 'render.format', 'render.codec', 'render.bitrate', 'render.estimatedDuration', 'render.estimatedSize', 'render.notes'],
    defaults: {
      template: 'caption',
      quality: 'high',
      fps: 30,
      width: 1080,
      height: 1920,
      format: 'mp4',
      codec: 'h264',
      bitrate: 8000,
      goal: '给出面向最终导出的渲染参数。',
      style: '参数清楚、推荐理由简洁。',
      emphasis: '模板、质量、预计时长、大小和导出说明。',
      avoid: '把项目生成职责继续塞进 Step 8。',
      notes: '默认 9:16 竖屏发布级参数；横版 1920x1080 可选 ultimate 模板。',
    },
    constraints: [
      'Step 8 只输出渲染语义。',
      '参数必须能直接送给 render API。',
    ],
    qualityRules: [
      'render 参数字段完整。',
      'estimatedDuration / estimatedSize 要有推荐说明。',
    ],
    uiHints: [
      '适合展示参数摘要、预览、导出按钮。',
    ],
    evalRules: [
      '模板选择、质量适配、参数完整、估算准确。',
    ],
  },
  {
    skillId: 'video-pipeline-master',
    category: 'meta',
    stepId: null,
    stepLabel: '主控',
    name: 'video-pipeline-master',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-master', 'SKILL.md'),
    displaySummary: '负责步骤顺序、checkpoint、重试建议和全链路编排。',
    inputs: ['topic', 'platform', 'tone', 'targetDuration', 'autoConfirm'],
    outputs: ['step order', 'checkpoint', 'retry policy', 'progress report'],
    defaults: {
      order: '1→2→3→4→5→6→7→8',
      retries: 3,
    },
    constraints: [
      '先过分析、标题、文案，再进入分镜和渲染。',
      '正式发布前需要完整 checkpoint。',
    ],
    qualityRules: [
      '步骤顺序清楚、重试边界明确。',
    ],
    uiHints: [
      '更适合在右栏能力库顶部作为编排卡片展示。',
    ],
    evalRules: [
      'pass@k、checkpoint 完整性。',
    ],
  },
  {
    skillId: 'video-pipeline-eval',
    category: 'meta',
    stepId: null,
    stepLabel: '质检',
    name: 'video-pipeline-eval',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-eval', 'SKILL.md'),
    displaySummary: '提供评分维度、禁词和提示建议，首版只做 advisory，不做硬阻断。',
    inputs: ['step payload', 'baseline', 'attempts'],
    outputs: ['score', 'status', 'issues', 'suggestions', 'forbiddenWords'],
    defaults: {
      advisoryOnly: true,
      passScore: 85,
      warnScore: 70,
    },
    constraints: [
      '首版只提示，不阻断用户手动确认。',
    ],
    qualityRules: [
      '需要输出 score / status / issues / suggestions。',
    ],
    uiHints: [
      '适合右栏中部的提示面板。',
    ],
    evalRules: [
      'Capability Eval / Regression Eval / pass@k。',
    ],
  },
];

const SKILL_CACHE = new Map();
const EVAL_FORBIDDEN_WORDS = {
  title: ['震惊', '必看', '不看后悔', '删前速看', '绝了'],
  copy: ['最强', '第一', '顶级', '国家级', '100%', '绝对'],
  cta: ['立即', '赶紧', '马上', '立刻'],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeString(value) {
  return String(value || '').trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function average(values) {
  const safe = values.filter((value) => Number.isFinite(value));
  if (safe.length === 0) {
    return 0;
  }
  return round(safe.reduce((sum, value) => sum + value, 0) / safe.length);
}

function compactText(value, max = 180) {
  const safe = safeString(value).replace(/\s+/g, ' ');
  if (!safe) {
    return '';
  }
  return safe.length > max ? `${safe.slice(0, max - 1)}…` : safe;
}

function tokenizeKeywords(value) {
  const matches = String(value || '')
    .toLowerCase()
    .match(/[\p{Script=Han}]{2,}|[\p{L}\p{N}]{3,}/gu);
  return [...new Set(matches || [])];
}

function parseFrontmatter(raw) {
  const source = String(raw || '');
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  return match[1]
    .split('\n')
    .reduce((acc, line) => {
      const dividerIndex = line.indexOf(':');
      if (dividerIndex === -1) {
        return acc;
      }
      const key = line.slice(0, dividerIndex).trim();
      const value = line.slice(dividerIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function getSkillDefinition(skillId) {
  return SKILL_DEFINITIONS.find((item) => item.skillId === skillId) || null;
}

function loadSkillSource(skillId) {
  const definition = getSkillDefinition(skillId);
  if (!definition) {
    return null;
  }

  const cached = SKILL_CACHE.get(skillId);
  const exists = fs.existsSync(definition.sourcePath);
  if (!exists) {
    const missingValue = {
      exists: false,
      mtimeMs: 0,
      raw: '',
      error: `Missing skill file: ${definition.sourcePath}`,
    };
    SKILL_CACHE.set(skillId, missingValue);
    return missingValue;
  }

  const stats = fs.statSync(definition.sourcePath);
  if (cached && cached.exists && cached.mtimeMs === stats.mtimeMs) {
    return cached;
  }

  const nextValue = {
    exists: true,
    mtimeMs: stats.mtimeMs,
    raw: fs.readFileSync(definition.sourcePath, 'utf8'),
    error: null,
  };
  SKILL_CACHE.set(skillId, nextValue);
  return nextValue;
}

function buildSkillSpec(skillId) {
  const definition = getSkillDefinition(skillId);
  if (!definition) {
    return null;
  }

  const source = loadSkillSource(skillId);
  const frontmatter = parseFrontmatter(source?.raw || '');
  const status = !source?.exists ? 'missing' : 'ready';

  return {
    skillId: definition.skillId,
    category: definition.category,
    stepId: definition.stepId,
    stepLabel: definition.stepLabel,
    name: safeString(frontmatter.name || definition.name || definition.skillId),
    description: safeString(frontmatter.description || definition.displaySummary),
    displaySummary: definition.displaySummary,
    sourcePath: definition.sourcePath,
    version: safeString(frontmatter.version),
    status,
    statusMessage: source?.error || '',
    inputs: clone(definition.inputs || []),
    outputs: clone(definition.outputs || []),
    defaults: clone(definition.defaults || {}),
    constraints: clone(definition.constraints || []),
    qualityRules: clone(definition.qualityRules || []),
    uiHints: clone(definition.uiHints || []),
    evalRules: clone(definition.evalRules || []),
  };
}

function getSkillSpec(skillId) {
  return buildSkillSpec(skillId);
}

function getStepSkillId(stepId) {
  return STEP_TO_SKILL_ID[Number(stepId)] || null;
}

function getStepSkillSpec(stepId) {
  const skillId = getStepSkillId(stepId);
  return skillId ? getSkillSpec(skillId) : null;
}

function createSkillUnavailableError(stepId, skillSpec) {
  const error = new Error(skillSpec?.statusMessage || `Step ${stepId} skill unavailable`);
  error.status = 503;
  error.code = 'STEP_SKILL_UNAVAILABLE';
  error.details = {
    stepId,
    skillId: skillSpec?.skillId || getStepSkillId(stepId),
    sourcePath: skillSpec?.sourcePath || null,
    status: skillSpec?.status || 'missing',
  };
  return error;
}

function ensureStepSkillReady(stepId) {
  const skillSpec = getStepSkillSpec(stepId);
  if (!skillSpec || skillSpec.status !== 'ready') {
    throw createSkillUnavailableError(stepId, skillSpec);
  }
  return skillSpec;
}

function listSkillCatalog() {
  return SKILL_DEFINITIONS.map((definition) => {
    const skillSpec = getSkillSpec(definition.skillId);
    return {
      skillId: skillSpec.skillId,
      category: skillSpec.category,
      stepId: skillSpec.stepId,
      stepLabel: skillSpec.stepLabel,
      name: skillSpec.name,
      description: skillSpec.description,
      displaySummary: skillSpec.displaySummary,
      status: skillSpec.status,
      sourcePath: skillSpec.sourcePath,
      statusMessage: skillSpec.statusMessage,
    };
  });
}

function getSelectedTitle(input, payload) {
  const requestedSelectedId = safeString(
    payload?.titles?.selectedId
    || input?.pipelineState?.selectedTitleId,
  );
  const options = Array.isArray(payload?.titles?.options)
    ? payload.titles.options
    : (Array.isArray(input?.pipelineState?.titles?.options) ? input.pipelineState.titles.options : []);
  return options.find((item) => safeString(item?.id) === requestedSelectedId) || options[0] || null;
}

function splitNarrationClauses(text) {
  const parts = safeString(text)
    .replace(/\s+/g, ' ')
    .split(/[。！？!?\n]|(?<=，)|(?<=；)|(?<=：)|(?<=,)|(?<=;)|(?<=:)/u)
    .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
    .filter(Boolean);
  const output = [];

  for (let index = 0; index < parts.length; index += 1) {
    const current = parts[index];
    const next = parts[index + 1];

    if (
      next
      && /^\d+(?:\.\d+)?月\d+日$/.test(current)
      && !/\d/.test(next)
    ) {
      output.push(`${current} ${next}`.trim());
      index += 1;
      continue;
    }

    output.push(current);
  }

  return uniqueBy(output.map((item) => compactText(item, 26)), (item) => item.toLowerCase());
}

function extractDataPointsFromText(text) {
  const clauses = splitNarrationClauses(text);
  const scored = clauses
    .map((item) => ({
      text: item,
      score: [
        /\d/.test(item) ? 4 : 0,
        /(开源|发布|编码|代码|Agent|优于|持平|测试|部署|效率|场景|团队)/i.test(item) ? 2 : 0,
        item.length >= 6 ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    }))
    .sort((left, right) => right.score - left.score);
  const prioritized = uniqueBy(
    scored
      .map((item) => item.text)
      .filter(Boolean),
    (item) => item.toLowerCase(),
  );

  if (prioritized.length > 0) {
    return prioritized.slice(0, 3);
  }

  return [];
}

function buildAngleExploration(topicLabel, thesis, facts, selectedTitle) {
  const baseFact = compactText(facts[0]?.fact || thesis || topicLabel, 42);
  const secondaryFact = compactText(facts[1]?.fact || facts[0]?.evidenceAnchor || topicLabel, 42);
  const focusTitle = compactText(selectedTitle?.title || topicLabel, 22);
  return [
    {
      angleName: '揭秘型',
      angleDescription: '先拆核心判断，再解释为什么现在值得看。',
      thesisForThisAngle: `围绕「${focusTitle}」先抛判断：${compactText(thesis || baseFact, 48)}`,
      hookText: `先别看表面，「${focusTitle}」真正要讲的是这层逻辑。`,
      platformFit: '抖音:高, 视频号:高',
      score: 88,
    },
    {
      angleName: '问题型',
      angleDescription: '用用户最想先问的问题带入事实线索。',
      thesisForThisAngle: `如果只回答一个问题，就先回答「${compactText(secondaryFact || thesis, 30)}」`,
      hookText: `为什么大家还在继续搜「${focusTitle}」？重点不在热度。`,
      platformFit: '抖音:高, B站:中',
      score: 84,
    },
    {
      angleName: '场景型',
      angleDescription: '把主题拉回真实场景和可执行路径。',
      thesisForThisAngle: `把「${focusTitle}」讲成一条能继续生成标题和分镜的执行路径。`,
      hookText: `真要把「${focusTitle}」讲清楚，第一刀应该切这个场景。`,
      platformFit: '视频号:高, 小红书:中',
      score: 82,
    },
  ];
}

function inferHookType(title, thesis) {
  const text = `${safeString(title)} ${safeString(thesis)}`;
  if (/\?|\？|为什么|到底/.test(text)) {
    return '提问型';
  }
  if (/\d/.test(text)) {
    return '数字型';
  }
  if (/别|不是|真正/.test(text)) {
    return '反差型';
  }
  return '结论型';
}

function normalizeStep1Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const analysis = nextPayload.analysis && typeof nextPayload.analysis === 'object'
    ? nextPayload.analysis
    : {};
  const topicResearch = nextPayload.topicResearch
    || input?.pipelineState?.topicResearch
    || null;
  const results = Array.isArray(topicResearch?.results) ? topicResearch.results : [];
  const researchFacts = Array.isArray(analysis.researchFacts) ? analysis.researchFacts : [];
  const topicLabel = safeString(
    input?.pipelineState?.inputTitleKeywords
    || input?.pipelineState?.inputTopic
    || input?.projectState?.name
    || '当前主题',
  );
  const selectedTitle = getSelectedTitle(input, nextPayload);
  const thesis = safeString(analysis.thesis);
  const bodyLabels = Array.isArray(analysis.process) ? analysis.process.map((item) => safeString(item?.label)).filter(Boolean) : [];

  analysis.searchPhase = {
    scope: results.length > 0 ? '轻量' : '回退',
    searchTools: ['bing-rss'],
    hotTopicsFound: results.slice(0, 3).map((item) => compactText(item?.title, 30)),
    topVideoCount: 0,
    articleCount: results.length,
    dataPointsFound: researchFacts.slice(0, 3).map((item) => compactText(item?.evidenceAnchor || item?.fact, 30)),
    emotionalHooksFound: results.slice(0, 3).map((item) => compactText(item?.snippet, 30)),
    structuralPatternsFound: bodyLabels.slice(0, 4),
    searchFallback: results.length === 0,
    searchError: results.length === 0 ? '未检索到足够公开结果，已退回结构化分析。' : '',
  };
  analysis.multiAngleExploration = buildAngleExploration(topicLabel, thesis, researchFacts, selectedTitle);
  analysis.structure = {
    hookType: inferHookType(selectedTitle?.title, thesis),
    bodyFormat: Array.isArray(analysis.process) && analysis.process.length >= 4 ? '四段推进' : '三段递进',
    ctaType: /评论|留言|继续|追更/.test(safeString(input?.pipelineState?.copy?.cta)) ? '互动型' : '评论互动型',
  };
  analysis.keyDataPoints = researchFacts.slice(0, 4).map((item, index) => ({
    point: compactText(item?.fact, 48),
    source: compactText(item?.evidenceAnchor || item?.sourceTitle || topicLabel, 48),
    usage: index === 0 ? 'Hook' : index >= 2 ? 'CTA' : 'Body',
  }));
  analysis.competitors = {
    commonAngles: analysis.multiAngleExploration.map((item) => item.angleName),
    note: '这些角度来自公开讨论与现有技能规则，只做参考，不做硬限制。',
  };
  analysis.sources = {
    hotTopics: results.slice(0, 2),
    articles: results.slice(0, 3),
    searchResults: results.slice(0, 5),
  };
  nextPayload.analysis = analysis;
  return nextPayload;
}

function normalizeStep2Payload(payload) {
  const nextPayload = clone(payload || {});
  const titles = nextPayload.titles && typeof nextPayload.titles === 'object'
    ? nextPayload.titles
    : {};
  const options = Array.isArray(titles.options) ? titles.options : [];
  titles.options = options.map((item) => {
    const score = clamp(round(item?.score || 0), 0, 100);
    const angle = safeString(item?.angle) || '解释型';
    return {
      ...item,
      platform: safeString(item?.platform) || (/问题|揭秘|反差/.test(angle) ? '抖音 / 视频号' : '抖音 / B站'),
      hookStrength: safeString(item?.hookStrength) || (score >= 88 ? '高' : score >= 76 ? '中' : '低'),
      suitableFor: safeString(item?.suitableFor) || (/问题/.test(angle) ? '问题开场' : /反差|揭秘/.test(angle) ? '首屏钩子' : '解释型开场'),
    };
  });
  nextPayload.titles = titles;
  return nextPayload;
}

function detectCtaStyle(text) {
  const safe = safeString(text);
  if (/评论|留言/.test(safe)) {
    return '互动型';
  }
  if (/关注|追更/.test(safe)) {
    return '关注型';
  }
  if (/转发|分享/.test(safe)) {
    return '分享型';
  }
  return '收束型';
}

function normalizeStep3Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const copy = nextPayload.copy && typeof nextPayload.copy === 'object'
    ? nextPayload.copy
    : {};
  const selectedTitle = getSelectedTitle(input, nextPayload);
  const analysis = input?.pipelineState?.selectedAnalysis || input?.pipelineState?.analysis || {};
  const researchFacts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const keywords = [
    ...tokenizeKeywords(selectedTitle?.title),
    ...tokenizeKeywords(copy.hook),
    ...researchFacts.flatMap((item) => tokenizeKeywords(item?.fact)),
  ].slice(0, 8);
  const totalChars = [
    safeString(copy.hook),
    ...(Array.isArray(copy.body) ? copy.body.map((item) => safeString(item?.text)) : []),
    safeString(copy.cta),
  ].join('').length;

  copy.hookMeta = {
    title: compactText(selectedTitle?.title || '当前主标题', 28),
    score: clamp(round(selectedTitle?.score || 86), 0, 100),
    keywords: keywords.slice(0, 4),
    hookStyle: safeString(selectedTitle?.hookStyle || copy?.brief?.hookAngle) || '结论先行',
  };
  copy.ctaMeta = {
    intent: compactText(copy?.brief?.ctaIntent || '推动留言或继续追更', 34),
    style: detectCtaStyle(copy.cta),
  };
  copy.totalChars = totalChars;
  copy.readingTime = Math.max(15, round(totalChars / 3.4));
  copy.keywords = keywords;
  nextPayload.copy = copy;
  return nextPayload;
}

function createShotId(index, existingId) {
  return safeString(existingId) || `shot-${String(index + 1).padStart(2, '0')}`;
}

function buildStep4Slots(payload, input) {
  const payloadShots = Array.isArray(payload?.shots) ? payload.shots : (Array.isArray(payload) ? payload : []);
  const copy = input?.pipelineState?.copy || {};
  const analysis = input?.pipelineState?.selectedAnalysis || input?.pipelineState?.analysis || {};
  const title = getSelectedTitle(input, payload);
  const body = Array.isArray(copy?.body) ? copy.body : [];
  const facts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const segments = [
    {
      level: '开场钩子',
      type: '开场',
      title: payloadShots[0]?.title || '开场钩子',
      narration: payloadShots[0]?.narration || copy?.hook || '先抛出一个足够抓人的判断。',
    },
    {
      level: '核心信息①',
      type: '信息传递',
      title: payloadShots[1]?.title || body[0]?.label || '核心信息 1',
      narration: payloadShots[1]?.narration || body[0]?.text || facts[0]?.fact || '先给第一条硬信息。',
    },
    {
      level: '核心信息②',
      type: '信息传递',
      title: payloadShots[2]?.title || body[1]?.label || '核心信息 2',
      narration: payloadShots[2]?.narration || body[1]?.text || facts[1]?.fact || '继续推进第二条信息。',
    },
    {
      level: '核心信息③',
      type: '对比',
      title: payloadShots[3]?.title || body[2]?.label || '对比拆解',
      narration: payloadShots[3]?.narration || body[2]?.text || '把差异和判断讲透。',
    },
    {
      level: '核心信息④',
      type: '案例',
      title: payloadShots[4]?.title || body[3]?.label || '案例落地',
      narration: payloadShots[4]?.narration || facts[2]?.fact || analysis?.corePromise || '给一个真实场景或价值落点。',
    },
    {
      level: '收尾互动',
      type: '结尾CTA',
      title: payloadShots[5]?.title || '收尾互动',
      narration: payloadShots[5]?.narration || copy?.cta || '最后收口并推动互动。',
    },
  ];

  return segments.map((segment, index) => {
    const source = payloadShots[index] || {};
    const dataPoints = extractDataPointsFromText(segment.narration);
    const titleKeywords = tokenizeKeywords(`${segment.title} ${segment.narration}`);
    return {
      id: createShotId(index, source.id),
      level: segment.level,
      type: segment.type,
      title: compactText(segment.title || segment.level, 24),
      narration: compactText(segment.narration, 220),
      durationSeconds: clamp(toNumber(source.durationSeconds || Math.max(4, Math.ceil(safeString(segment.narration).length / 22)), 5), 3, 15),
      visual: {
        description: `${segment.level}镜头，围绕「${compactText(title?.title || input?.pipelineState?.inputTitleKeywords || '当前主题', 22)}」呈现 ${compactText(segment.narration, 40)}`,
        focus: segment.type === '对比' ? '左右对比信息层' : segment.type === '案例' ? '真实场景和结果' : '单一主体 + 核心文案',
      },
      dataPoints,
      comparisons: segment.type === '对比'
        ? [{ left: '旧讲法', right: '当前方案' }]
        : [],
      keywords: titleKeywords.slice(0, 5),
    };
  });
}

function normalizeStep4Payload(payload, input) {
  return {
    shots: buildStep4Slots(payload, input),
  };
}

function normalizePromptDataHighlightsZh(dataPoints, shot) {
  const explicit = Array.isArray(dataPoints)
    ? dataPoints.map((item) => compactText(item, 22)).filter(Boolean)
    : [];
  if (explicit.length > 0) {
    return explicit.slice(0, 3);
  }

  const fallback = [
    shot?.type ? `${shot.type}信息` : '',
    shot?.keywords?.[0] ? `关键词：${shot.keywords[0]}` : '',
    shot?.keywords?.[1] ? `补充：${shot.keywords[1]}` : '',
  ].filter(Boolean);

  return fallback.slice(0, 3);
}

function summarizePromptComparisonsZh(comparisons, shot) {
  const validItems = Array.isArray(comparisons)
    ? comparisons.filter((item) => item && (safeString(item.left) || safeString(item.right)))
    : [];

  if (validItems.length === 0) {
    if (shot?.type === '对比') {
      return '画面里保留左右对照关系，突出差异判断。';
    }
    return '';
  }

  const first = validItems[0];
  return `对比关系：${compactText(first.left || '旧方案', 14)} vs ${compactText(first.right || '当前方案', 14)}`;
}

function buildStep5DisplayFields(shot, current) {
  const shotTitle = compactText(
    safeString(current?.shotTitle || shot?.title || shot?.level || shot?.id || '镜头'),
    24,
  );
  const visual = current?.visual && typeof current.visual === 'object'
    ? current.visual
    : (shot?.visual && typeof shot.visual === 'object' ? shot.visual : {});
  const focus = safeString(current?.visualFocusZh || current?.visualFocus || visual.focus || shot?.visual?.focus)
    || (shot?.type === '对比' ? '左右信息对照 + 核心判断' : '主体清晰 + 信息层次明确');
  const description = safeString(current?.visualSummaryZh || current?.promptZh || visual.description || shot?.visual?.description)
    || `围绕「${shotTitle}」呈现 ${compactText(shot?.narration || '当前内容重点', 34)}`;
  const dataHighlightsZh = normalizePromptDataHighlightsZh(current?.dataPoints || shot?.dataPoints, shot);
  const comparisonSummaryZh = safeString(current?.comparisonSummaryZh)
    || summarizePromptComparisonsZh(current?.comparisons || shot?.comparisons, shot);
  const promptZh = safeString(current?.promptZh)
    || `9:16 竖屏画面，${description}，重点突出 ${focus}，保留标题留白，保证主体和信息一眼能看懂。`;
  const negativePromptZh = safeString(current?.negativePromptZh)
    || [
      '避免主体模糊',
      '避免画面元素堆叠',
      '避免文字不可读',
      shot?.type === '对比' ? '避免左右信息失衡' : '避免焦点分散',
    ].join('、');
  const visualSummaryZh = safeString(current?.visualSummaryZh)
    || [description, focus ? `画面重点是 ${focus}` : '', comparisonSummaryZh].filter(Boolean).join('，');

  return {
    shotTitle,
    promptZh,
    visualSummaryZh,
    visualFocusZh: focus,
    negativePromptZh,
    dataHighlightsZh,
    comparisonSummaryZh,
  };
}

function normalizeStep5Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const prompts = nextPayload.prompts && typeof nextPayload.prompts === 'object'
    ? nextPayload.prompts
    : {};
  const byShotId = prompts.byShotId && typeof prompts.byShotId === 'object' ? prompts.byShotId : {};
  const shots = buildStep4Slots({ shots: input?.shotsState }, input);

  prompts.byShotId = shots.reduce((acc, shot) => {
    const current = byShotId[shot.id] && typeof byShotId[shot.id] === 'object'
      ? byShotId[shot.id]
      : {};
    const promptText = safeString(current.imagePrompt || current.prompt)
      || `9:16 竖屏，${compactText(shot.visual?.description, 56)}，${compactText(shot.narration, 40)}，${shot.visual?.focus}`;
    const display = buildStep5DisplayFields(shot, current);
    acc[shot.id] = {
      ...current,
      ...display,
      prompt: promptText,
      imagePrompt: promptText,
      visual: current.visual || shot.visual,
      dataPoints: Array.isArray(current.dataPoints) ? current.dataPoints : shot.dataPoints,
      comparisons: Array.isArray(current.comparisons) ? current.comparisons : shot.comparisons,
      keywords: Array.isArray(current.keywords) ? current.keywords : shot.keywords,
    };
    return acc;
  }, {});
  nextPayload.prompts = prompts;
  return nextPayload;
}

function normalizeStep6Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const voice = nextPayload.voice && typeof nextPayload.voice === 'object'
    ? nextPayload.voice
    : {};
  const shots = Array.isArray(nextPayload.shots) ? nextPayload.shots : (Array.isArray(input?.shotsState) ? input.shotsState : []);
  const byShotId = voice.byShotId && typeof voice.byShotId === 'object' ? voice.byShotId : {};
  const currentScript = Array.isArray(voice.script) ? voice.script : [];

  voice.script = shots.map((shot, index) => {
    const current = currentScript[index] || currentScript.find((item) => item?.shotId === shot.id) || {};
    const fallbackText = safeString(byShotId[shot.id]?.text || shot.narration);
    const duration = clamp(toNumber(current.duration || current.durationSeconds || byShotId[shot.id]?.duration || byShotId[shot.id]?.durationSeconds || shot.durationSeconds, 5), 2, 18);
    return {
      shotId: shot.id,
      text: safeString(current.text || fallbackText),
      duration,
    };
  });
  voice.engine = safeString(voice.engine) || 'chattts';
  voice.language = safeString(voice.language) || 'zh-CN';
  voice.speed = safeString(voice.speed) || '1.0';
  voice.pitch = toNumber(voice.pitch, 0);
  voice.totalDuration = round(voice.script.reduce((sum, item) => sum + toNumber(item.duration, 0), 0));
  voice.totalChars = round(voice.script.reduce((sum, item) => sum + safeString(item.text).length, 0));
  nextPayload.voice = voice;
  return nextPayload;
}

function resolveStylePreset(input) {
  const promptStyle = safeString(input?.pipelineState?.prompts?.byShotId?.['shot-01']?.style);
  const renderTemplate = safeString(input?.pipelineState?.render?.template);
  const renderWidth = toNumber(input?.pipelineState?.render?.width, 0);
  const renderHeight = toNumber(input?.pipelineState?.render?.height, 0);
  if (renderTemplate === 'ultimate' || (renderWidth >= renderHeight && renderWidth >= 1600)) {
    return 'ultimate-1080p';
  }
  if (/科技|tech|hud/i.test(promptStyle)) {
    return 'tech-dark';
  }
  if (/real|真实|minimal/i.test(promptStyle)) {
    return 'minimal-light';
  }
  if (renderTemplate === 'split') {
    return 'minimal-light';
  }
  if (renderTemplate === 'fullscreen') {
    return 'neon';
  }
  return 'tech-dark';
}

function buildProjectBuildPayload(input) {
  const projectId = safeString(input?.projectState?.id) || 'default';
  const template = safeString(input?.pipelineState?.render?.template) || 'caption';
  const quality = safeString(input?.pipelineState?.render?.quality) || 'high';
  const stylePreset = resolveStylePreset(input);
  const compositionId = template === 'ultimate' ? 'UltimateSceneTemplate' : 'OpenClawVideo';
  const files = REMOTION_BUILD_FILES
    .filter((relativePath) => fs.existsSync(path.join(REMOTION_PROJECT_ROOT, relativePath)))
    .map((relativePath) => path.join(REMOTION_PROJECT_ROOT, relativePath));
  const missingFileCount = REMOTION_BUILD_FILES.length - files.length;
  const outputPath = path.join(REMOTION_PROJECT_ROOT, 'public', 'assets', 'outputs', projectId, `${projectId}.mp4`);
  const renderPropsPath = path.join('projects', projectId, 'render-props.json');

  return {
    projectPath: REMOTION_PROJECT_ROOT,
    compositionId,
    stylePreset,
    buildStatus: missingFileCount === 0 ? 'ready' : 'missing',
    files,
    summary: '复用当前 remotion-video 工程作为项目载体，不额外新建仓库。',
    notes: missingFileCount === 0
      ? '当前工程文件完整，可以直接进入最终渲染。'
      : `仍缺少 ${missingFileCount} 个核心构建文件，请先补齐后再渲染。`,
    renderCommand: `node scripts/render-project.mjs ${renderPropsPath} ${outputPath} --log=info`,
  };
}

function normalizeStep7Payload(payload, input) {
  const nextPayload = clone(payload || {});
  nextPayload.projectBuild = {
    ...buildProjectBuildPayload(input),
    ...(nextPayload.projectBuild && typeof nextPayload.projectBuild === 'object' ? nextPayload.projectBuild : {}),
  };
  return nextPayload;
}

function normalizeStep8Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const render = nextPayload.render && typeof nextPayload.render === 'object'
    ? nextPayload.render
    : {};
  const shotDuration = (Array.isArray(input?.shotsState) ? input.shotsState : [])
    .reduce((sum, shot) => sum + toNumber(shot?.durationSeconds, 0), 0);
  const template = safeString(render.template) || 'caption';
  const isUltimate = template === 'ultimate';

  render.template = template;
  render.quality = safeString(render.quality) || 'high';
  render.fps = round(render.fps || 30);
  render.width = round(render.width || (isUltimate ? 1920 : 1080));
  render.height = round(render.height || (isUltimate ? 1080 : 1920));
  render.format = safeString(render.format) || 'mp4';
  render.codec = safeString(render.codec) || 'h264';
  render.bitrate = round(render.bitrate || (isUltimate ? 12000 : 8000));
  render.estimatedDuration = round(render.estimatedDuration || shotDuration || 45);
  render.estimatedSize = safeString(render.estimatedSize) || `~${Math.max(8, round((render.bitrate * render.estimatedDuration / 8) / 1024))}MB`;
  render.notes = safeString(render.notes) || (
    isUltimate
      ? 'Step 8 采用 Ultimate 1920x1080 横版模板，适合结构化讲解、卡片拆解和章节化内容。'
      : 'Step 8 只保留最终渲染语义：参数、预览、导出。'
  );
  nextPayload.render = render;
  return nextPayload;
}

function alignPayloadToSkill(stepId, payload, input) {
  if (Number(stepId) === 1) {
    return normalizeStep1Payload(payload, input);
  }
  if (Number(stepId) === 2) {
    return normalizeStep2Payload(payload, input);
  }
  if (Number(stepId) === 3) {
    return normalizeStep3Payload(payload, input);
  }
  if (Number(stepId) === 4) {
    return normalizeStep4Payload(payload, input);
  }
  if (Number(stepId) === 5) {
    return normalizeStep5Payload(payload, input);
  }
  if (Number(stepId) === 6) {
    return normalizeStep6Payload(payload, input);
  }
  if (Number(stepId) === 7) {
    return normalizeStep7Payload(payload, input);
  }
  if (Number(stepId) === 8) {
    return normalizeStep8Payload(payload, input);
  }
  return clone(payload || {});
}

function detectForbiddenWords(text, type) {
  const safe = safeString(text);
  return (EVAL_FORBIDDEN_WORDS[type] || []).filter((item) => safe.includes(item));
}

function buildEvaluation(stepId, skillId, dimensions, issues, suggestions, forbiddenWords = {}) {
  const score = average(Object.values(dimensions));
  const status = score >= 88
    ? 'PASS'
    : score >= 74
      ? 'PASS_WARN'
      : score >= 56
        ? 'RETRY'
        : 'FAIL';

  return {
    stepId: Number(stepId),
    skillId,
    score,
    status,
    issues,
    suggestions,
    dimensions,
    forbiddenWords,
    evaluatedAt: new Date().toISOString(),
  };
}

function evaluateStep1(payload) {
  const analysis = payload?.analysis || {};
  const facts = Array.isArray(analysis.researchFacts) ? analysis.researchFacts : [];
  const layers = Array.isArray(analysis.layers) ? analysis.layers : [];
  const process = Array.isArray(analysis.process) ? analysis.process : [];
  const multiAngles = Array.isArray(analysis.multiAngleExploration) ? analysis.multiAngleExploration : [];
  const issues = [];
  const suggestions = [];

  if (!safeString(analysis.thesis)) issues.push('缺少主命题 thesis');
  if (facts.length < 2) issues.push('搜索事实不足 2 条');
  if (multiAngles.length < 2) issues.push('多角度探索不足');
  if (layers.length < 3) suggestions.push('建议补齐 3 层以上分析层');
  if (process.length < 3) suggestions.push('建议补齐执行路径步骤');

  return buildEvaluation(
    1,
    'video-pipeline-analysis',
    {
      relevance: safeString(analysis.thesis) ? 92 : 56,
      clarity: layers.length >= 3 ? 88 : 66,
      dataBacked: facts.length >= 3 ? 90 : facts.length >= 2 ? 78 : 48,
      completeness: process.length >= 3 && multiAngles.length >= 2 ? 90 : 68,
    },
    issues,
    suggestions,
  );
}

function evaluateStep2(payload) {
  const titles = payload?.titles || {};
  const options = Array.isArray(titles.options) ? titles.options : [];
  const forbiddenWords = {
    title: options.flatMap((item) => detectForbiddenWords(item?.title, 'title')),
  };
  const uniqueAngles = new Set(options.map((item) => safeString(item?.angle)).filter(Boolean)).size;
  const issues = [];
  const suggestions = [];

  if (options.length < 4) issues.push('标题池不足 4 条');
  if (!safeString(titles.selectedId)) issues.push('缺少已选主标题');
  if (forbiddenWords.title.length > 0) issues.push(`命中标题禁词：${forbiddenWords.title.join('、')}`);
  if (uniqueAngles < Math.min(4, options.length)) suggestions.push('建议增加标题角度差异');

  return buildEvaluation(
    2,
    'video-pipeline-title',
    {
      hookStrength: options.length > 0 ? average(options.map((item) => clamp(round(item?.score || 0), 60, 96))) : 42,
      platformFit: options.every((item) => safeString(item?.platform)) ? 88 : 70,
      originality: uniqueAngles >= 4 ? 86 : uniqueAngles >= 3 ? 74 : 58,
      completeness: options.length >= 4 && safeString(titles.selectedReason) ? 90 : 68,
    },
    issues,
    suggestions,
    forbiddenWords,
  );
}

function evaluateStep3(payload) {
  const copy = payload?.copy || {};
  const body = Array.isArray(copy.body) ? copy.body : [];
  const forbiddenWords = {
    copy: [...detectForbiddenWords(copy.hook, 'copy'), ...body.flatMap((item) => detectForbiddenWords(item?.text, 'copy'))],
    cta: detectForbiddenWords(copy.cta, 'cta'),
  };
  const issues = [];
  const suggestions = [];
  const totalChars = round(copy.totalChars || 0);

  if (!safeString(copy.hook)) issues.push('缺少 Hook');
  if (body.length === 0) issues.push('缺少正文段落');
  if (!safeString(copy.cta)) issues.push('缺少 CTA');
  if (forbiddenWords.copy.length > 0 || forbiddenWords.cta.length > 0) {
    issues.push('命中了 eval 禁词，建议重写更自然的人话表达');
  }
  if (totalChars > 0 && totalChars < 120) suggestions.push('正文偏短，建议补充 1 段硬信息或案例');

  return buildEvaluation(
    3,
    'video-pipeline-content',
    {
      density: totalChars >= 180 ? 88 : totalChars >= 120 ? 76 : 58,
      spoken: safeString(copy?.brief?.tone) ? 84 : 72,
      pacing: safeString(copy?.brief?.pacing) ? 88 : 68,
      cta: safeString(copy.cta) ? 90 : 40,
      compliance: forbiddenWords.copy.length === 0 && forbiddenWords.cta.length === 0 ? 90 : 56,
    },
    issues,
    suggestions,
    forbiddenWords,
  );
}

function evaluateStep4(payload) {
  const shots = Array.isArray(payload?.shots) ? payload.shots : [];
  const issues = [];
  const suggestions = [];
  if (shots.length !== 6) issues.push('分镜未对齐固定 6 镜头结构');
  if (shots.some((shot) => toNumber(shot?.durationSeconds, 0) < 3 || toNumber(shot?.durationSeconds, 0) > 15)) {
    suggestions.push('建议把镜头时长继续压到 3-15 秒区间');
  }

  return buildEvaluation(
    4,
    'video-pipeline-storyboard',
    {
      durationAccuracy: shots.length === 6 ? 86 : 60,
      rhythm: shots.every((shot) => toNumber(shot?.durationSeconds, 0) >= 3) ? 84 : 64,
      structure: shots.every((shot) => safeString(shot?.level) && safeString(shot?.type)) ? 90 : 66,
      completeness: shots.length === 6 && shots.every((shot) => Array.isArray(shot?.keywords)) ? 88 : 68,
    },
    issues,
    suggestions,
  );
}

function evaluateStep5(payload, input) {
  const prompts = payload?.prompts?.byShotId && typeof payload.prompts.byShotId === 'object'
    ? payload.prompts.byShotId
    : {};
  const promptList = Object.values(prompts);
  const targetCount = Array.isArray(input?.shotsState) ? input.shotsState.length : 0;
  const issues = [];
  if (promptList.length === 0) issues.push('没有生成任何分镜 prompt');
  if (targetCount > 0 && promptList.length !== targetCount) issues.push('prompt 数量与镜头数量不一致');

  return buildEvaluation(
    5,
    'video-pipeline-storyboard',
    {
      specificity: promptList.every((item) => safeString(item?.imagePrompt || item?.prompt).length >= 24) ? 88 : 64,
      coverage: targetCount > 0 && promptList.length === targetCount ? 90 : 62,
      structure: promptList.every((item) => Array.isArray(item?.keywords) && item?.keywords.length > 0) ? 86 : 66,
      consistency: promptList.every((item) => item?.visual && item?.dataPoints) ? 84 : 68,
    },
    issues,
    ['建议继续补充 visual / dataPoints / comparisons，方便图像和 Step 7 复用。'],
  );
}

function evaluateStep6(payload, input) {
  const voice = payload?.voice || {};
  const script = Array.isArray(voice.script) ? voice.script : [];
  const shotCount = Array.isArray(input?.shotsState) ? input.shotsState.length : 0;
  const issues = [];
  if (script.length === 0) issues.push('缺少逐镜配音脚本');
  if (shotCount > 0 && script.length !== shotCount) issues.push('配音脚本数量与镜头数量不一致');

  return buildEvaluation(
    6,
    'video-pipeline-audio',
    {
      timing: round(voice.totalDuration || 0) > 0 ? 88 : 62,
      spoken: script.every((item) => safeString(item?.text).length > 0) ? 86 : 64,
      engine: safeString(voice.engine) === 'chattts' ? 92 : 82,
      completeness: safeString(voice.language) && safeString(voice.speed) ? 88 : 68,
    },
    issues,
    ['如需更贴合目标时长，可在 Step 6 继续微调 speed / pitch / script。'],
  );
}

function evaluateStep7(payload) {
  const projectBuild = payload?.projectBuild || {};
  const files = Array.isArray(projectBuild.files) ? projectBuild.files : [];
  const issues = [];
  if (!safeString(projectBuild.projectPath)) issues.push('缺少项目路径');
  if (!safeString(projectBuild.compositionId)) issues.push('缺少 compositionId');
  if (!safeString(projectBuild.renderCommand)) issues.push('缺少 renderCommand');
  if (safeString(projectBuild.buildStatus) !== 'ready') issues.push('Remotion 项目构建状态未就绪');

  return buildEvaluation(
    7,
    'remotion-video-maker',
    {
      structure: files.length >= 4 ? 92 : 64,
      compilable: safeString(projectBuild.buildStatus) === 'ready' ? 90 : 56,
      coverage: safeString(projectBuild.compositionId) ? 88 : 58,
      command: safeString(projectBuild.renderCommand) ? 90 : 52,
    },
    issues,
    files.length >= 4 ? [] : ['建议补齐核心 Remotion 项目文件后再进入渲染。'],
  );
}

function evaluateStep8(payload) {
  const render = payload?.render || {};
  const issues = [];
  if (!safeString(render.template)) issues.push('缺少渲染模板');
  if (!safeString(render.quality)) issues.push('缺少质量档位');

  return buildEvaluation(
    8,
    'video-pipeline-video',
    {
      template: safeString(render.template) ? 90 : 56,
      quality: safeString(render.quality) ? 88 : 56,
      params: render.fps && render.width && render.height && render.codec ? 90 : 62,
      estimation: render.estimatedDuration && safeString(render.estimatedSize) ? 86 : 64,
    },
    issues,
    ['Step 8 只负责渲染参数和成片结果，项目构建问题请回到 Step 7 检查。'],
  );
}

function evaluateStepPayload(stepId, payload, input) {
  if (Number(stepId) === 1) return evaluateStep1(payload);
  if (Number(stepId) === 2) return evaluateStep2(payload);
  if (Number(stepId) === 3) return evaluateStep3(payload);
  if (Number(stepId) === 4) return evaluateStep4(payload);
  if (Number(stepId) === 5) return evaluateStep5(payload, input);
  if (Number(stepId) === 6) return evaluateStep6(payload, input);
  if (Number(stepId) === 7) return evaluateStep7(payload);
  if (Number(stepId) === 8) return evaluateStep8(payload);
  return null;
}

function enrichStepResult(stepId, payload, input, providedSkillSpec = null) {
  const resolvedSkill = providedSkillSpec || ensureStepSkillReady(stepId);
  const alignedPayload = alignPayloadToSkill(stepId, payload, input);
  const evaluation = evaluateStepPayload(stepId, alignedPayload, input);

  if (Number(stepId) === 7 && alignedPayload?.projectBuild && evaluation) {
    alignedPayload.projectBuild.eval = evaluation;
  }

  return {
    payload: alignedPayload,
    resolvedSkill,
    evaluation,
  };
}

module.exports = {
  STEP_TO_SKILL_ID,
  alignPayloadToSkill,
  ensureStepSkillReady,
  enrichStepResult,
  evaluateStepPayload,
  getSkillSpec,
  getStepSkillId,
  getStepSkillSpec,
  listSkillCatalog,
};

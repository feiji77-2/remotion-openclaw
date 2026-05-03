const fs = require('fs');
const os = require('os');
const path = require('path');
const {resolveFamilyShotContract, CAMERA_INTENT_TO_MOTION} = require('../../src/data/shotGrammar.ts');
const {getRhythmContract, getPreferredCameraMotion, getCameraMotion} = require('../../src/data/registry.ts');
const {getPhaseForStep} = require('./phaseRegistry');
const { safeString: libSafeString, toNumber: libToNumber, compactText: libCompactText } = require('../../scripts/lib/index.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const HOME_DIR = os.homedir();
const REMOTION_PROJECT_ROOT = path.resolve(__dirname, '../..');
const WORKFLOW_SKILLS_DIR = path.join(REMOTION_PROJECT_ROOT, 'docs', 'workflow-skills');
const REMOTION_BUILD_FILES = [
  'src/Root.tsx',
  'src/compositions/UltimateSceneTemplate.tsx',
  'src/data/storyboard.ts',
  'src/animations/video-effects.tsx',
];

const STEP_TO_SKILL_ID = {
  1: 'video-pipeline-analysis',
  2: 'video-pipeline-title',
  3: 'video-pipeline-content',
  4: 'video-pipeline-scene-planner',
  5: 'video-pipeline-scene-prompts',
  6: 'video-pipeline-audio',
  7: 'remotion-video-maker',
  8: 'video-pipeline-video',
};

const VIRAL_TITLE_TECHNIQUES = [
  { id: 'digital', label: '数字法', description: '具体数字制造记忆锚点', example: '82.7%编码能力' },
  { id: 'contrast', label: '反差法', description: '认知/身份反差制造矛盾', example: '程序员开始抢产品经理的活' },
  { id: 'suspense', label: '悬念法', description: '制造信息缺口让人想点开', example: 'OpenAI没告诉你的三个秘密' },
  { id: 'identity', label: '身份标签法', description: '精准人群定位', example: '程序员必看' },
  { id: 'question', label: '疑问法', description: '抛出观众最想问的问题', example: 'GPT-5.5到底强在哪？' },
  { id: 'dialog', label: '对话/情绪法', description: '口语化制造对话感', example: '凭什么卖这么贵？看完我沉默了' },
];

const VIRAL_TITLE_FORMULAS = [
  { template: '[具体数字/事件] + [核心变化] + [悬念/价值]', example: '82.7%编码能力背后，GPT-5.5真正改变的是这件事' },
  { template: '[身份] + [反差行为/结果]', example: '程序员开始用GPT-5.5抢产品经理的活了' },
  { template: '[否定/颠覆] + [常识] + [新结论]', example: '别再说AI只会聊天了，它现在能替你做决策' },
  { template: '[时间/事件] + [悬念] + [具体动作]', example: 'GPT-5.5发布后，第一批用的程序员都在用它做这件事' },
  { template: '[极端数据] + [反差说明]', example: '编码82.7%不是最重要的，GPT-5.5真正突破的是这个' },
];

const VIRAL_TITLE_NOTES = `爆款标题六大手法（必须至少用一种）：
${VIRAL_TITLE_TECHNIQUES.map(t => `${t.id === 'dialog' ? '6' : VIRAL_TITLE_TECHNIQUES.indexOf(t) + 1}. ${t.label}：${t.description}（如"${t.example}"）`).join('\n')}

爆款标题公式（科技AI类主攻）：
${VIRAL_TITLE_FORMULAS.map((f, i) => `- ${f.example}`).join('\n')}

每个标题必须：
- 至少包含一种爆款手法
- 有具体数据或场景（不能泛泛而谈）
- 角度之间差异明显
- 前3秒必须抓人（让人停下来想看）
- 控制在25字以内
- 口语化，符合抖音/视频号传播语气`;

const SKILL_DEFINITIONS = [
  {
    skillId: 'video-pipeline-analysis',
    category: 'step',
    stepId: 1,
    phaseId: 1,
    phaseLabel: '研究选题',
    stepLabel: 'Step 1 · 逻辑分析',
    name: 'video-pipeline-analysis',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-analysis', 'SKILL.md'),
    displaySummary: '先补 topicResearch，再归一化为 analysis / researchFacts / keyDataPoints，供 Step 2/3/4 直接复用。',
    inputs: ['topic', 'platform', 'tone', 'targetDuration', 'audienceHint', 'searchScope'],
    outputs: [
      'topicResearch',
      'analysis.searchPhase',
      'analysis.thesis',
      'analysis.audience',
      'analysis.corePromise',
      'analysis.layers[]',
      'analysis.process[]',
      'analysis.researchFacts[]',
      'analysis.multiAngleExploration[]',
      'analysis.structure',
      'analysis.keyDataPoints[]',
      'analysis.sources',
    ],
    defaults: {
      platform: '抖音',
      tone: '专业',
      targetDuration: 45,
      searchScope: '轻量',
      goal: '先从公开线索中提炼出可继续生成标题和文案的分析框架。',
      style: '数据驱动、结论先行、避免空泛背景。',
      emphasis: '事实线索、观众关注点、多角度切口。',
      avoid: '模板化分析、无证据判断、长背景铺垫。',
      notes: 'Step 1 输出要同时服务 Step 2/3/4，当前搜索链路使用工程内建 duckduckgo-html 适配。',
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
    phaseId: 2,
    phaseLabel: '标题确认',
    stepLabel: 'Step 2 · 标题生成',
    name: 'video-pipeline-title',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-title', 'SKILL.md'),
    displaySummary: '围绕已确认分析生成多角度标题池，输出当前工程消费的 selectedId、title metrics 和主标题理由。',
    inputs: ['inputTopic', 'analysis.thesis', 'analysis.audience', 'analysis.corePromise', 'analysis.researchFacts[]', 'analysis.multiAngleExploration[]'],
    outputs: [
      'titles.options[].id',
      'titles.options[].title',
      'titles.options[].angle',
      'titles.options[].platform',
      'titles.options[].hookStrength',
      'titles.options[].suitableFor',
      'titles.options[].hookScore',
      'titles.options[].ctrPredict',
      'titles.options[].first3Sec',
      'titles.options[].infoDensity',
      'titles.options[].noveltyScore',
      'titles.selectedId',
      'titles.selectedReason',
    ],
    defaults: {
      goal: '生成 4-5 个差异明显的短视频标题候选，每个必须包含爆款手法。',
      style: '短促、抓人、先给判断。口语化，25字以内。',
      emphasis: '多角度、平台适配、主标题可选。',
      avoid: [
        '空洞表达：开始替你干活、颠覆认知、重新定义XX',
        '通用描述：所有大模型都适用的描述（如"能回答问题""能干活""更智能"）',
        '模糊承诺：带来革命、改变未来、引领新时代',
        '无数据支撑：没有具体数字或事实的泛泛而谈',
        '重复句式：换汤不换药的近似表达',
        '"替你干活"这个表达要具象化，不能单独出现（如要改成"从工具变成实习生"）',
      ].join('。'),
      notes: VIRAL_TITLE_NOTES,
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
    phaseId: 3,
    phaseLabel: '口播文案',
    stepLabel: 'Step 3 · 内容生成',
    name: 'video-pipeline-content',
    sourcePath: path.join(WORKFLOW_SKILLS_DIR, 'video-pipeline-content.SKILL.md'),
    displaySummary: '根据标题、分析和生成要求，产出口语化 Hook / Body / CTA。',
    inputs: ['inputTopic', 'selectedTitle', 'analysis.thesis', 'analysis.audience', 'analysis.searchPhase', 'analysis.researchFacts[]'],
    outputs: [
      'copy.brief',
      'copy.outline[]',
      'copy.hook',
      'copy.body[]',
      'copy.body[].sceneIntent',
      'copy.body[].evidenceAnchor',
      'copy.body[].keywords',
      'copy.body[].dataPoints',
      'copy.cta',
      'copy.totalChars',
      'copy.readingTime',
      'copy.keywords',
      'copy.titleAlignment',
      'copy.storySpine',
      'copy.coverage',
    ],
    defaults: {
      goal: '生成适合中文短视频口播的拟人化文案。',
      style: '结论先行、口语化、少 AI 味。',
      emphasis: 'Hook 留人、正文递进、CTA 自然。',
      avoid: '机器人说明文、过长铺垫、空洞价值词。',
      notes: '支持单独控制时长、字数、去 AI 味和拟人口播。',
      targetDurationSeconds: 180,
      targetWordCount: 900,
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
      '正文块应尽量带 sceneIntent / evidenceAnchor / keywords / dataPoints，方便 Step 4 消费。',
    ],
    uiHints: [
      '适合拆为文案策略、大纲节拍、最终文案三块。',
      '可展示标题对齐、证据覆盖、场景意图和时长估算。',
      '展示字数和预估口播时长。',
    ],
    evalRules: [
      '信息密度、口语化、节奏、标题对齐、证据覆盖、CTA 力度、合规性。',
    ],
  },
  {
    skillId: 'video-pipeline-scene-planner',
    category: 'step',
    stepId: 4,
    phaseId: 4,
    phaseLabel: '分镜与视觉',
    stepLabel: 'Step 4 · 场景编排',
    name: 'video-pipeline-scene-planner',
    sourcePath: path.join(WORKFLOW_SKILLS_DIR, 'video-pipeline-scene-planner.SKILL.md'),
    displaySummary: '把文案编排成可变场景数的 Ultimate 横版场景计划，并补齐 script 绑定、director 合同和 20 family 命中。',
    inputs: ['copy.hook', 'copy.body[]', 'copy.cta', 'copy.body[].mechanismDepth.visualHint', 'analysis.keyDataPoints', 'analysis.researchFacts[]'],
    outputs: [
      'shots[]',
      'shots[].sceneFamily',
      'shots[].templateCandidates',
      'shots[].scriptBlockId',
      'shots[].scriptSourceText',
      'shots[].storyboardCueZh',
      'shots[].director.cameraMotion',
      'shots[].director.revealDirection',
      'scenePlan',
      'templateCatalog',
      'visualSystem',
    ],
    defaults: {
      goal: '把 Step 3 结构化口播拆成 Ultimate 1920x1080 横版场景计划，而不是固定 6 镜头。',
      style: '导演化分镜、章节推进、服务口播原句的横版信息视频。',
      emphasis: 'Hero 开场、机制拆解、图形表达、证据支撑、family 去重、镜头主次。',
      avoid: '固定 6 镜头、family 重复、空泛标题镜头、竖屏旧提示词、全是框的信息面板。',
      notes: 'Step 4 负责场景数、场景角色、script 绑定、director 合同和 template family 预命中；如果一段正文同时包含机制、数据、对比，可以拆成多个 shot。',
    },
    constraints: [
      '第一屏固定 hero，最后一屏固定 cta。',
      '中段场景数可变，但必须保持 20 模板系统兼容。',
      '每个场景都要有层级、类型、时长、sceneFamily 和候选 family。',
      '每个场景都要保留 scriptRole / scriptBlockId / scriptBlockLabel / scriptSourceText / scriptExcerpt。',
      '每个中段场景都必须回指到具体口播段落，不允许只围绕标题造泛镜头。',
      '每个场景都要补 director.cameraMotion / director.staggerGap / director.revealDirection。',
    ],
    qualityRules: [
      'shots 长度至少为 6，且不能只是旧 6 镜头模板复写。',
      '每个场景都要有 16:9 横版语义和可复用的结构化字段。',
      'scenePlan 需要给出 familiesUsed / sceneCount / visualSystem。',
      '输出需要带 visualSystem=ultimate-1080p 和 templateCatalog。',
      '如果正文里出现数据、流程、架构或对比，至少要命中一次对应图形型 family，不要全部压成 feature-rail 或信息面板。',
    ],
    uiHints: [
      'Step 4 适合按 scene family 展示场景卡和时长分配。',
      '可把 templateCandidates 作为“命中备选”展示。',
    ],
    evalRules: [
      'family 多样性、节奏分配、结构完整性、Ultimate 对齐度。',
      '每个 shot 的 narration 必须有不同的核心信息点，不允许文案重复。',
      '中段 shot 的 narration 必须包含至少一个具体数据点或硬证据，不能空洞。',
    ],
  },
  {
    skillId: 'video-pipeline-scene-prompts',
    category: 'step',
    stepId: 5,
    phaseId: 4,
    phaseLabel: '分镜与视觉',
    stepLabel: 'Step 5 · 视觉提示词',
    name: 'video-pipeline-scene-prompts',
    sourcePath: path.join(WORKFLOW_SKILLS_DIR, 'video-pipeline-scene-prompts.SKILL.md'),
    displaySummary: '基于 Ultimate 场景计划生成 16:9 横版视觉提示词、脚本绑定字段和图片任务字段。',
    inputs: ['shots[]', 'shots[].sceneFamily', 'analysis.keyDataPoints', 'copy'],
    outputs: [
      'prompts.byShotId',
      'prompts.byShotId[].prompt',
      'prompts.byShotId[].promptZh',
      'prompts.byShotId[].imagePrompt',
      'prompts.byShotId[].sceneFamily',
      'prompts.byShotId[].scriptExcerpt',
      'prompts.byShotId[].storyboardCueZh',
      'prompts.byShotId[].canvasRatio',
      'prompts.byShotId[].canvasWidth',
      'prompts.byShotId[].canvasHeight',
      'templateCatalog',
    ],
    defaults: {
      goal: '为每个场景生成适合 1920x1080 的视觉提示词和画面摘要，严格服务对应口播原句。',
      style: '科技信息视频、横版导演化构图、适合 Ultimate 20 family 命中。',
      emphasis: '主体清晰、构图明确、信息层分明、图形演示优先、可服务图片和后续渲染。',
      avoid: '9:16 竖屏语义、抽象海报词、family 与画面内容错位、只有氛围没有主体。',
      notes: 'Step 5 只做视觉和图片任务语义，不再退回旧 storyboard prompt；每条 prompt 都要写清主体现身、信息层、标题留白区，并对齐 16:9 画布字段。',
    },
    constraints: [
      '每个 prompt 都必须和对应 sceneFamily 对齐。',
      '默认使用 16:9 横版、1920x1080、科技讲解视频语义。',
      '图片提示词数量必须和场景数量一致。',
      '每个 prompt 都必须服务对应 shot 的 sceneIntent / dataPoints / scriptExcerpt / storyboardCueZh。',
    ],
    qualityRules: [
      'prompts.byShotId 不能为空。',
      '每个 prompt 至少包含画面重点、摘要、negativePrompt、sceneFamily 和脚本绑定字段。',
      '每条提示词都要能支撑后续图片任务和 Ultimate 场景复用。',
      '不得把 architecture-map 和 memory-graph、timeline 和 step-flow、terminal 和 code 写成同构画面。',
    ],
    uiHints: [
      '适合按 scene family 展示 prompt 卡片和图片状态。',
      '可直接展示 visualSummaryZh / visualFocusZh / comparisonSummaryZh。',
    ],
    evalRules: [
      '覆盖率、family 一致性、横版语义、数据完整性。',
    ],
  },
  {
    skillId: 'video-pipeline-audio',
    category: 'step',
    stepId: 6,
    phaseId: 5,
    phaseLabel: '配音与时长',
    stepLabel: 'Step 6 · 配音脚本',
    name: 'video-pipeline-audio',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-audio', 'SKILL.md'),
    displaySummary: '根据场景结构产出 qwen-tts 合同、逐场景脚本和时长统计，供 voiceJob / subtitles / renderWorker 复用。',
    inputs: ['shots[]', 'shots[].durationSeconds', 'copy'],
    outputs: ['voice.engine', 'voice.language', 'voice.speed', 'voice.pitch', 'voice.script[]', 'voice.totalDuration', 'voice.totalChars'],
    defaults: {
      engine: 'qwen-tts',
      language: 'zh-CN',
      speed: '1.0',
      pitch: 0,
      goal: '生成可直接提交 TTS 的逐场景脚本。',
      style: '口语化、节奏稳定、适合千问 TTS。',
      emphasis: '场景时长匹配、总时长统计、脚本清晰。',
      avoid: '书面腔、场景间时长失衡。',
      notes: '当前统一使用阿里千问 TTS 链路；Step 6 只产出语音合同，不直接生成音频文件。',
    },
    constraints: [
      '脚本数量要和场景数量对齐。',
      '每个场景文本长度和时长要大致匹配。',
    ],
    qualityRules: [
      'voice.script 不能为空。',
      'totalDuration / totalChars 需要可计算。',
      '默认引擎为 Qwen TTS。',
    ],
    uiHints: [
      '展示引擎、总时长、总字数和逐场景脚本。',
    ],
    evalRules: [
      '时长匹配、口语化、停顿节奏。',
    ],
  },
  {
    skillId: 'remotion-video-maker',
    category: 'step',
    stepId: 7,
    phaseId: 6,
    phaseLabel: '出片',
    stepLabel: 'Step 7 · 项目构建摘要',
    name: 'remotion-video-maker',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'remotion-video-maker', 'SKILL.md'),
    displaySummary: '复用现有 remotion-video 工程，生成 projectBuild 摘要、核心文件列表和 renderCommand，不执行渲染。',
    inputs: ['analysis', 'titles', 'copy', 'shots', 'prompts', 'voice', 'render'],
    outputs: [
      'projectBuild.projectPath',
      'projectBuild.compositionId',
      'projectBuild.stylePreset',
      'projectBuild.buildStatus',
      'projectBuild.files',
      'projectBuild.summary',
      'projectBuild.notes',
      'projectBuild.renderCommand',
      'projectBuild.eval',
    ],
    defaults: {
      stylePreset: 'tech-dark',
      goal: '把当前流水线结果映射到 Remotion 项目载体上。',
      style: '复用现有工程，不重复搭仓库。',
      emphasis: 'composition、项目路径、渲染命令、构建可用性。',
      avoid: '重新创建新工程、丢失已有产物路径。',
      notes: 'Step 7 只做项目构建摘要，固定复用当前 remotion-video 工程；Step 8 只做渲染设置和导出。',
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
    phaseId: 6,
    phaseLabel: '出片',
    stepLabel: 'Step 8 · 最终渲染',
    name: 'video-pipeline-video',
    sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 'video-pipeline-video', 'SKILL.md'),
    displaySummary: '只负责最终渲染参数、预估时长大小和导出语义，不再混入项目构建。',
    inputs: ['shots.length', 'shots[].durationSeconds', 'template', 'quality'],
    outputs: ['render.template', 'render.quality', 'render.fps', 'render.width', 'render.height', 'render.format', 'render.codec', 'render.bitrate', 'render.estimatedDuration', 'render.estimatedSize', 'render.notes'],
    defaults: {
      template: 'ultimate',
      quality: 'high',
      fps: 30,
      width: 1920,
      height: 1080,
      format: 'mp4',
      codec: 'h264',
      bitrate: 12000,
      goal: '给出面向最终导出的渲染参数。',
      style: '参数清楚、推荐理由简洁。',
      emphasis: '模板、质量、预计时长、大小和导出说明。',
      avoid: '把项目生成职责继续塞进 Step 8。',
      notes: '默认采用 Ultimate 1920x1080 横版参数；竖屏只保留给非-ultimate 兼容分支。',
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
    displaySummary: '负责步骤顺序、checkpoint、资产路径和全链路编排，按当前 repo-owned + external skill 映射执行。',
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
    displaySummary: '提供评分维度、禁词和提示建议；当前只做 advisory，统一由 skillRegistry 返回 evaluation。',
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
  copy: ['最强', '顶级', '国家级', '100%', '绝对'],
  cta: ['立即', '赶紧', '马上', '立刻'],
};

const ULTIMATE_TEMPLATE_CATALOG = [
  { family: 'hero', label: 'Hero', style: '大标题封面', bestFor: '开场、章节起势', hitSignals: ['首屏', '开场', '章节'] },
  { family: 'feature-rail', label: 'Feature Rail', style: '2x2 四卡拆解', bestFor: '场景、角色、能力拆解', hitSignals: ['场景', '团队', '案例', '痛点'] },
  { family: 'focus', label: 'Focus', style: '单概念聚焦', bestFor: '核心概念、关键词定义', hitSignals: ['单一焦点', '短 visualFocus'] },
  { family: 'step-flow', label: 'Step Flow', style: '3+2 步骤流', bestFor: '流程、工作流、操作步骤', hitSignals: ['第一', '第二', '步骤', '先再后'] },
  { family: 'timeline', label: 'Timeline', style: '时间轴', bestFor: '发布时间线、版本推进', hitSignals: ['发布时间', 'roadmap', 'release', '日期'] },
  { family: 'compare-board', label: 'Compare Board', style: '左右对照', bestFor: '方案对比、A/B 差异', hitSignals: ['对比', 'VS', '差异', 'before/after'] },
  { family: 'number-strip', label: 'Number Strip', style: '条带式反转卡', bestFor: '认知反转、误区纠正', hitSignals: ['很多人以为', '不是…而是…', '误解'] },
  { family: 'terminal', label: 'Terminal', style: '终端日志窗', bestFor: '命令、日志、脚本执行', hitSignals: ['终端', 'shell', 'cli', 'render'] },
  { family: 'evidence-wall', label: 'Evidence Wall', style: '证据墙', bestFor: '来源、GitHub、论文、实测', hitSignals: ['官方', 'GitHub', 'docs', 'benchmark', '证据'] },
  { family: 'tag-matrix', label: 'Tag Matrix', style: '主模块 + 标签带', bestFor: '关键词归类、能力盘点', hitSignals: ['keywords', 'dataPoints 丰富'] },
  { family: 'code', label: 'Code', style: 'JSON / schema 面板', bestFor: '配置、接口、JSON、代码证据', hitSignals: ['json', 'schema', 'api', '配置'] },
  { family: 'architecture-map', label: 'Architecture Map', style: '中心节点拓扑图', bestFor: '架构、模块、Agent 分层', hitSignals: ['架构', '系统', '模块', 'agent'] },
  { family: 'metrics', label: 'Metrics', style: '大数字与指标条', bestFor: '时间、成本、效率结果', hitSignals: ['数字', '效率', '成本', '%'] },
  { family: 'data-stream', label: 'Data Stream', style: '实时流面板', bestFor: '吞吐、QPS、tokens/s', hitSignals: ['实时', 'stream', 'monitor', '吞吐'] },
  { family: 'memory-graph', label: 'Memory Graph', style: '知识图谱', bestFor: '上下文、记忆、检索链路', hitSignals: ['memory', '上下文', '检索', 'graph'] },
  { family: 'pipeline-flow', label: 'Pipeline Flow', style: '阶段管线图', bestFor: '处理链路、编排管线', hitSignals: ['pipeline', 'flow', '链路', 'stage'] },
  { family: 'benchmark-chart', label: 'Benchmark Chart', style: '跑分图表', bestFor: '性能、benchmark、实测对打', hitSignals: ['benchmark', '跑分', 'HLE', 'SWE-Bench'] },
  { family: 'quote-highlight', label: 'Quote Highlight', style: '大字金句', bestFor: '核心判断、压轴句', hitSignals: ['一句话', '核心结论', '引号'] },
  { family: 'glossary-term', label: 'Glossary Term', style: '术语解释卡', bestFor: '术语定义、名词解释', hitSignals: ['是什么', '定义', '可以理解成'] },
  { family: 'cta', label: 'CTA', style: '结束页', bestFor: '收尾提问、行动引导', hitSignals: ['最后一屏', '互动', '追更'] },
];

const ULTIMATE_SCENE_FAMILIES = new Set(ULTIMATE_TEMPLATE_CATALOG.map((item) => item.family));
const ULTIMATE_MIDDLE_SCENE_ROTATION = [
  'focus',
  'feature-rail',
  'architecture-map',
  'tag-matrix',
  'metrics',
  'timeline',
  'data-stream',
  'benchmark-chart',
  'memory-graph',
  'pipeline-flow',
  'glossary-term',
  'quote-highlight',
  'evidence-wall',
  'compare-board',
  'step-flow',
  'code',
  'terminal',
  'number-strip',
];

function safeString(value) { return libSafeString(value); }
function toNumber(value, fallback = 0) { return libToNumber(value, fallback); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function round(value) { return Math.round(Number(value) || 0); }
function average(values) { const safe = values.filter((value) => Number.isFinite(value)); if (safe.length === 0) { return 0; } return round(safe.reduce((sum, value) => sum + value, 0) / safe.length); }
function compactText(value, max = 180) { return libCompactText(value, max); }

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
    inputs: JSON.parse(JSON.stringify(definition.inputs || [])),
    outputs: JSON.parse(JSON.stringify(definition.outputs || [])),
    defaults: JSON.parse(JSON.stringify(definition.defaults || {})),
    constraints: JSON.parse(JSON.stringify(definition.constraints || [])),
    qualityRules: JSON.parse(JSON.stringify(definition.qualityRules || [])),
    uiHints: JSON.parse(JSON.stringify(definition.uiHints || [])),
    evalRules: JSON.parse(JSON.stringify(definition.evalRules || [])),
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

function uniqueBy(items, pickKey) {
  const seen = new Set();
  const output = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = safeString(pickKey(item));
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
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
      && !/^(?:20\d{2}[年./-]|\d+(?:\.\d+)?月\d+日|\d{1,2}[:：]\d{1,2})/.test(next)
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
    searchTools: ['duckduckgo-html'],
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
    const titleText = safeString(item?.title) || '';
    const titleMetrics = calculateTitleMetrics(titleText);

    return {
      ...item,
      platform: safeString(item?.platform) || (/问题|揭秘|反差/.test(angle) ? '抖音 / 视频号' : '抖音 / B站'),
      hookStrength: safeString(item?.hookStrength) || (titleMetrics.hookScore >= 85 ? '高' : titleMetrics.hookScore >= 70 ? '中' : '低'),
      suitableFor: safeString(item?.suitableFor) || (/问题/.test(angle) ? '问题开场' : /反差|揭秘/.test(angle) ? '首屏钩子' : '解释型开场'),
      hookScore: titleMetrics.hookScore,
      ctrPredict: titleMetrics.ctrPredict,
      first3Sec: titleMetrics.first3Sec,
      infoDensity: titleMetrics.infoDensity,
      noveltyScore: titleMetrics.noveltyScore,
      hookType: detectHookType(titleText),
    };
  });
  nextPayload.titles = titles;
  return nextPayload;
}

function calculateTitleMetrics(title) {
  const safe = safeString(title);
  if (!safe) {
    return { hookScore: 50, ctrPredict: 50, first3Sec: 50, infoDensity: 50, noveltyScore: 50 };
  }

  const length = safe.length;
  const hasNumber = /\d/.test(safe);
  const hasQuestion = /[？?]/.test(safe);
  const hasExclamation = /[!！]/.test(safe);
  const hasContrast = /不是|而是|从.*到|把.*变成|让|让.*变成|开始|终于|第一次|没告诉|秘密|背后|真正|其实/.test(safe);
  const hasIdentity = /程序员|产品经理|老板|大学生|普通人|打工|职场/.test(safe);
  const hasSpecificData = /\d+\.\d+%|\d+%|\d+个|\d+分钟|\d+秒|\d+天/.test(safe);
  const hasEmotion = /扎心|太卷|凭什么|看完我|没想到|惊讶|震惊|慌了|崩溃|哭了|笑死/.test(safe);
  const hasSuspense = /发生了|你没|不知道|三个秘密|第一件事|真正原因|原来/.test(safe);

  const first3Chars = safe.slice(0, 3);
  const first3Hook = /GPT|OpenAI|程序员|凭什么|别再|太|扎心|82/.test(first3Chars);

  let hookScore = 70;
  if (hasExclamation) hookScore += 5;
  if (hasContrast) hookScore += 10;
  if (hasSpecificData) hookScore += 8;
  if (hasEmotion) hookScore += 7;
  if (hasSuspense) hookScore += 8;
  if (hasQuestion) hookScore += 5;
  if (first3Hook) hookScore += 7;
  if (length > 30) hookScore -= 5;
  if (length < 10) hookScore -= 3;

  let ctrPredict = 65;
  if (hasNumber) ctrPredict += 8;
  if (hasSpecificData) ctrPredict += 10;
  if (hasContrast) ctrPredict += 8;
  if (hasIdentity) ctrPredict += 6;
  if (hasSuspense) ctrPredict += 7;
  if (hasEmotion) ctrPredict += 5;
  if (length > 35) ctrPredict -= 8;

  let first3Sec = 65;
  if (first3Hook) first3Sec += 15;
  if (hasQuestion) first3Sec += 10;
  if (hasExclamation) first3Sec += 8;
  if (/^[^a-zA-Z]+/.test(safe.slice(0, 2))) first3Sec += 5;

  let infoDensity = 60;
  if (hasSpecificData) infoDensity += 15;
  if (hasNumber) infoDensity += 8;
  if (hasIdentity) infoDensity += 5;
  if (length > 25 && !hasSpecificData) infoDensity -= 5;

  let noveltyScore = 55;
  if (hasContrast) noveltyScore += 15;
  if (hasSuspense) noveltyScore += 12;
  if (hasEmotion) noveltyScore += 10;
  if (hasSpecificData) noveltyScore += 8;
  if (/GPT-5|OpenAI|gpt5\.5/.test(safe)) noveltyScore += 5;

  return {
    hookScore: clamp(hookScore, 0, 100),
    ctrPredict: clamp(ctrPredict, 0, 100),
    first3Sec: clamp(first3Sec, 0, 100),
    infoDensity: clamp(infoDensity, 0, 100),
    noveltyScore: clamp(noveltyScore, 0, 100),
  };
}

function detectHookType(title) {
  const safe = safeString(title);
  if (!safe) return '解释型';

  if (/凭什么|为什么|到底|是不是|能不能|怎么/.test(safe)) return '疑问型';
  if (/不是|而是|从.*到|把.*变成|让.*变成|开始|终于|第一次/.test(safe)) return '反差型';
  if (/\d+[.%个分钟秒天]|82\.7%/.test(safe)) return '数字型';
  if (/发生了|你没|不知道|三个秘密|真正原因|原来/.test(safe)) return '悬念型';
  if (/扎心|太卷|看完我|没想到|慌了|崩溃|哭了|笑死/.test(safe)) return '情绪型';
  if (/程序员|产品经理|老板|大学生|必看|注意|人群/.test(safe)) return '身份型';

  return '解释型';
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

function normalizeKeywordList(items, max = 6) {
  return uniqueBy(
    (Array.isArray(items) ? items : [])
      .map((item) => safeString(item).toLowerCase())
      .filter(Boolean),
    (item) => item,
  ).slice(0, max);
}

function normalizeDataPointList(items, fallbackText = '', max = 4) {
  const explicit = uniqueBy(
    (Array.isArray(items) ? items : [])
      .map((item) => compactText(item, 42))
      .filter(Boolean),
    (item) => item,
  );
  if (explicit.length > 0) {
    return explicit.slice(0, max);
  }
  return extractDataPointsFromText(fallbackText).slice(0, max);
}

function buildStep3TitleKeywords(selectedTitleText) {
  const safeTitle = safeString(selectedTitleText);
  const baseKeywords = tokenizeKeywords(safeTitle);
  const fillerPatterns = [
    /这次真上强度了/,
    /值不值得重点盯/,
    /很多人只盯/,
    /很多人还把/,
    /如果只看/,
    /真正该先看的是/,
    /最该讲的不是热度/,
    /到底先看什么/,
  ];
  const prioritizedKeywords = [];
  const pushKeyword = (value) => {
    const normalized = safeString(value).toLowerCase();
    if (!normalized || prioritizedKeywords.includes(normalized)) {
      return;
    }
    prioritizedKeywords.push(normalized);
  };
  const modelMatch = safeTitle.match(/\b(?:gpt|claude|gemini|kimi|deepseek|qwen|llama)[- ]?[a-z0-9.]+\b/i);
  if (modelMatch?.[0]) {
    pushKeyword(modelMatch[0]);
  }
  const keywordPatterns = [
    [/发布|上线|更新|升级/i, '发布'],
    [/工作流|workflow/i, '工作流'],
    [/代码能力|编码|code/i, '代码能力'],
    [/agent|智能体/i, 'agent'],
    [/回答什么|问答|聊天/i, '问答'],
    [/干完|执行|交付结果|完成任务/i, '执行'],
    [/任务/i, '任务'],
    [/benchmark|评测|测试/i, 'benchmark'],
    [/api|工具调用|tool/i, 'api'],
    [/推理|reason/i, '推理'],
    [/多模态|语音|视觉|image|video/i, '多模态'],
    [/安全|safety/i, '安全'],
    [/价格|定价|token|成本/i, '定价'],
  ];
  for (const [pattern, label] of keywordPatterns) {
    if (pattern.test(safeTitle)) {
      pushKeyword(label);
    }
  }
  const clauseFragments = safeTitle
    .split(/[，,。！？；:：]/)
    .flatMap((item) => {
      const clause = safeString(item).toLowerCase();
      if (!clause) {
        return [];
      }
      if (fillerPatterns.some((pattern) => pattern.test(clause)) || clause.includes('…')) {
        return [];
      }
      const semanticMatches = keywordPatterns
        .filter(([pattern]) => pattern.test(clause))
        .map(([, label]) => label.toLowerCase());
      if (semanticMatches.length > 0) {
        return semanticMatches;
      }
      if (/^[\p{Script=Han}]+$/u.test(clause) && clause.length <= 6) {
        return [clause];
      }
      return [clause];
    });
  const filteredBaseKeywords = baseKeywords.filter((keyword) => {
    if (fillerPatterns.some((pattern) => pattern.test(keyword))) {
      return false;
    }
    if (/^[\p{Script=Han}]+$/u.test(keyword) && keyword.length > 8) {
      return false;
    }
    if (/^\d+(?:\.\d+)?[\p{Script=Han}]+$/u.test(keyword)) {
      return false;
    }
    return true;
  });

  return normalizeKeywordList([
    ...prioritizedKeywords,
    ...clauseFragments,
    ...filteredBaseKeywords,
  ], 10);
}

function getStep3TitleAlignment(selectedTitle, copy) {
  const selectedTitleText = safeString(selectedTitle?.title);
  const titleKeywords = buildStep3TitleKeywords(selectedTitleText);
  const rawCopyText = [
    safeString(copy?.hook),
    ...(Array.isArray(copy?.body) ? copy.body.map((item) => safeString(item?.text)) : []),
    safeString(copy?.cta),
  ].join(' ');
  const normalizedCopyText = rawCopyText.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const matchedKeywords = titleKeywords.filter((keyword) => {
    const normalizedKeyword = safeString(keyword).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    return normalizedKeyword && normalizedCopyText.includes(normalizedKeyword);
  });
  const missingKeywords = titleKeywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const score = titleKeywords.length > 0
    ? clamp(round((matchedKeywords.length / titleKeywords.length) * 100), 0, 100)
    : 72;

  return {
    selectedTitle: compactText(selectedTitleText || '当前主标题', 36),
    titleKeywords,
    matchedKeywords,
    missingKeywords,
    score,
  };
}

function buildStep3StorySpine(copy, analysis) {
  const body = Array.isArray(copy?.body) ? copy.body : [];
  const sceneIntents = uniqueBy(
    body.map((item) => safeString(item?.sceneIntent || item?.label)).filter(Boolean),
    (item) => item,
  ).slice(0, 6);
  const mainClaim = compactText(
    body[0]?.sceneIntent
    || analysis?.corePromise
    || analysis?.thesis
    || copy?.hook,
    60,
  );

  return {
    openingPromise: compactText(copy?.hook, 60),
    mainClaim,
    audience: compactText(analysis?.analysisBrief?.audienceFocus || analysis?.audience, 42),
    sceneIntents,
    closingMove: compactText(copy?.ctaMeta?.intent || copy?.cta, 40),
  };
}

function buildStep3Coverage(copy, input) {
  const body = Array.isArray(copy?.body) ? copy.body : [];
  const evidenceAnchors = uniqueBy(
    body
      .map((item) => safeString(item?.evidenceAnchor))
      .filter(Boolean),
    (item) => item,
  ).slice(0, 8);
  const briefPacing = safeString(copy?.brief?.pacing);
  const pacingMatch = briefPacing.match(/(\d+(?:\.\d+)?)\s*秒/);
  const requestedLength = safeString(input?.pipelineState?.copy?.requirements?.length);
  const requestedMatch = requestedLength.match(/(\d+(?:\.\d+)?)\s*秒/);
  const targetDurationSeconds = toNumber(input?.pipelineState?.currentStepSkill?.targetDurationSeconds, 0)
    || toNumber(pacingMatch?.[1], 0)
    || toNumber(requestedMatch?.[1], 0)
    || toNumber(copy?.readingTime, 0)
    || 0;
  const estimatedSceneCount = clamp(Math.round((targetDurationSeconds || 60) / 8), 3, 12);

  return {
    bodyBlockCount: body.length,
    evidenceAnchors,
    keywordCount: Array.isArray(copy?.keywords) ? copy.keywords.length : 0,
    matchedKeywordCount: Array.isArray(copy?.titleAlignment?.matchedKeywords)
      ? copy.titleAlignment.matchedKeywords.length
      : 0,
    targetDurationSeconds,
    estimatedSceneCount,
  };
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
  copy.body = (Array.isArray(copy.body) ? copy.body : []).map((item, index) => {
    const text = safeString(item?.text);
    return {
      ...item,
      id: safeString(item?.id) || `copy-${index + 1}`,
      label: safeString(item?.label) || `段落 ${index + 1}`,
      text,
      sceneIntent: compactText(item?.sceneIntent || item?.label || text, 36),
      evidenceAnchor: compactText(item?.evidenceAnchor || researchFacts[index]?.evidenceAnchor || researchFacts[index]?.sourceTitle || '', 42),
      transitionToNext: compactText(item?.transitionToNext, 34),
      keywords: normalizeKeywordList(
        Array.isArray(item?.keywords) ? item.keywords : tokenizeKeywords(`${item?.label || ''} ${text}`),
        6,
      ),
      dataPoints: normalizeDataPointList(item?.dataPoints, text, 4),
    };
  });
  copy.outline = (Array.isArray(copy.outline) ? copy.outline : []).map((item, index) => ({
    ...item,
    id: safeString(item?.id) || `copy-outline-${index + 1}`,
    label: safeString(item?.label) || `节拍 ${index + 1}`,
    beat: safeString(item?.beat),
    goal: safeString(item?.goal),
    evidenceAnchor: compactText(item?.evidenceAnchor || researchFacts[index]?.evidenceAnchor || '', 42),
    sceneIntent: compactText(item?.sceneIntent || item?.label || item?.goal || item?.beat, 36),
    transitionToNext: compactText(item?.transitionToNext, 34),
    mustInclude: normalizeDataPointList(item?.mustInclude, `${item?.goal || ''} ${item?.beat || ''}`, 3),
    keywords: normalizeKeywordList(
      Array.isArray(item?.keywords) ? item.keywords : tokenizeKeywords(`${item?.label || ''} ${item?.goal || ''} ${item?.beat || ''}`),
      5,
    ),
  }));
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
  copy.keywords = normalizeKeywordList([
    ...keywords,
    ...copy.body.flatMap((item) => Array.isArray(item?.keywords) ? item.keywords : []),
  ], 10);
  copy.titleAlignment = getStep3TitleAlignment(selectedTitle, copy);
  copy.storySpine = buildStep3StorySpine(copy, analysis);
  copy.coverage = buildStep3Coverage(copy, input);
  nextPayload.copy = copy;
  return nextPayload;
}

function createShotId(index, existingId) {
  return safeString(existingId) || `shot-${String(index + 1).padStart(2, '0')}`;
}

function hasStandaloneAsciiToken(text, token) {
  return new RegExp(`(?:^|[^a-z])${token}(?:[^a-z]|$)`, 'i').test(safeString(text).toLowerCase());
}

function countNumberSignals(text) {
  return (safeString(text).match(/\d+(?:\.\d+)?(?:%|x|倍|月|日|小时|分钟|年)?/g) || []).length;
}

function shouldUseSceneOverride(overrideText, fallbackText) {
  const override = safeString(overrideText);
  const fallback = safeString(fallbackText);

  if (!override) {
    return false;
  }

  if (/^(?:占位|镜头|场景)\s*\d+/i.test(override)) {
    return false;
  }

  if (/^(?:先抛问题|再去噪|然后展开关系|再补证据|最后总结|顺手提醒)：占位内容/i.test(override)) {
    return false;
  }

  if (fallback.length >= 24 && override.length <= Math.max(18, Math.floor(fallback.length * 0.45))) {
    return false;
  }

  return true;
}

function buildStep4TargetDurationSeconds(copy, input) {
  const explicitRenderDuration = toNumber(input?.pipelineState?.render?.estimatedDuration, 0);
  const readingTime = toNumber(copy?.readingTime, 0);
  return clamp(explicitRenderDuration || readingTime || 75, 45, 210);
}

function buildStep4SceneType(role, text) {
  const safeText = safeString(text);
  if (role === 'hook') return '开场';
  if (role === 'cta') return '结尾CTA';
  if (/对比|差异|vs|versus|before|after/i.test(safeText)) return '对比';
  if (/流程|步骤|工作流|pipeline|process|stage/i.test(safeText)) return '流程';
  if (/案例|场景|开发者|团队/.test(safeText)) return '案例';
  if (/官方|GitHub|docs|paper|证据|benchmark/i.test(safeText)) return '证据';
  return '信息传递';
}

function splitSceneBlock(block, sceneCharBudget = 48) {
  const clauses = splitNarrationClauses(block?.narration);
  const rawNarration = safeString(block?.narration);

  if (clauses.length <= 1 || rawNarration.length <= sceneCharBudget) {
    return [{
      ...block,
      narration: rawNarration,
      scriptSourceText: safeString(block?.scriptSourceText || rawNarration),
      scriptExcerpt: safeString(block?.scriptExcerpt || rawNarration),
      scriptSplitIndex: 0,
      scriptSplitCount: 1,
    }];
  }

  const output = [];
  let current = [];
  let currentLength = 0;

  for (const clause of clauses) {
    const nextLength = currentLength + clause.length;
    if (current.length > 0 && nextLength > sceneCharBudget) {
      output.push(current.join('，'));
      current = [clause];
      currentLength = clause.length;
      continue;
    }

    current.push(clause);
    currentLength = nextLength;
  }

  if (current.length > 0) {
    output.push(current.join('，'));
  }

  return output.map((text, index) => ({
    ...block,
    title: index === 0 ? block.title : `${block.title} · ${index + 1}`,
    narration: text,
    scriptSourceText: safeString(block?.scriptSourceText || rawNarration),
    scriptExcerpt: text,
    scriptSplitIndex: index,
    scriptSplitCount: output.length,
  }));
}

function buildShotStoryboardCue(segment, narration) {
  const cueParts = uniqueBy([
    safeString(segment?.sceneIntent),
    safeString(segment?.scriptBlockLabel),
    safeString(segment?.evidenceAnchor),
    compactText(splitNarrationClauses(narration)[0] || narration, 28),
    ...(Array.isArray(segment?.dataPoints) ? segment.dataPoints.slice(0, 2) : []).map((item) => compactText(item, 22)),
  ].filter(Boolean), (item) => item).slice(0, 3);
  return cueParts.join(' ｜ ');
}

function normalizeVisualHintToFamily(segment) {
  const hint = safeString(
    segment?.mechanismDepth?.visualHint
    || segment?.visualHint
    || segment?.visual?.hint,
  ).toLowerCase();

  if (!hint) {
    return '';
  }

  const aliases = {
    'flow-chart': 'pipeline-flow',
    flowchart: 'pipeline-flow',
    pipeline: 'pipeline-flow',
    'pipeline-flow': 'pipeline-flow',
    'step-flow': 'step-flow',
    steps: 'step-flow',
    'architecture-map': 'architecture-map',
    architecture: 'architecture-map',
    topology: 'architecture-map',
    'memory-graph': 'memory-graph',
    memory: 'memory-graph',
    graph: 'memory-graph',
    'benchmark-chart': 'benchmark-chart',
    benchmark: 'benchmark-chart',
    chart: 'benchmark-chart',
    metrics: 'metrics',
    metric: 'metrics',
    'data-stream': 'data-stream',
    stream: 'data-stream',
    terminal: 'terminal',
    code: 'code',
    timeline: 'timeline',
    compare: 'compare-board',
    'compare-board': 'compare-board',
  };

  return aliases[hint] || (ULTIMATE_SCENE_FAMILIES.has(hint) ? hint : '');
}

function resolveSceneFamilyConflicts(requestedFamily, segment, text) {
  const safeText = String(text || '').toLowerCase();
  const family = safeString(requestedFamily).toLowerCase();
  const hasCommandSignals = /(命令|终端|日志|运行|控制台|报错|输出)/.test(safeText)
    || ['shell', 'bash', 'terminal', 'cli', 'pnpm', 'npm', 'tsx', 'ffmpeg', 'render'].some((token) => hasStandaloneAsciiToken(safeText, token));
  const hasCodeSignals = /(配置|脚本|函数|接口|参数|字段|结构|schema|json|typescript|tsx|组件|源码)/.test(safeText)
    || ['api', 'json', 'code', 'schema', 'props'].some((token) => hasStandaloneAsciiToken(safeText, token));
  const hasTimelineSignals = /(发布时间|时间线|roadmap|里程碑|版本演进|发布|历史|阶段演进|先后)/.test(safeText)
    || /(年|月|日|q[1-4]|第[一二三四五六七八九十]阶段)/.test(safeText);
  const hasStepSignals = /(步骤|流程|工作流|依次|第一|第二|第三|先|再|最后|接着|然后)/.test(safeText);
  const hasArchitectureSignals = /(架构|系统|模块|分层|拓扑|工具链|编排|调度|router|orchestr|stack|agent|toolchain)/.test(safeText);
  const hasMemorySignals = /(memory|context|上下文|记忆|知识图谱|graph|embedding|召回|检索|知识库|关系网络)/.test(safeText);

  if (family === 'terminal' && hasCodeSignals && !hasCommandSignals) {
    return 'code';
  }
  if (family === 'code' && hasCommandSignals && !hasCodeSignals) {
    return 'terminal';
  }
  if (family === 'timeline' && hasStepSignals && !hasTimelineSignals) {
    return 'step-flow';
  }
  if (family === 'step-flow' && hasTimelineSignals && !hasStepSignals) {
    return 'timeline';
  }
  if (family === 'architecture-map' && hasMemorySignals && !hasArchitectureSignals) {
    return 'memory-graph';
  }
  if (family === 'memory-graph' && hasArchitectureSignals && !hasMemorySignals) {
    return 'architecture-map';
  }

  return family;
}

function mergeStep4Segments(segments, maxCount) {
  const output = [...segments];

  while (output.length > maxCount) {
    let mergeIndex = output.findIndex((item, index) => (
      index > 0
      && index < output.length - 2
      && item.role === 'body'
      && output[index + 1]?.role === 'body'
    ));
    if (mergeIndex === -1) {
      mergeIndex = Math.max(1, output.length - 3);
    }

    const current = output[mergeIndex];
    const next = output[mergeIndex + 1];
    output.splice(mergeIndex, 2, {
      ...current,
      title: compactText(`${current.title} / ${next.title}`, 24),
      narration: compactText(`${current.narration} ${next.narration}`, 220),
      type: buildStep4SceneType(current.role, `${current.narration} ${next.narration}`),
      role: 'body',
    });
  }

  return output;
}

function inferUltimateSceneFamily(segment, index, total) {
  const requestedFamily = safeString(segment?.family || segment?.sceneFamily).toLowerCase();
  if (ULTIMATE_SCENE_FAMILIES.has(requestedFamily)) {
    return requestedFamily;
  }
  if (index === 0) {
    return 'hero';
  }
  if (index === total - 1) {
    return 'cta';
  }

  const text = [
    safeString(segment?.title),
    safeString(segment?.narration),
    safeString(segment?.type),
    safeString(segment?.level),
    safeString(segment?.sceneIntent),
    safeString(segment?.evidenceAnchor),
    ...(Array.isArray(segment?.keywords) ? segment.keywords : []),
    ...(Array.isArray(segment?.dataPoints) ? segment.dataPoints : []),
  ].join(' ').toLowerCase();
  const visualHintFamily = normalizeVisualHintToFamily(segment);

  if (visualHintFamily) {
    return resolveSceneFamilyConflicts(visualHintFamily, segment, text);
  }

  if (/(命令|终端|日志|运行)/.test(text) || ['shell', 'bash', 'terminal', 'cli', 'render'].some((token) => hasStandaloneAsciiToken(text, token))) {
    return 'terminal';
  }
  if (/(实时|数据流|stream|feed|signal|monitor|qps|tps|throughput|tokens?\/s|吞吐)/.test(text)) {
    return 'data-stream';
  }
  if (/(benchmark|bench|跑分|基准|实测|hle|swe[- ]bench)/.test(text) && countNumberSignals(text) >= 2) {
    return 'benchmark-chart';
  }
  if ((/(发布时间|时间线|roadmap|里程碑|版本演进|发布|launch|release|history)/.test(text) || countNumberSignals(text) >= 2) && /(月|日|年|release|launch|roadmap|里程碑)/.test(text)) {
    return 'timeline';
  }
  if (Array.isArray(segment?.comparisons) && segment.comparisons.length > 0) {
    return 'compare-board';
  }
  if (/(对比|差异|vs|versus|before|after|battle)/.test(text)) {
    return 'compare-board';
  }
  if (/(很多人以为|很多人觉得|不是.*而是|认知反转|误解|偏见)/.test(text)) {
    return 'number-strip';
  }
  if (/(官方|来源|博客|release|benchmark|paper|docs|github|hugging\s*face|实测|证据)/.test(text)) {
    return 'evidence-wall';
  }
  if (/(配置|脚本|函数|接口|参数)/.test(text) || ['schema', 'json', 'api', 'code'].some((token) => hasStandaloneAsciiToken(text, token))) {
    return 'code';
  }
  if (/(架构|系统|模块|分层|拓扑|工具链|agent|router|memory|orchestr|stack|toolchain)/.test(text)) {
    return 'architecture-map';
  }
  if (/(memory|context|上下文|记忆|知识图谱|graph|embedding|召回|检索|知识库)/.test(text)) {
    return 'memory-graph';
  }
  if (/(管线|pipeline|\bflow\b|链路|dispatch|compile|render|\bprocess\b|\bstage\b)/.test(text)) {
    return 'pipeline-flow';
  }
  if (/(步骤|流程|工作流|依次|第一|第二|第三|先|再|最后)/.test(text)) {
    return 'step-flow';
  }
  if (/(是什么|什么意思|本质上|指的是|可以理解成|术语|定义)/.test(text) && safeString(segment?.title).length <= 20) {
    return 'glossary-term';
  }
  if (/(场景|开发者|团队|问题|痛点|案例|角色)/.test(text)) {
    return 'feature-rail';
  }
  if (countNumberSignals(text) >= 2) {
    return 'metrics';
  }
  if ((Array.isArray(segment?.keywords) ? segment.keywords.length : 0) + (Array.isArray(segment?.dataPoints) ? segment.dataPoints.length : 0) >= 5) {
    return 'tag-matrix';
  }
  if (/[“”"']|一句话|关键判断|核心结论|真正该讲的是|最狠的一句/.test(text)) {
    return 'quote-highlight';
  }
  if (safeString(segment?.visual?.focus || segment?.visualFocusZh).length > 0 && safeString(segment?.visual?.focus || segment?.visualFocusZh).length <= 24) {
    return 'focus';
  }

  return resolveSceneFamilyConflicts(
    ULTIMATE_MIDDLE_SCENE_ROTATION[(index - 1) % ULTIMATE_MIDDLE_SCENE_ROTATION.length],
    segment,
    text,
  );
}

function buildStep4TemplateCandidates(primaryFamily, index) {
  const rotationOffset = ((index - 1) % ULTIMATE_MIDDLE_SCENE_ROTATION.length + ULTIMATE_MIDDLE_SCENE_ROTATION.length) % ULTIMATE_MIDDLE_SCENE_ROTATION.length;
  const rotated = [
    ...ULTIMATE_MIDDLE_SCENE_ROTATION.slice(rotationOffset),
    ...ULTIMATE_MIDDLE_SCENE_ROTATION.slice(0, rotationOffset),
  ];
  return uniqueBy(
    [
      primaryFamily,
      ...rotated,
    ].filter((family) => ULTIMATE_SCENE_FAMILIES.has(family)),
    (family) => family,
  ).slice(0, 6);
}

function getSceneFocusForFamily(family) {
  return {
    hero: '主标题 + 单一核心对象',
    'feature-rail': '2x2 模块卡 + 中心判断',
    focus: '单概念聚焦 + 明确术语',
    'step-flow': '流程节点 + 阅读路径',
    timeline: '时间节点 + 事件推进',
    'compare-board': '左右对照信息层',
    'number-strip': '反转观点 + 条带重点',
    terminal: '终端窗口 + 日志高亮',
    'evidence-wall': '来源卡片 + 证据芯片',
    'tag-matrix': '主模块标题 + 次级标签带',
    code: '英文 JSON 结构 + 关键字段高亮',
    'architecture-map': '中心节点 + 周边模块连接',
    metrics: '大数字 + 指标条',
    'data-stream': '实时指标 + 流动信号',
    'memory-graph': '关系节点 + 连线',
    'pipeline-flow': '阶段箭头 + 数据流',
    'benchmark-chart': '图表对打 + 数值标签',
    'quote-highlight': '一句话结论 + 大字压轴',
    'glossary-term': '术语卡 + 白话解释',
    cta: '收尾提问 + 互动引导',
  }[family] || '主体清晰 + 信息层次明确';
}

function buildStep4ScenePlanMetadata(shots, input) {
  const familiesUsed = uniqueBy(
    shots
      .map((shot) => safeString(shot?.sceneFamily || shot?.family))
      .filter(Boolean),
    (family) => family,
  );

  return {
    system: 'ultimate-20-template',
    visualSystem: 'ultimate-1080p',
    renderWidth: 1920,
    renderHeight: 1080,
    sceneCount: shots.length,
    familiesUsed,
    title: compactText(getSelectedTitle(input, null)?.title || input?.pipelineState?.inputTitleKeywords || '当前主题', 42),
  };
}

function pickShotAccent(family) {
  return {
    hero: 'lime',
    'benchmark-chart': 'orange',
    terminal: 'cyan',
    code: 'cyan',
    timeline: 'orange',
    'step-flow': 'cyan',
    'architecture-map': 'purple',
    'memory-graph': 'purple',
    'compare-board': 'orange',
    metrics: 'cyan',
    'data-stream': 'cyan',
    'quote-highlight': 'orange',
    'number-strip': 'orange',
  }[family] || 'cyan';
}

function inferRevealDirection(family, sceneIntent, storyboardCueZh, level) {
  const text = `${safeString(sceneIntent)} ${safeString(storyboardCueZh)}`.toLowerCase();

  if (/开场|首屏|第一秒|建立/.test(text) || /hook/i.test(safeString(level))) {
    return 'center';
  }
  if (/揭示|曝光|下拉|倾泻|发布|时间线/.test(text) || family === 'timeline') {
    return 'down';
  }
  if (/收尾|总结|回收|结论|cta|互动/.test(text) || family === 'cta') {
    return 'right';
  }
  if (/对比|压缩|碰撞|对峙/.test(text) || family === 'compare-board') {
    return 'up';
  }

  return 'left';
}

function buildShotDirectorContract(family, index, total, level, type, sceneIntent, storyboardCueZh, scriptBlockLabel, dataPoints) {
  const numericFields = (Array.isArray(dataPoints) ? dataPoints : [])
    .map((item) => {
      const match = String(item || '').match(/[-+]?\d+(?:\.\d+)?/);
      return match ? {field: 'dataPoint', value: Number(match[0]), label: item} : null;
    })
    .filter(Boolean);
  const grammar = resolveFamilyShotContract(family, {
    shotIndex: index,
    totalShots: total,
    numericFields,
  });
  const rhythm = getRhythmContract(family);
  const cameraMotion = CAMERA_INTENT_TO_MOTION[grammar.cameraIntent]
    || getPreferredCameraMotion(family)
    || getCameraMotion(family);

  return {
    archetype: grammar.archetype,
    cameraIntent: grammar.cameraIntent,
    cameraMotion,
    dataEvent: grammar.dataEvent,
    enterFrames: grammar.enterFrames,
    emphasisFrames: grammar.emphasisFrames,
    staggerGap: Math.max(grammar.staggerGap || 0, rhythm?.staggerGap || 0),
    revealDirection: inferRevealDirection(family, sceneIntent, storyboardCueZh, level),
    memoryObject: grammar.memoryObject,
    directorNote: grammar.directorNote,
    scriptBlockLabel: safeString(scriptBlockLabel || ''),
    type: safeString(type || ''),
  };
}

function buildShotItemsForFamily(family, segment, narration, keywords, dataPoints) {
  const dp = Array.isArray(dataPoints) ? dataPoints.filter(Boolean) : [];
  const kw = Array.isArray(keywords) ? keywords.filter(Boolean) : [];

  if (family === 'timeline') {
    return uniqueBy([...dp, ...kw], (item) => item).slice(0, 4).map((item, index) => ({
      label: /(\d{4}|\d+月|\d+日|q[1-4])/i.test(item) ? item : `阶段 ${index + 1}`,
      detail: item,
      accent: 'orange',
    }));
  }

  if (family === 'step-flow' || family === 'pipeline-flow') {
    return splitNarrationClauses(narration).slice(0, 4).map((item, index) => ({
      label: kw[index] || `步骤 ${index + 1}`,
      detail: item,
      accent: 'cyan',
    }));
  }

  if (family === 'architecture-map' || family === 'memory-graph') {
    return uniqueBy([...kw, ...dp], (item) => item).slice(0, 5).map((item, index) => ({
      label: item,
      detail: family === 'memory-graph' ? `关系节点 ${index + 1}` : `系统模块 ${index + 1}`,
      accent: 'purple',
    }));
  }

  if (family === 'feature-rail') {
    return uniqueBy([...kw, ...dp], (item) => item).slice(0, 4).map((item) => ({
      label: item,
      detail: compactText(narration, 40),
      accent: 'cyan',
    }));
  }

  if (family === 'terminal') {
    return splitNarrationClauses(narration).slice(0, 3).map((item, index) => ({
      label: index === 0 ? '$ command' : `log ${index}`,
      detail: item,
      accent: 'cyan',
    }));
  }

  return [];
}

function buildShotFeaturesForFamily(family, segment, narration, keywords, dataPoints) {
  if (family !== 'feature-rail') {
    return [];
  }

  return uniqueBy([...(Array.isArray(keywords) ? keywords : []), ...(Array.isArray(dataPoints) ? dataPoints : [])], (item) => item)
    .slice(0, 4)
    .map((item) => ({
      icon: '',
      title: item,
      desc: compactText(narration, 42),
    }));
}

function buildShotVisualProps(family, segment, narration, sceneIntent, storyboardCueZh, scriptBlockLabel, dataPoints, keywords) {
  const props = {
    sceneIntent,
    storyboardCueZh,
    scriptBlockLabel,
    type: safeString(segment?.type),
  };

  if (family === 'terminal') {
    return {
      ...props,
      windowTitle: safeString(segment?.title || 'terminal'),
      command: compactText(splitNarrationClauses(narration)[0] || narration, 72),
      outputs: splitNarrationClauses(narration).slice(1, 4),
      note: safeString(segment?.evidenceAnchor || sceneIntent),
    };
  }

  if (family === 'code') {
    return {
      ...props,
      filename: 'workflow.ts',
      lines: splitNarrationClauses(narration).slice(0, 5),
    };
  }

  if (family === 'architecture-map') {
    return {
      ...props,
      centerTitle: safeString(segment?.title || scriptBlockLabel),
      centerDetail: compactText(sceneIntent || narration, 80),
      layout: 'radial',
    };
  }

  if (family === 'memory-graph') {
    return {
      ...props,
      centerTitle: safeString(segment?.title || scriptBlockLabel),
      centerDetail: compactText(sceneIntent || narration, 80),
      layout: 'stack',
    };
  }

  if (family === 'timeline') {
    return {
      ...props,
      heading: safeString(segment?.title || scriptBlockLabel),
    };
  }

  if (family === 'hero') {
    return {
      ...props,
      visualStyle: 'morfeo',
      highlightedWord: (Array.isArray(keywords) ? keywords[0] : '') || '',
      lines: splitNarrationClauses(narration).slice(0, 3),
      tag: safeString(segment?.evidenceAnchor || ''),
    };
  }

  if (family === 'benchmark-chart') {
    return {
      ...props,
      primaryLabel: '当前方案',
      secondaryLabel: '旧方案',
    };
  }

  if (family === 'data-stream' || family === 'pipeline-flow') {
    return {
      ...props,
      summary: compactText(sceneIntent || narration, 64),
    };
  }

  return props;
}

function diversifySceneFamilies(shots) {
  const output = [];

  for (const shot of Array.isArray(shots) ? shots : []) {
    const prev = output[output.length - 1];
    const prev2 = output[output.length - 2];
    let family = safeString(shot?.sceneFamily || shot?.family);
    const templateCandidates = Array.isArray(shot?.templateCandidates) ? shot.templateCandidates : [];

    if (prev && prev2 && family && family === prev.sceneFamily && family === prev2.sceneFamily) {
      const replacement = templateCandidates.find((candidate) => (
        candidate
        && candidate !== family
        && candidate !== prev.sceneFamily
        && candidate !== prev2.sceneFamily
      ));
      if (replacement) {
        family = replacement;
      }
    }

    if (family === 'architecture-map' && prev?.sceneFamily === 'memory-graph') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'memory-graph') || family;
    }
    if (family === 'memory-graph' && prev?.sceneFamily === 'architecture-map') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'architecture-map') || family;
    }
    if (family === 'timeline' && prev?.sceneFamily === 'step-flow') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'step-flow') || family;
    }
    if (family === 'step-flow' && prev?.sceneFamily === 'timeline') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'timeline') || family;
    }
    if (family === 'terminal' && prev?.sceneFamily === 'code') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'code') || family;
    }
    if (family === 'code' && prev?.sceneFamily === 'terminal') {
      family = templateCandidates.find((candidate) => candidate && candidate !== 'terminal') || family;
    }

    output.push({
      ...shot,
      family,
      sceneFamily: family,
      templateCandidates: uniqueBy([family, ...templateCandidates], (item) => item).slice(0, 6),
    });
  }

  return output;
}

function buildStep4Slots(payload, input) {
  const payloadShots = Array.isArray(payload?.shots) ? payload.shots : (Array.isArray(payload) ? payload : []);
  const copy = input?.pipelineState?.copy || {};
  const analysis = input?.pipelineState?.selectedAnalysis || input?.pipelineState?.analysis || {};
  const title = getSelectedTitle(input, payload);
  const body = Array.isArray(copy?.body) ? copy.body : [];
  const facts = Array.isArray(analysis?.researchFacts) ? analysis.researchFacts : [];
  const process = Array.isArray(analysis?.process) ? analysis.process : [];
  const layers = Array.isArray(analysis?.layers) ? analysis.layers : [];
  const targetDurationSeconds = buildStep4TargetDurationSeconds(copy, input);
  const targetSceneCount = clamp(Math.round(targetDurationSeconds / 8), 6, 12);
  const topicTitle = compactText(title?.title || input?.pipelineState?.inputTitleKeywords || '当前主题', 24);

  let baseSegments = [];

  if (!safeString(copy?.hook) && body.length === 0 && !safeString(copy?.cta) && payloadShots.length > 0) {
    baseSegments = payloadShots.map((shot, index) => ({
      role: index === 0 ? 'hook' : index === payloadShots.length - 1 ? 'cta' : 'body',
      level: index === 0 ? '开场 Hook' : index === payloadShots.length - 1 ? '收尾互动' : `中段场景 ${index}`,
      type: buildStep4SceneType(index === 0 ? 'hook' : index === payloadShots.length - 1 ? 'cta' : 'body', shot?.narration || shot?.title),
      title: safeString(shot?.title) || `场景 ${index + 1}`,
      narration: safeString(shot?.narration) || safeString(shot?.title),
      family: safeString(shot?.family || shot?.sceneFamily),
      templateCandidates: Array.isArray(shot?.templateCandidates) ? shot.templateCandidates : [],
      dataPoints: Array.isArray(shot?.dataPoints) ? shot.dataPoints : [],
      comparisons: Array.isArray(shot?.comparisons) ? shot.comparisons : [],
      keywords: Array.isArray(shot?.keywords) ? shot.keywords : [],
      visual: shot?.visual,
      sourceShot: shot,
    }));
  } else {
    const sourceBlocks = [
      {
        role: 'hook',
        level: '开场 Hook',
        type: '开场',
        scriptRole: 'hook',
        scriptBlockId: 'hook',
        scriptBlockLabel: 'Hook',
        title: shouldUseSceneOverride(payloadShots[0]?.title, copy?.hookMeta?.title)
          ? payloadShots[0]?.title
          : (copy?.hookMeta?.title || '开场钩子'),
        narration: shouldUseSceneOverride(payloadShots[0]?.narration, copy?.hook)
          ? payloadShots[0]?.narration
          : (copy?.hook || '先抛出一个足够抓人的判断。'),
        scriptSourceText: safeString(copy?.hook),
        scriptExcerpt: safeString(copy?.hook),
        sceneIntent: '开场钩子',
        evidenceAnchor: safeString(copy?.hookMeta?.title || title?.evidenceAnchor || title?.title),
      },
      ...body
        .map((item, index) => ({
          role: 'body',
          level: `中段场景 ${index + 1}`,
          type: buildStep4SceneType('body', `${item?.sceneIntent || ''} ${item?.label || ''} ${item?.text || ''}`),
          scriptRole: 'body',
          scriptBlockId: safeString(item?.id || `copy-body-${index + 1}`),
          scriptBlockLabel: safeString(item?.label || item?.sceneIntent || `正文块 ${index + 1}`),
          title: shouldUseSceneOverride(payloadShots[index + 1]?.title, item?.label)
            ? payloadShots[index + 1]?.title
            : (item?.sceneIntent || item?.label || `核心信息 ${index + 1}`),
          narration: shouldUseSceneOverride(payloadShots[index + 1]?.narration, item?.text)
            ? payloadShots[index + 1]?.narration
            : (item?.text || ''),
          scriptSourceText: safeString(item?.text),
          scriptExcerpt: safeString(item?.text),
          evidenceAnchor: safeString(item?.evidenceAnchor),
          sceneIntent: safeString(item?.sceneIntent),
          transitionToNext: safeString(item?.transitionToNext),
          dataPoints: Array.isArray(item?.dataPoints) ? item.dataPoints : [],
          keywords: Array.isArray(item?.keywords) ? item.keywords : [],
          mechanismDepth: item?.mechanismDepth || null,
        }))
        .filter((item) => safeString(item.narration)),
      {
        role: 'cta',
        level: '收尾互动',
        type: '结尾CTA',
        scriptRole: 'cta',
        scriptBlockId: 'cta',
        scriptBlockLabel: 'CTA',
        title: shouldUseSceneOverride(payloadShots[payloadShots.length - 1]?.title, copy?.ctaMeta?.intent)
          ? payloadShots[payloadShots.length - 1]?.title
          : '收尾互动',
        narration: shouldUseSceneOverride(payloadShots[payloadShots.length - 1]?.narration, copy?.cta)
          ? payloadShots[payloadShots.length - 1]?.narration
          : (copy?.cta || '最后收口并推动互动。'),
        scriptSourceText: safeString(copy?.cta),
        scriptExcerpt: safeString(copy?.cta),
        sceneIntent: '收尾互动',
        evidenceAnchor: safeString(copy?.ctaMeta?.intent || title?.title),
      },
    ].filter((item) => safeString(item?.narration));

    baseSegments = sourceBlocks.flatMap((block) => splitSceneBlock(block, block.role === 'body' ? 46 : 40));

    const existingTexts = new Set(baseSegments.map((item) => safeString(item.narration)));
    const supplements = [
      ...facts.map((item, index) => ({
        role: 'body',
        level: `证据补充 ${index + 1}`,
        type: '证据',
        scriptRole: 'supporting-fact',
        scriptBlockId: `fact-${index + 1}`,
        scriptBlockLabel: compactText(item?.label || `证据 ${index + 1}`, 24),
        title: compactText(item?.evidenceAnchor || item?.sourceTitle || `证据 ${index + 1}`, 24),
        narration: item?.fact,
        scriptSourceText: safeString(item?.fact),
        scriptExcerpt: safeString(item?.fact),
        evidenceAnchor: safeString(item?.evidenceAnchor || item?.sourceTitle),
        sceneIntent: '证据补充',
      })),
      ...process.map((item, index) => ({
        role: 'body',
        level: `流程补充 ${index + 1}`,
        type: '流程',
        scriptRole: 'supporting-process',
        scriptBlockId: `process-${index + 1}`,
        scriptBlockLabel: compactText(item?.label || `步骤 ${index + 1}`, 24),
        title: compactText(item?.label || `步骤 ${index + 1}`, 24),
        narration: item?.detail,
        scriptSourceText: safeString(item?.detail),
        scriptExcerpt: safeString(item?.detail),
        evidenceAnchor: safeString(item?.label),
        sceneIntent: '流程补充',
      })),
      ...layers.map((item, index) => ({
        role: 'body',
        level: `判断层 ${index + 1}`,
        type: '信息传递',
        scriptRole: 'supporting-layer',
        scriptBlockId: `layer-${index + 1}`,
        scriptBlockLabel: compactText(item?.label || `角度 ${index + 1}`, 24),
        title: compactText(item?.label || `角度 ${index + 1}`, 24),
        narration: item?.insight,
        scriptSourceText: safeString(item?.insight),
        scriptExcerpt: safeString(item?.insight),
        evidenceAnchor: safeString(item?.evidence),
        sceneIntent: '判断补充',
      })),
    ].filter((item) => safeString(item?.narration) && !existingTexts.has(safeString(item.narration)));

    const fallbackSupplements = [
      safeString(analysis?.corePromise),
      safeString(analysis?.thesis),
      ...(Array.isArray(copy?.keywords) ? copy.keywords : []).map((item) => `关键词：${item}`),
    ]
      .filter((item) => item && !existingTexts.has(item))
      .map((item, index) => ({
        role: 'body',
        level: `补充场景 ${index + 1}`,
        type: '信息传递',
        title: compactText(item, 24),
        narration: item,
      }));

    if (baseSegments.length < targetSceneCount) {
      const ctaBlock = baseSegments.pop();
      baseSegments.push(...supplements.slice(0, targetSceneCount - baseSegments.length));
      if (baseSegments.length < targetSceneCount) {
        baseSegments.push(...fallbackSupplements.slice(0, targetSceneCount - baseSegments.length));
      }
      if (ctaBlock) {
        baseSegments.push(ctaBlock);
      }
    }
  }

  const normalizedSegments = mergeStep4Segments(baseSegments, targetSceneCount);
  const total = normalizedSegments.length;

  return normalizedSegments.map((segment, index) => {
    const source = segment.sourceShot || payloadShots[index] || {};
    const family = inferUltimateSceneFamily({
      ...segment,
      ...source,
      family: safeString(source?.family || segment?.family || source?.sceneFamily || segment?.sceneFamily),
      sceneFamily: safeString(source?.sceneFamily || segment?.sceneFamily || source?.family || segment?.family),
    }, index, total);
    const templateCandidates = Array.isArray(source?.templateCandidates) && source.templateCandidates.length > 0
      ? uniqueBy(source.templateCandidates.filter((item) => ULTIMATE_SCENE_FAMILIES.has(item)), (item) => item).slice(0, 6)
      : buildStep4TemplateCandidates(family, index);
    const narration = compactText(source?.narration || segment.narration, 220);
    const sceneType = safeString(source?.type || segment.type || buildStep4SceneType(segment.role, narration));
    const level = index === 0
      ? '开场 Hook'
      : index === total - 1
        ? '收尾互动'
        : safeString(source?.level || segment.level || `中段场景 ${index}`);
    const dataPoints = Array.isArray(source?.dataPoints) && source.dataPoints.length > 0
      ? source.dataPoints
      : normalizeDataPointList(source?.mustInclude, `${source?.sceneIntent || ''} ${narration}`, 4);
    const keywords = Array.isArray(source?.keywords) && source.keywords.length > 0
      ? source.keywords
      : normalizeKeywordList(tokenizeKeywords(`${source?.sceneIntent || ''} ${segment.title} ${narration}`), 6);
    const focus = safeString(source?.visual?.focus || segment?.visual?.focus) || getSceneFocusForFamily(family);
    const comparisons = Array.isArray(source?.comparisons) && source.comparisons.length > 0
      ? source.comparisons
      : sceneType === '对比'
        ? [{left: '旧方案', right: '当前方案'}]
        : [];
    const scriptSourceText = safeString(source?.scriptSourceText || segment?.scriptSourceText || narration);
    const scriptExcerpt = compactText(safeString(source?.scriptExcerpt || segment?.scriptExcerpt || narration), 92);
    const scriptBlockLabel = safeString(source?.scriptBlockLabel || segment?.scriptBlockLabel || source?.title || segment?.title || level);
    const sceneIntent = safeString(source?.sceneIntent || segment?.sceneIntent || scriptBlockLabel);
    const evidenceAnchor = safeString(source?.evidenceAnchor || segment?.evidenceAnchor);
    const storyboardCueZh = safeString(source?.storyboardCueZh || segment?.storyboardCueZh)
      || buildShotStoryboardCue({
        ...segment,
        ...source,
        sceneIntent,
        scriptBlockLabel,
        evidenceAnchor,
        dataPoints,
      }, scriptExcerpt);
    const items = Array.isArray(source?.items) && source.items.length > 0
      ? source.items
      : buildShotItemsForFamily(family, segment, narration, keywords, dataPoints);
    const features = Array.isArray(source?.features) && source.features.length > 0
      ? source.features
      : buildShotFeaturesForFamily(family, segment, narration, keywords, dataPoints);
    const visualProps = buildShotVisualProps(
      family,
      {...segment, ...source},
      narration,
      sceneIntent,
      storyboardCueZh,
      scriptBlockLabel,
      dataPoints,
      keywords,
    );
    const director = buildShotDirectorContract(
      family,
      index,
      total,
      level,
      sceneType,
      sceneIntent,
      storyboardCueZh,
      scriptBlockLabel,
      dataPoints,
    );

    return {
      ...source,
      id: createShotId(index, source.id),
      level,
      type: sceneType,
      title: compactText(source?.title || segment.title || level, 24),
      narration,
      durationSeconds: clamp(toNumber(source?.durationSeconds || Math.max(4, Math.ceil(narration.length / 18)), 6), 3, 15),
      family,
      sceneFamily: family,
      templateCandidates,
      visual: {
        ...(source?.visual && typeof source.visual === 'object' ? source.visual : {}),
        description: safeString(source?.visual?.description)
          || `16:9 横版场景，围绕口播重点「${compactText(scriptExcerpt, 30)}」用 ${family} 模板呈现 ${compactText(sceneIntent || narration, 48)}`,
        focus,
        props: {
          ...visualProps,
          accent: pickShotAccent(family),
          revealDirection: director.revealDirection,
        },
      },
      director,
      items,
      features,
      dataPoints,
      comparisons,
      keywords,
      sceneIntent,
      evidenceAnchor,
      scriptRole: safeString(source?.scriptRole || segment?.scriptRole || segment?.role),
      scriptBlockId: safeString(source?.scriptBlockId || segment?.scriptBlockId || source?.id),
      scriptBlockLabel,
      scriptSourceText,
      scriptExcerpt,
      scriptSplitIndex: Number.isFinite(Number(source?.scriptSplitIndex ?? segment?.scriptSplitIndex))
        ? Number(source?.scriptSplitIndex ?? segment?.scriptSplitIndex)
        : 0,
      scriptSplitCount: Number.isFinite(Number(source?.scriptSplitCount ?? segment?.scriptSplitCount))
        ? Number(source?.scriptSplitCount ?? segment?.scriptSplitCount)
        : 1,
      mechanismDepth: source?.mechanismDepth || segment?.mechanismDepth || null,
      storyboardCueZh,
    };
  });
}

function normalizeStep4Payload(payload, input) {
  const shots = diversifySceneFamilies(buildStep4Slots(payload, input));
  return {
    shots,
    scenePlan: buildStep4ScenePlanMetadata(shots, input),
    templateCatalog: clone(ULTIMATE_TEMPLATE_CATALOG),
    visualSystem: 'ultimate-1080p',
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

function normalizeUltimateCanvasText(text) {
  return safeString(text)
    .replace(/9:16\s*竖屏画面/gi, '16:9 横版画面')
    .replace(/9:16\s*竖屏视觉/gi, '16:9 横版视觉')
    .replace(/9:16\s*竖屏/gi, '16:9 横版')
    .replace(/竖屏主画面/g, '横版主画面')
    .replace(/竖屏视觉/g, '横版视觉')
    .replace(/镜头/g, '场景');
}

function ensureUltimateCanvasPrompt(text) {
  const normalized = normalizeUltimateCanvasText(text);
  if (!normalized) {
    return '';
  }
  if (/16:9/i.test(normalized) && /1920x1080/i.test(normalized)) {
    return normalized;
  }
  if (/16:9/i.test(normalized)) {
    return `1920x1080，${normalized}`;
  }
  return `16:9 横版，1920x1080，${normalized}`;
}

function buildStep5DisplayFields(shot, current) {
  const shotTitle = compactText(
    safeString(current?.shotTitle || shot?.title || shot?.level || shot?.id || '场景'),
    24,
  );
  const visual = current?.visual && typeof current.visual === 'object'
    ? current.visual
    : (shot?.visual && typeof shot.visual === 'object' ? shot.visual : {});
  const family = safeString(current?.sceneFamily || current?.family || shot?.sceneFamily || shot?.family)
    || inferUltimateSceneFamily(shot, 0, 1);
  const focus = safeString(current?.visualFocusZh || current?.visualFocus || visual.focus || shot?.visual?.focus)
    || getSceneFocusForFamily(family)
    || (shot?.type === '对比' ? '左右信息对照 + 核心判断' : '主体清晰 + 信息层次明确');
  const scriptSourceText = safeString(current?.scriptSourceText || shot?.scriptSourceText || shot?.narration);
  const scriptExcerpt = compactText(
    safeString(current?.scriptExcerpt || shot?.scriptExcerpt || shot?.narration || shotTitle),
    52,
  );
  const scriptAnchor = compactText(splitNarrationClauses(scriptExcerpt)[0] || scriptExcerpt, 30);
  const sceneIntent = safeString(current?.sceneIntent || shot?.sceneIntent || shot?.title);
  const storyboardCueZh = safeString(current?.storyboardCueZh || shot?.storyboardCueZh)
    || buildShotStoryboardCue({
      sceneIntent,
      scriptBlockLabel: current?.scriptBlockLabel || shot?.scriptBlockLabel,
      evidenceAnchor: current?.evidenceAnchor || shot?.evidenceAnchor,
      dataPoints: current?.dataPoints || shot?.dataPoints,
    }, scriptExcerpt);
  const description = normalizeUltimateCanvasText(safeString(current?.visualSummaryZh || current?.promptZh || visual.description || shot?.visual?.description))
    || `围绕口播原句“${scriptAnchor}”在 16:9 横版画面里呈现 ${compactText(sceneIntent || shot?.narration || '当前内容重点', 34)}`;
  const dataHighlightsZh = normalizePromptDataHighlightsZh(current?.dataPoints || shot?.dataPoints, shot);
  const comparisonSummaryZh = safeString(current?.comparisonSummaryZh)
    || summarizePromptComparisonsZh(current?.comparisons || shot?.comparisons, shot);
  const promptZh = ensureUltimateCanvasPrompt(safeString(current?.promptZh))
    || `16:9 横版画面，1920x1080，采用 ${family} 模板风格，必须服务口播原句“${scriptAnchor}”，${description}，重点突出 ${focus}，画面元素围绕 ${storyboardCueZh || sceneIntent}，保留标题留白，保证主体和信息一眼能看懂。`;
  const negativePromptZh = safeString(current?.negativePromptZh)
    || [
      '避免主体模糊',
      '避免画面元素堆叠',
      '避免文字不可读',
      '避免竖屏构图',
      shot?.type === '对比' ? '避免左右信息失衡' : '避免焦点分散',
    ].join('、');
  const visualSummaryZh = normalizeUltimateCanvasText(safeString(current?.visualSummaryZh))
    || [
      `这一屏围绕口播原句“${scriptAnchor}”展开`,
      description,
      storyboardCueZh ? `分镜抓手：${storyboardCueZh}` : '',
      focus ? `画面重点是 ${focus}` : '',
      comparisonSummaryZh,
    ].filter(Boolean).join('，');

  return {
    shotTitle,
    promptZh,
    visualSummaryZh,
    visualFocusZh: focus,
    negativePromptZh,
    dataHighlightsZh,
    comparisonSummaryZh,
    text: safeString(current?.text || shot?.narration),
    sceneIntent,
    evidenceAnchor: safeString(current?.evidenceAnchor || shot?.evidenceAnchor),
    storyboardCueZh,
    scriptSourceText,
    scriptExcerpt,
    scriptBlockLabel: safeString(current?.scriptBlockLabel || shot?.scriptBlockLabel),
  };
}

function normalizeStep5Payload(payload, input) {
  const nextPayload = clone(payload || {});
  const prompts = nextPayload.prompts && typeof nextPayload.prompts === 'object'
    ? nextPayload.prompts
    : {};
  const byShotId = prompts.byShotId && typeof prompts.byShotId === 'object' ? prompts.byShotId : {};
  const shots = Array.isArray(nextPayload.shots)
    ? nextPayload.shots
    : (Array.isArray(input?.shotsState) && input.shotsState.length > 0 ? input.shotsState : buildStep4Slots({shots: input?.shotsState}, input));

  prompts.byShotId = shots.reduce((acc, shot) => {
    const current = byShotId[shot.id] && typeof byShotId[shot.id] === 'object'
      ? byShotId[shot.id]
      : {};
    const family = safeString(current?.sceneFamily || current?.family || shot?.sceneFamily || shot?.family)
      || inferUltimateSceneFamily(shot, 0, 1);
    const templateCandidates = Array.isArray(current?.templateCandidates) && current.templateCandidates.length > 0
      ? uniqueBy(current.templateCandidates.filter((item) => ULTIMATE_SCENE_FAMILIES.has(item)), (item) => item).slice(0, 6)
      : Array.isArray(shot?.templateCandidates) && shot.templateCandidates.length > 0
        ? uniqueBy(shot.templateCandidates.filter((item) => ULTIMATE_SCENE_FAMILIES.has(item)), (item) => item).slice(0, 6)
        : buildStep4TemplateCandidates(family, 1);
    const display = buildStep5DisplayFields(shot, current);
    const promptText = ensureUltimateCanvasPrompt(safeString(current.imagePrompt || current.prompt))
      || `16:9 横版，1920x1080，storyboard frame for spoken line "${compactText(display.scriptExcerpt || shot.narration, 42)}"，scene intent: ${compactText(display.sceneIntent || shot.title, 32)}，visual cue: ${compactText(display.storyboardCueZh || display.visualSummaryZh, 46)}，focus on ${display.visualFocusZh || shot.visual?.focus || getSceneFocusForFamily(family)}，no generic title-only illustration`;
    acc[shot.id] = {
      ...current,
      ...display,
      prompt: promptText,
      imagePrompt: promptText,
      family,
      sceneFamily: family,
      templateCandidates,
      canvasRatio: '16:9',
      canvasWidth: 1920,
      canvasHeight: 1080,
      visual: current.visual || shot.visual,
      scriptRole: safeString(current?.scriptRole || shot?.scriptRole),
      scriptBlockId: safeString(current?.scriptBlockId || shot?.scriptBlockId),
      dataPoints: Array.isArray(current.dataPoints) ? current.dataPoints : shot.dataPoints,
      comparisons: Array.isArray(current.comparisons) ? current.comparisons : shot.comparisons,
      keywords: Array.isArray(current.keywords) ? current.keywords : shot.keywords,
    };
    return acc;
  }, {});
  nextPayload.prompts = prompts;
  nextPayload.shots = shots;
  nextPayload.scenePlan = buildStep4ScenePlanMetadata(shots, input);
  nextPayload.templateCatalog = clone(ULTIMATE_TEMPLATE_CATALOG);
  nextPayload.visualSystem = 'ultimate-1080p';
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
  voice.engine = safeString(voice.engine) || 'qwen-tts';
  voice.language = safeString(voice.language) || 'zh-CN';
  voice.speed = safeString(voice.speed) || '1.0';
  voice.pitch = toNumber(voice.pitch, 0);
  voice.totalDuration = round(voice.script.reduce((sum, item) => sum + toNumber(item.duration, 0), 0));
  voice.totalChars = round(voice.script.reduce((sum, item) => sum + safeString(item.text).length, 0));
  nextPayload.voice = voice;
  return nextPayload;
}

function resolveStylePreset(input) {
  const explicitVisualSystem = safeString(input?.pipelineState?.visualSystem)
    || safeString(input?.pipelineState?.scenePlan?.visualSystem);
  return explicitVisualSystem || 'ultimate-1080p';
}

function buildProjectBuildPayload(input) {
  const projectId = safeString(input?.projectState?.id) || 'default';
  const stylePreset = resolveStylePreset(input);
  const compositionId = 'UltimateSceneTemplate';
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
  const requestedWidth = round(render.width);
  const requestedHeight = round(render.height);

  render.template = 'ultimate';
  render.quality = safeString(render.quality) || 'high';
  render.fps = round(render.fps || 30);
  render.width = requestedWidth > 0 ? requestedWidth : 1920;
  render.height = requestedHeight > 0 ? requestedHeight : 1080;
  render.format = safeString(render.format) || 'mp4';
  render.codec = safeString(render.codec) || 'h264';
  render.bitrate = round(render.bitrate || 12000);
  render.estimatedDuration = round(render.estimatedDuration || shotDuration || 45);
  render.estimatedSize = safeString(render.estimatedSize) || `~${Math.max(8, round((render.bitrate * render.estimatedDuration / 8) / 1024))}MB`;
  render.notes = safeString(render.notes) || 'Step 8 采用 Ultimate 1920x1080 横版模板，适合结构化讲解、卡片拆解和章节化内容。';
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
      hookStrength: options.length > 0 ? average(options.map((item) => clamp(round(item?.hookScore || item?.score || 80), 60, 100))) : 42,
      ctrPredict: options.length > 0 ? average(options.map((item) => clamp(round(item?.ctrPredict || 65), 0, 100))) : 50,
      first3Sec: options.length > 0 ? average(options.map((item) => clamp(round(item?.first3Sec || 65), 0, 100))) : 50,
      infoDensity: options.length > 0 ? average(options.map((item) => clamp(round(item?.infoDensity || 60), 0, 100))) : 50,
      noveltyScore: options.length > 0 ? average(options.map((item) => clamp(round(item?.noveltyScore || 55), 0, 100))) : 50,
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
  const titleAlignmentScore = round(copy?.titleAlignment?.score || 0);
  const evidenceAnchors = Array.isArray(copy?.coverage?.evidenceAnchors) ? copy.coverage.evidenceAnchors : [];
  const structuredBodyCount = body.filter((item) => (
    safeString(item?.sceneIntent)
    && (safeString(item?.evidenceAnchor) || (Array.isArray(item?.dataPoints) && item.dataPoints.length > 0))
    && Array.isArray(item?.keywords)
    && item.keywords.length > 0
  )).length;

  if (!safeString(copy.hook)) issues.push('缺少 Hook');
  if (body.length === 0) issues.push('缺少正文段落');
  if (!safeString(copy.cta)) issues.push('缺少 CTA');
  if (titleAlignmentScore < 60) issues.push('文案对当前标题承接不足，主判断可能跑偏');
  if (evidenceAnchors.length === 0) issues.push('正文缺少明确证据锚点，后续场景编排会变虚');
  if (structuredBodyCount < Math.max(1, body.length - 1)) {
    suggestions.push('建议给每段正文补 sceneIntent / evidenceAnchor / keywords / dataPoints，方便 Step 4 稳定拆场景');
  }
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
      alignment: titleAlignmentScore || 56,
      evidence: evidenceAnchors.length >= Math.max(2, Math.min(4, body.length)) ? 88 : evidenceAnchors.length > 0 ? 72 : 54,
      compliance: forbiddenWords.copy.length === 0 && forbiddenWords.cta.length === 0 ? 90 : 56,
    },
    issues,
    suggestions,
    forbiddenWords,
  );
}

function evaluateStep4(payload) {
  const shots = Array.isArray(payload?.shots) ? payload.shots : [];
  const families = uniqueBy(
    shots
      .map((shot) => safeString(shot?.sceneFamily || shot?.family))
      .filter((family) => family && family !== 'hero' && family !== 'cta'),
    (family) => family,
  );
  const narrations = shots.map((shot) => safeString(shot?.narration || shot?.narrationText || shot?.narrationZh || ''));
  const issues = [];
  const suggestions = [];
  if (shots.length < 6) issues.push('场景数量不足，尚未形成完整的 Ultimate 章节化结构');
  if (!shots.every((shot) => ULTIMATE_SCENE_FAMILIES.has(safeString(shot?.sceneFamily || shot?.family)))) {
    issues.push('存在未命中 Ultimate family 的场景');
  }
  if (families.length < Math.min(4, Math.max(1, shots.length - 2))) {
    suggestions.push('中段 family 多样性偏低，建议增加对比、证据、架构、图表类模板');
  }
  if (shots.some((shot) => toNumber(shot?.durationSeconds, 0) < 3 || toNumber(shot?.durationSeconds, 0) > 15)) {
    suggestions.push('建议把场景时长继续压到 3-15 秒区间');
  }

  // 检查 narration 文案重复
  const narrationCounts = {};
  for (const n of narrations) {
    const key = n.trim().toLowerCase();
    if (key.length > 0) {
      narrationCounts[key] = (narrationCounts[key] || 0) + 1;
    }
  }
  const duplicateNarrations = Object.entries(narrationCounts).filter(([, count]) => count > 1);
  if (duplicateNarrations.length > 0) {
    issues.push(`发现 ${duplicateNarrations.length} 组重复 narration 文案，每个 shot 必须有不同的核心信息点`);
  }

  // 检查 narration 是否空洞（缺少具体数据或证据）
  const DATA_POINT_PATTERN = /\d+[亿万千百个美元%倍几分之]|分数|token|参数|版本|开源|闭源|GPT|DeepSeek|Codeforces| benchmark | accuracy | score/i;
  const tooVagueShots = shots.filter((shot) => {
    const narration = safeString(shot?.narration || shot?.narrationText || shot?.narrationZh || '');
    if (narration.length < 15) return true;
    if (!DATA_POINT_PATTERN.test(narration)) return true;
    return false;
  });
  if (tooVagueShots.length > 0) {
    issues.push(`有 ${tooVagueShots.length} 个中段 shot 的 narration 缺少具体数据点或硬证据，请补充具体数字、名称或结论`);
  }

  return buildEvaluation(
    4,
    'video-pipeline-scene-planner',
    {
      durationAccuracy: shots.length >= 6 ? 88 : 56,
      rhythm: shots.every((shot) => toNumber(shot?.durationSeconds, 0) >= 3) ? 84 : 64,
      structure: shots.every((shot) => safeString(shot?.level) && safeString(shot?.type) && safeString(shot?.sceneFamily || shot?.family)) ? 92 : 64,
      completeness: shots.every((shot) => Array.isArray(shot?.keywords) && Array.isArray(shot?.templateCandidates)) ? 90 : 66,
      diversity: families.length >= 4 ? 88 : families.length >= 3 ? 74 : 58,
      narrationUniqueness: duplicateNarrations.length === 0 ? 90 : 40,
      narrationSpecificity: tooVagueShots.length === 0 ? 90 : 50,
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
  if (promptList.length === 0) issues.push('没有生成任何场景 prompt');
  if (targetCount > 0 && promptList.length !== targetCount) issues.push('prompt 数量与场景数量不一致');
  if (!promptList.every((item) => safeString(item?.sceneFamily || item?.family))) issues.push('存在缺少 family 的视觉 prompt');
  if (!promptList.every((item) => safeString(item?.canvasRatio || '').includes('16:9') || (toNumber(item?.canvasWidth, 0) >= toNumber(item?.canvasHeight, 0) && toNumber(item?.canvasWidth, 0) > 0))) {
    issues.push('存在未对齐 16:9 横版的视觉 prompt');
  }

  return buildEvaluation(
    5,
    'video-pipeline-scene-prompts',
    {
      specificity: promptList.every((item) => safeString(item?.imagePrompt || item?.prompt).length >= 24) ? 88 : 64,
      coverage: targetCount > 0 && promptList.length === targetCount ? 90 : 62,
      structure: promptList.every((item) => Array.isArray(item?.keywords) && item?.keywords.length > 0 && safeString(item?.sceneFamily || item?.family)) ? 88 : 64,
      consistency: promptList.every((item) => item?.visual && item?.dataPoints && safeString(item?.promptZh || item?.prompt).includes('16:9')) ? 86 : 66,
      canvasFit: promptList.every((item) => safeString(item?.canvasRatio || '').includes('16:9')) ? 92 : 60,
    },
    issues,
    ['建议继续补充 visual / dataPoints / comparisons / templateCandidates，方便图像和 Ultimate 渲染复用。'],
  );
}

function evaluateStep6(payload, input) {
  const voice = payload?.voice || {};
  const script = Array.isArray(voice.script) ? voice.script : [];
  const shotCount = Array.isArray(input?.shotsState) ? input.shotsState.length : 0;
  const issues = [];
  if (script.length === 0) issues.push('缺少逐场景配音脚本');
  if (shotCount > 0 && script.length !== shotCount) issues.push('配音脚本数量与场景数量不一致');

  return buildEvaluation(
    6,
    'video-pipeline-audio',
    {
      timing: round(voice.totalDuration || 0) > 0 ? 88 : 62,
      spoken: script.every((item) => safeString(item?.text).length > 0) ? 86 : 64,
      engine: safeString(voice.engine) === 'qwen-tts' ? 92 : 82,
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
  getPhaseForStep,
  getSkillSpec,
  getStepSkillId,
  getStepSkillSpec,
  listSkillCatalog,
};

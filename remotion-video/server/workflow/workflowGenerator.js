const {
  generateStructuredJson,
  hasWorkflowLLM,
} = require('./step123/llm');
const {generateStep123Workflow} = require('./step123/pipeline');
const {
  ensureStepSkillReady,
  enrichStepResult,
  getPhaseForStep,
} = require('./skillRegistry');
const { ULTIMATE_TEMPLATE } = require('../../scripts/lib/index.js');
const { clone, truncate, getInputTopic, normalizeTopicResearch, searchTopicResearch } = require('./searchUtils');
const { buildWorkflowContext, buildStepSchemaPrompt, normalizeGenerationMeta, getCurrentStepSkillFromInput, getWorkflowCapabilities } = require('./stepSchema');
const { normalizeStepPayload, normalizeAnalysisPayload, normalizeTitlesPayload, normalizeCopyPayload, normalizeShotsPayload, normalizePromptsPayload, normalizeVoicePayload, normalizeRenderPayload } = require('./normalizers');

function buildStep4FallbackProfile(skill, variant) {
  const presetId = skill.presetId || '';

  if (presetId === 'fast-cut') {
    return {
      labels: ['开场钩子', '核心判断', '关键动作', '补充证据', '结果落点', '行动收束'],
      prefixes: ['先抓人：', '立刻给结论：', '马上推进：', '补一条关键证据：', '结果压缩：', '最后收口：'],
      durationBias: -0.4,
      visualStyle: '快切镜头',
    };
  }

  if (presetId === 'comparison-demo') {
    return {
      labels: ['对比入口', '对象 A', '对象 B', '差异解释', '结果判断', '行动选择'],
      prefixes: ['先建立对比：', '先看这一侧：', '再看另一侧：', '把差异摊开：', '结论是：', '最后怎么选：'],
      durationBias: 0.2,
      visualStyle: '对比演示',
    };
  }

  if (presetId === 'list-rhythm') {
    return {
      labels: ['重点 01', '重点 02', '重点 03', '重点 04', '重点 05', '重点 06'],
      prefixes: ['第一点：', '第二点：', '第三点：', '第四点：', '第五点：', '最后一点：'],
      durationBias: 0,
      visualStyle: '清单节奏',
    };
  }

  if (presetId === 'explainer-structure') {
    return {
      labels: ['先给结论', '背景补充', '结构拆解', '关键证据', '价值落点', '最后收束'],
      prefixes: ['结论先说：', '背景补一句：', '结构拆开：', '证据补上：', '价值落地：', '最后收束：'],
      durationBias: 0.3,
      visualStyle: '讲解结构',
    };
  }

  return {
    labels: [
      ['开场问题', '核心结论', '路径拆解', '细节展开', '价值补充', '行动收束'],
      ['先抛结论', '回到背景', '拆成三层', '重点对照', '判断落点', '最后行动'],
      ['问题入场', '信息去噪', '关系展开', '关键证据', '价值总结', '结尾提醒'],
      ['先给观点', '补充线索', '结构重组', '场景说明', '核心判断', '收束动作'],
    ][variant],
    prefixes: [
      ['', '', '', '', '', ''],
      ['先把结论亮出来：', '再回到背景：', '接着拆结构：', '补关键细节：', '最后落判断：', '收成行动：'],
      ['先抛问题：', '再去噪：', '然后展开关系：', '再补证据：', '最后总结：', '顺手提醒：'],
      ['观点先行：', '线索补充：', '结构重排：', '场景落地：', '判断压缩：', '动作收尾：'],
    ][variant],
    durationBias: 0,
    visualStyle: skill.style || skill.presetLabel || '镜头结构',
  };
}

function buildStep5FallbackProfile(skill, variant) {
  const presetId = skill.presetId || '';

  if (presetId === 'real-scene') {
    return {
      style: '真实场景写实',
      mood: ['纪实观察', '真实工作流', '现场感', '可信细节'][variant],
      visualFocus: '人物主体 + 真实空间 + 关键设备',
      negativePrompt: '低质 CG, 漂浮 UI, 假手假脸, 过度霓虹, 夸张特效',
    };
  }

  if (presetId === 'infographic') {
    return {
      style: '信息图解',
      mood: ['理性图解', '结构解释', '信息层次', '说明感'][variant],
      visualFocus: '结构信息 + 标签图层 + 单一焦点',
      negativePrompt: '无信息承载, 画面杂乱, 元素过多, 装饰噪音, 文本不可读',
    };
  }

  if (presetId === 'tech-ui') {
    return {
      style: '科技 UI',
      mood: ['系统感', '高对比面板', '未来工作台', '信息密度'][variant],
      visualFocus: '主界面面板 + 数据层 + 核心操作区',
      negativePrompt: '廉价赛博霓虹, 过曝炫光, 主体缺失, 低端游戏感, 画面脏乱',
    };
  }

  if (presetId === 'high-contrast-cover') {
    return {
      style: '高对比封面',
      mood: ['强封面感', '首屏冲击', '高对比', '主体突出'][variant],
      visualFocus: '单一主体 + 大块留白 + 强对比背景',
      negativePrompt: '焦点分散, 灰雾感, 元素堆叠, 小主体, 平淡光线',
    };
  }

  return {
    style: skill.style || '解释类横版视觉',
    mood: ['信息张力', '冷静拆解', '强对比', '未来感解释'][variant],
    visualFocus: ['主体人物 + 结构信息', '问题标题 + 核心对象', '结论文本 + 对比画面', '产品场景 + 信息层次'][variant],
    negativePrompt: skill.avoid || '模糊主体, 低清晰度, 构图混乱',
  };
}

function createFallbackWorkflowPayload(stepId, input) {
  const shots = Array.isArray(input.shotsState) ? clone(input.shotsState) : [];
  const pipeline = clone(input.pipelineState || {});
  const generation = normalizeGenerationMeta(stepId, input);
  const variant = Math.max(0, (shots.length + stepId + generation.attempt) % 4);
  const currentSkill = getCurrentStepSkillFromInput(stepId, input);
  const topicQuery = getInputTopic(input) || '当前主题';
  const topicResearch = normalizeTopicResearch(pipeline.topicResearch, input).topicResearch || null;
  const researchResults = Array.isArray(topicResearch?.results) ? topicResearch.results : [];
  const primaryTitle = researchResults[0]?.title || topicQuery;
  const primarySnippet = researchResults[0]?.snippet || '';
  const secondaryTitle = researchResults[1]?.title || `${topicQuery} 的相关讨论`;

  if (stepId === 1) {
    return {
      ...normalizeAnalysisPayload({
        analysis: {
          thesis: [
            `围绕"${topicQuery}"做内容，关键不是复述名词，而是把搜索结果里的共性问题、人物关系和场景价值压缩成可讲清楚的结构。`,
            `"${topicQuery}"真正值得讲的，不是单一新闻点，而是它背后的产品动作、用户关注和传播切口。`,
            `如果要把"${topicQuery}"讲成短视频，核心是先从公开讨论里抽出高频焦点，再重组为清晰的叙事顺序。`,
            `"${topicQuery}"适合做内容的原因，在于它已经形成搜索线索，可以直接沉淀为受众、命题和执行结构。`,
          ][variant],
          audience: pipeline.analysis?.audience || `关注"${topicQuery}"的产品用户、行业观察者、AI 从业者与想快速理解事件背景的人`,
          corePromise: [
            `把"${topicQuery}"从零散信息压缩成可讲、可看、可执行的短视频逻辑分析。`,
            `让观众在最短时间内看懂"${topicQuery}"到底发生了什么、为什么值得关注、能得到什么判断。`,
            `基于搜索到的公开线索，输出一套适合后续标题、文案、分镜继续复用的分析骨架。`,
            `先用搜索结果收敛事实面，再把"${topicQuery}"重构成稳定的视频表达框架。`,
          ][variant],
          layers: [
            {
              label: '话题入口',
              insight: `先交代"${topicQuery}"是什么，以及用户为什么会主动搜索它。`,
              evidence: primarySnippet || primaryTitle,
            },
            {
              label: '关注焦点',
              insight: '从搜索结果里提炼高频问题、关键角色或平台关系，避免只停留在表面概念。',
              evidence: secondaryTitle,
            },
            {
              label: '内容切口',
              insight: '把搜索到的事实线索压缩成一个主命题，方便后续标题和 Hook 收敛。',
              evidence: researchResults[2]?.title || `围绕"${topicQuery}"形成稳定叙事视角`,
            },
            {
              label: '执行路径',
              insight: '为后续文案、分镜、配音提供可直接接续的结构，不让输入标题只停留在占位文本。',
              evidence: `当前关键词：${topicQuery}`,
            },
          ],
          process: [
            { label: '标题检索', detail: `先以"${topicQuery}"为检索词抓取公开搜索结果，识别相关讨论。` },
            { label: '线索去噪', detail: '过滤低相关或泛化结果，只保留可用于解释主题的共同线索。' },
            { label: '命题收敛', detail: '把搜索线索压缩成一个主命题和若干逻辑层。' },
            { label: '视频化输出', detail: '确保分析结果可以直接被 Step 2-4 继续复用。' },
          ],
        },
      }, input),
      ...normalizeTopicResearch(topicResearch, input),
    };
  }

  if (stepId === 2) {
    const titleSets = [
      [
        { title: `真正值得讲的，不只是"${topicQuery}"这个词，而是它背后的完整逻辑`, angle: '反差型', score: 91 },
        { title: `"${topicQuery}"到底在讲什么？一次拆清核心信息`, angle: '解释型', score: 89 },
        { title: `别只看标题，"${topicQuery}"真正有价值的是这几层信息`, angle: '拆解型', score: 86 },
        { title: `想看懂"${topicQuery}"，先抓这 4 个重点`, angle: '极简型', score: 84 },
      ],
      [
        { title: `为什么大家都在搜"${topicQuery}"？关键不在热度，在这条底层线索`, angle: '追问型', score: 92 },
        { title: `看懂"${topicQuery}"，别从名词开始，要从这 3 层关系开始`, angle: '结构型', score: 88 },
        { title: `"${topicQuery}"最容易被忽略的，不是信息点，而是背后的判断框架`, angle: '认知型', score: 86 },
        { title: `同样是"${topicQuery}"，为什么有人越看越乱？因为少了这一步`, angle: '痛点型', score: 84 },
      ],
      [
        { title: `如果只用一分钟解释"${topicQuery}"，我会先说这句结论`, angle: '结论先行', score: 90 },
        { title: `"${topicQuery}"值得拍成视频，不是因为新，而是因为这层价值刚被看见`, angle: '价值型', score: 88 },
        { title: `别被表面信息带偏，"${topicQuery}"真正该拆的是这条主线`, angle: '去噪型', score: 87 },
        { title: `围绕"${topicQuery}"，最适合短视频展开的，其实是这 4 个问题`, angle: '问题型', score: 85 },
      ],
      [
        { title: `"${topicQuery}"怎么讲才不空？先把人物、问题、价值这三件事对齐`, angle: '方法型', score: 91 },
        { title: `看似只是"${topicQuery}"，其实背后已经有一套完整叙事框架`, angle: '框架型', score: 89 },
        { title: `很多内容都讲不好"${topicQuery}"，因为第一刀切错了地方`, angle: '批判型', score: 87 },
        { title: `想把"${topicQuery}"讲清楚，最稳的方式是按这个顺序拆`, angle: '执行型', score: 84 },
      ],
    ];

    return normalizeTitlesPayload({
      titles: {
        options: titleSets[variant],
        selectedIndex: variant,
        selectedReason: [
          `这一版能承接"${topicQuery}"的搜索关注点，同时保留传播张力和解释力。`,
          `这一版更强调"为什么会被搜索"，适合做有追问感的主标题。`,
          `这一版先给结论再展开，更适合短视频首屏留人。`,
          `这一版偏执行和框架感，适合后续文案与分镜继续展开。`,
        ][variant],
      },
      projectName: `"${topicQuery}"主题拆解`,
    }, input);
  }

  if (stepId === 3) {
    const hookOptions = [
      `很多人第一次看到"${topicQuery}"只停留在关键词本身，但真正值得讲的，是搜索结果背后反复出现的那几个核心问题。`,
      `如果你觉得"${topicQuery}"看起来信息很多却抓不到重点，问题通常不是内容太杂，而是没人帮你先把线索排好。`,
      `"${topicQuery}"之所以值得讲，不是因为它新，而是因为搜索结果已经把观众最关心的问题暴露出来了。`,
      `别急着记"${topicQuery}"这个名词，先看它背后到底对应哪类问题、哪类人和哪种价值。`,
    ];
    const bodySets = [
      [
        { label: '破题', text: `先回答"${topicQuery}"到底是什么，为什么会被持续搜索和讨论。` },
        { label: '展开', text: primarySnippet || `再把与"${topicQuery}"相关的关键人物、产品动作或平台关系串起来，形成清晰解释。` },
        { label: '收束', text: `最后把"${topicQuery}"收敛成一个明确判断，让观众知道这件事和自己有什么关系。` },
      ],
      [
        { label: '先给判断', text: `先把"${topicQuery}"最重要的结论抛出来，让观众知道这件事到底值不值得看。` },
        { label: '再讲证据', text: primarySnippet || `再用搜索里最稳定的线索去解释，为什么大家会持续关注"${topicQuery}"。` },
        { label: '最后落地', text: `最后把"${topicQuery}"和用户的实际感知连上，避免内容停在概念层。` },
      ],
      [
        { label: '问题切入', text: `先抛出一个和"${topicQuery}"直接相关的问题，让观众快速进入状态。` },
        { label: '关系拆解', text: `再把"${topicQuery}"涉及的人物、平台和动作拆成几层关系，讲清楚为什么会形成讨论。` },
        { label: '价值总结', text: `最后用一句明确判断告诉观众，理解"${topicQuery}"后能获得什么。` },
      ],
      [
        { label: '去噪', text: `先过滤掉"${topicQuery}"外围噪音，只抓真正高频、有效的关注焦点。` },
        { label: '重组', text: `再把零散线索按逻辑顺序重新组织，让"${topicQuery}"变成能一口气讲下去的结构。` },
        { label: '行动', text: `最后把"${topicQuery}"收成一个可记忆、可转述、可继续追踪的结论。` },
      ],
    ];
    const ctaOptions = [
      `如果你也在关注"${topicQuery}"，接下来就按这个结构继续拆标题、文案和分镜。`,
      `如果这条思路讲清楚了"${topicQuery}"，下一步就可以直接把它压进标题池和场景结构。`,
      `看懂"${topicQuery}"之后，接下来就用这套逻辑继续做标题和镜头设计。`,
      `如果你想把"${topicQuery}"讲成一条能传播的视频，下一步就继续把这套判断做成标题和镜头。`,
    ];

    return normalizeCopyPayload({
      copy: {
        hook: hookOptions[variant],
        body: bodySets[variant],
        cta: ctaOptions[variant],
      },
    }, input);
  }

  if (stepId === 4) {
    // Use shotsState if available, otherwise derive from copy content
    let derivedShots = shots;
    if (derivedShots.length === 0) {
      const copy = pipeline.copy || {};
      const hookText = typeof copy.hook === 'string' ? copy.hook : (copy.hook?.text || '');
      const bodyTexts = Array.isArray(copy.body) ? copy.body.map(b => typeof b === 'string' ? b : (b?.text || '')) : [];
      const ctaText = typeof copy.cta === 'string' ? copy.cta : (copy.cta?.text || '');

      derivedShots = [];
      let shotIndex = 0;

      const SHOT_LABELS = ['开场问题', '结论亮相', '路径拆解', '细节展开', '记忆系统', '协作结构', '生态空间', '价值补充', '长期沉淀', '核心总结', '行动召唤', '品牌收尾'];

      if (hookText) {
        derivedShots.push({
          id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
          title: hookText.length > 15 ? hookText.substring(0, 15) + '...' : hookText,
          narration: hookText,
          durationSeconds: Math.max(4, Math.ceil(hookText.length / 5)),
        });
        shotIndex++;
      }

      bodyTexts.forEach((text, i) => {
        if (text) {
          derivedShots.push({
            id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
            title: SHOT_LABELS[i] || `内容块${i + 1}`,
            narration: text,
            durationSeconds: Math.max(5, Math.ceil(text.length / 5)),
          });
          shotIndex++;
        }
      });

      if (ctaText) {
        derivedShots.push({
          id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
          title: '行动召唤',
          narration: ctaText,
          durationSeconds: Math.max(4, Math.ceil(ctaText.length / 5)),
        });
      }
    }

    const profile = buildStep4FallbackProfile(currentSkill, variant);

    return normalizeShotsPayload({
      shots: derivedShots.map((shot, index) => ({
        id: shot.id,
        title: profile.labels[index] || shot.title,
        narration: `${profile.prefixes[index] || ''}${shot.narration}`.trim(),
        durationSeconds: Math.max(0.1, shot.durationSeconds + profile.durationBias + (((variant + index) % 2 === 0) ? 0 : 0.3)),
        visualStyle: profile.visualStyle,
      })),
    }, input);
  }

  if (stepId === 5) {
    const profile = buildStep5FallbackProfile(currentSkill, variant);
    const byShotId = {};
    shots.forEach((shot) => {
      const scriptExcerpt = truncate(String(shot.scriptExcerpt || shot.narration || shot.title || '').trim(), 42);
      const storyboardCue = truncate(String(shot.storyboardCueZh || shot.sceneIntent || shot.title || '').trim(), 36);
      byShotId[shot.id] = {
        prompt: [
          `为场景"${shot.title}"生成 16:9 横版视觉，必须服务口播原句"${scriptExcerpt}"，围绕 ${storyboardCue} 组织画面，采用${profile.style}表达，突出 ${currentSkill.emphasis || profile.visualFocus}，主体清晰，信息层次明确。`,
          `围绕"${shot.title}"设计 1920x1080 横版主画面，核心解释口播"${scriptExcerpt}"，用 ${storyboardCue} 做分镜抓手，整体走${profile.style}方向，保留标题留白与强视觉焦点。`,
          `给"${shot.title}"生成高识别度的 16:9 视觉，画面必须围绕口播原句"${scriptExcerpt}"展开，用${profile.style}强化首屏理解和传播感，避免做成只对应标题的泛图。`,
          `把"${shot.title}"做成适合科技讲解视频的 16:9 横版主画面，重点解释"${scriptExcerpt}"，视觉风格采用${profile.style}，分镜抓手围绕 ${storyboardCue}，重点突出 ${currentSkill.emphasis || profile.visualFocus}。`,
        ][variant],
        negativePrompt: [profile.negativePrompt, currentSkill.avoid].filter(Boolean).join(', '),
        style: profile.style,
        mood: currentSkill.style || profile.mood,
        visualFocus: currentSkill.emphasis || profile.visualFocus,
        text: String(shot.narration || '').trim(),
        sceneIntent: String(shot.sceneIntent || '').trim(),
        evidenceAnchor: String(shot.evidenceAnchor || '').trim(),
        scriptBlockId: String(shot.scriptBlockId || '').trim(),
        scriptBlockLabel: String(shot.scriptBlockLabel || '').trim(),
        scriptExcerpt: String(shot.scriptExcerpt || shot.narration || '').trim(),
        storyboardCueZh: String(shot.storyboardCueZh || shot.sceneIntent || shot.title || '').trim(),
        canvasRatio: '16:9',
        canvasWidth: 1920,
        canvasHeight: 1080,
      };
    });
    return normalizePromptsPayload({ prompts: { byShotId } }, input);
  }

  if (stepId === 6) {
    const presetOptions = ['女声·冷静解释', '男声·新闻拆解', '女声·快节奏讲解', '男声·沉稳分析'];
    const emotionOptions = ['坚定', '克制', '有力', '沉着'];
    const speedOptions = ['1.0x', '0.95x', '1.08x', '1.02x'];
    return normalizeVoicePayload({
      voice: {
        preset: presetOptions[variant],
        emotion: emotionOptions[variant],
        speed: speedOptions[variant],
        pauses: '自然停顿',
        shots: shots.map((shot) => ({
          id: shot.id,
          text: shot.narration,
          emotion: indexBasedEmotion(shot.id),
          emphasis: shot.title,
          durationSeconds: shot.durationSeconds,
        })),
      },
    }, input);
  }

  const totalDurationSec = shots.reduce((s, sh) => s + (sh.durationSeconds || 5), 0);
  const renderPresets = [
    {
      template: ULTIMATE_TEMPLATE,
      width: 1920,
      height: 1080,
      bitrate: 12000,
      notes: 'Ultimate 1920x1080 横版模板，适合把搜索结果、文案和分镜压成章节化信息视频',
    },
  ];
  const preset = renderPresets[0];
  const presetEstimatedMB = Math.round((preset.bitrate * totalDurationSec / 8) / 1024);

  return normalizeRenderPayload({
    render: {
      template: preset.template,
      quality: ['high', 'medium', 'high', 'low'][variant % 4] || 'high',
      fps: 30,
      width: preset.width,
      height: preset.height,
      format: 'mp4',
      codec: 'h264',
      bitrate: preset.bitrate,
      estimatedDuration: Math.round(totalDurationSec),
      estimatedSize: '~' + presetEstimatedMB + 'MB',
      notes: preset.notes,
    },
  }, input);
}

function indexBasedEmotion(shotId) {
  if (/01|02/.test(shotId)) {
    return '有力';
  }
  if (/07|08|09/.test(shotId)) {
    return '收束';
  }
  return '平稳';
}

async function generateWithLLM(stepId, context) {
  const prompt = buildStepSchemaPrompt(stepId, context);
  const result = await generateStructuredJson({
    temperature: context.generation?.mode === 'regenerate' ? 1 : 0.7,
    topP: context.generation?.mode === 'regenerate' ? 0.95 : 1,
    messages: [
      {
        role: 'developer',
        content: 'You generate structured JSON for a short-video workflow editor. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });
  return {
    model: result.model,
    payload: result.payload,
  };
}

async function generateWorkflowStep(input) {
  const stepId = Number(input.stepId);
  if (!Number.isFinite(stepId)) {
    throw new Error('stepId is required');
  }

  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(stepId)) {
    throw new Error(`Unsupported workflow step: ${stepId}`);
  }

  if ([1, 2, 3].includes(stepId)) {
    return generateStep123Workflow(input);
  }

  if (stepId === 2 && !input.pipelineState?.analysis && !input.pipelineState?.selectedAnalysis) {
    throw new Error('请先完成并确认 Step 1（逻辑分析）');
  }

  if (stepId === 3 && !input.pipelineState?.selectedTitleId) {
    throw new Error('请先在 Step 2 选择并确认标题');
  }

  const topicQuery = getInputTopic(input);
  let topicResearch = input.pipelineState?.topicResearch || null;

  if (stepId === 1 && topicQuery) {
    try {
      topicResearch = await searchTopicResearch(topicQuery);
    } catch (error) {
      console.warn(`[Workflow] Topic research failed for "${topicQuery}": ${error.message}`);
    }
  }

  const enrichedInput = {
    ...input,
    pipelineState: {
      ...(input.pipelineState || {}),
      inputTopic: input.pipelineState?.inputTopic || topicQuery,
      inputTitleKeywords: input.pipelineState?.inputTitleKeywords || topicQuery,
      ...(topicResearch ? { topicResearch } : {}),
    },
  };
  const skillSpec = ensureStepSkillReady(stepId);

  if (stepId === 7) {
    const enriched = enrichStepResult(
      stepId,
      {
        projectBuild: {
          ...(enrichedInput.pipelineState?.projectBuild || {}),
        },
      },
      enrichedInput,
      skillSpec,
    );

    return {
      stepId,
      ...getPhaseForStep(stepId),
      source: 'deterministic',
      model: 'remotion-project-build',
      generatedAt: new Date().toISOString(),
      payload: enriched.payload,
      resolvedSkill: enriched.resolvedSkill,
      evaluation: enriched.evaluation,
    };
  }

  const context = buildWorkflowContext(stepId, enrichedInput);

  if (hasWorkflowLLM()) {
    try {
      const result = await generateWithLLM(stepId, context);
      const enriched = enrichStepResult(
        stepId,
        normalizeStepPayload(stepId, {
          ...result.payload,
          ...(stepId === 1 && topicResearch ? { topicResearch } : {}),
        }, enrichedInput),
        enrichedInput,
        skillSpec,
      );
      return {
        stepId,
        ...getPhaseForStep(stepId),
        source: 'openai',
        model: result.model,
        generatedAt: new Date().toISOString(),
        payload: enriched.payload,
        resolvedSkill: enriched.resolvedSkill,
        evaluation: enriched.evaluation,
      };
    } catch (error) {
      console.warn(`[Workflow] LLM generation failed for step ${stepId}: ${error.message}`);
    }
  }

  const enriched = enrichStepResult(
    stepId,
    createFallbackWorkflowPayload(stepId, enrichedInput),
    enrichedInput,
    skillSpec,
  );
  return {
    stepId,
    ...getPhaseForStep(stepId),
    source: 'fallback',
    model: 'local-template',
    generatedAt: new Date().toISOString(),
    payload: enriched.payload,
    resolvedSkill: enriched.resolvedSkill,
    evaluation: enriched.evaluation,
  };
}

module.exports = {
  generateWorkflowStep,
  getWorkflowCapabilities,
};

process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {generateWorkflowStep} = require('../workflow/workflowGenerator');

const disableWorkflowLlm = () => {
  process.env.MINIMAX_API_KEY = '';
  process.env.MINIMAX_API_HOST = '';
  process.env.MINIMAX_WORKFLOW_MODEL = '';
  process.env.MINIMAX_MODEL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.OPENAI_BASE_URL = '';
  process.env.OPENAI_WORKFLOW_MODEL = '';
  process.env.OPENAI_MODEL = '';
  process.env.OPENCLAW_CLI_PATH = '/__missing_openclaw_cli__';
};

const mergeStepResult = ({stepId, result, projectState, shotsState, pipelineState}) => {
  const payload = result?.payload && typeof result.payload === 'object' ? result.payload : {};
  const nextProjectState = {...projectState};
  const nextPipelineState = {...pipelineState};
  let nextShotsState = Array.isArray(shotsState) ? [...shotsState] : [];

  if (stepId === 1) {
    nextPipelineState.analysis = payload.analysis || null;
    nextPipelineState.selectedAnalysis = payload.analysis || null;
    nextPipelineState.topicResearch = payload.topicResearch || null;
  }

  if (stepId === 2) {
    nextPipelineState.titles = payload.titles || null;
    nextPipelineState.selectedTitleId = String(payload?.titles?.selectedId || '').trim() || null;
    const selectedTitle = Array.isArray(payload?.titles?.options)
      ? payload.titles.options.find((item) => String(item?.id || '').trim() === String(payload?.titles?.selectedId || '').trim())
      : null;
    nextProjectState.name = String(payload.projectName || selectedTitle?.title || nextProjectState.name || '').trim() || nextProjectState.name;
  }

  if (stepId === 3) {
    nextPipelineState.copy = payload.copy || null;
  }

  return {
    projectState: nextProjectState,
    shotsState: nextShotsState,
    pipelineState: nextPipelineState,
  };
};

const buildBaseInput = () => ({
  generationMeta: {
    mode: 'generate',
    trigger: 'manual',
    attempt: 0,
  },
  projectState: {
    id: 'content-pipeline-spec',
    name: 'Content Pipeline Spec',
    fps: 30,
    width: 1920,
    height: 1080,
  },
  shotsState: [],
  pipelineState: {
    inputTopic: 'OpenAI 深夜放大招，GPT-5.5 发布后真正会改掉什么',
    inputTitleKeywords: 'OpenAI 深夜放大招，GPT-5.5 发布后真正会改掉什么',
    selectedTitleId: 'title-1',
    titles: {
      options: [
        {
          id: 'title-1',
          title: 'GPT-5.5 发布后，真正该先看的不是热度，而是工作流会不会被改写',
          angle: '结论先行',
          rationale: '把关注点从发布热度切到工作流变化，更适合技术讲解视频。',
          evidenceAnchor: 'OpenAI 发布说明',
          hookStyle: '先抛判断',
        },
      ],
      selectedId: 'title-1',
      selectedReason: '围绕工作流变化切入，更能承接技术受众的真实关注点。',
    },
    selectedAnalysis: {
      thesis: 'GPT-5.5 真正值得看的，不只是模型升级，而是它开始改变团队处理复杂任务的默认工作流。',
      audience: '关注 AI 产品、模型能力和工作流升级的技术用户与内容生产者。',
      corePromise: '先看工作流变化，再看能力细节和真实影响，能比只报发布信息更快讲清价值。',
      analysisBrief: {
        mainQuestion: 'GPT-5.5 这次到底改的是能力表，还是默认工作流？',
        audienceFocus: '想知道这次发布会不会影响真实开发、内容生产和团队协作的人。',
        narrativeApproach: '先给判断，再补事实、对比和场景。',
        whyNow: '发布刚发生，讨论热度高，适合快速做解释型内容。',
      },
      researchFacts: [
        {
          label: '发布动作',
          fact: 'OpenAI 在 2026-04-25 推出 GPT-5.5，主线不是聊天皮肤更新，而是把 Responses API、工具调用和多步骤 Agent 执行一起推进到默认链路。',
          evidenceAnchor: 'OpenAI 发布说明 2026-04-25',
          sourceTitle: 'OpenAI 发布说明 2026-04-25',
        },
        {
          label: '能力重点',
          fact: '能力重点已经从聊天效果转到代码生成、结构化输出、工具调用和多步骤执行稳定性，支持 128K 上下文和更稳的 JSON/函数调用结果。',
          evidenceAnchor: '能力变化摘要 128K / JSON mode',
          sourceTitle: '能力变化摘要',
        },
        {
          label: '对比压力',
          fact: '团队开始把 GPT-5.5 和 Claude、Gemini 放到真实代码与 Agent benchmark 里一起对比，不再只比聊天观感，重点看工具链成功率和多步骤任务通过率。',
          evidenceAnchor: '行业对比讨论 / benchmark',
          sourceTitle: '行业对比讨论',
        },
        {
          label: '场景影响',
          fact: '开发者侧同时要重新评估 API 接入、速率限制、成本和安全 guardrail，因为真实工作流里决定能不能落地的，不只是模型强不强，还有工具链和配额限制。',
          evidenceAnchor: '开发者接入说明 / rate limit / safety',
          sourceTitle: '落地场景观察',
        },
      ],
      layers: [
        {label: '结论层', insight: '先讲工作流变化，不先报热度。', evidence: '发布动作 + 落地场景'},
        {label: '能力层', insight: '能力细节要落到代码、工具调用和多步骤执行。', evidence: '能力变化摘要'},
        {label: '对比层', insight: '对比维度是闭源顶级模型，不是空喊升级。', evidence: '行业对比讨论'},
      ],
      process: [
        {label: '先抛判断', detail: '第一句先讲工作流被改写。'},
        {label: '再补事实', detail: '第二段补能力和执行稳定性。'},
        {label: '最后落场景', detail: '结尾讲清真实工作与内容生产会怎么变。'},
      ],
    },
    copy: {
      requirements: {
        focus: '只讲工作流变化、能力细节和真实影响',
        avoid: '空话、鸡汤、背景铺垫',
        style: '短句、结论先行、像真人拆重点',
        length: '75 秒左右，3 到 4 段推进',
      },
    },
  },
});

const buildGptReleaseInput = () => ({
  generationMeta: {
    mode: 'generate',
    trigger: 'manual',
    attempt: 0,
  },
  projectState: {
    id: 'gpt55-release-spec',
    name: 'gpt5.5 发布',
    fps: 30,
    width: 1920,
    height: 1080,
  },
  shotsState: [],
  pipelineState: {
    inputTopic: 'gpt5.5 发布',
    inputTitleKeywords: 'gpt5.5 发布',
    copy: {
      requirements: {
        focus: '围绕标题主判断，讲发布本身、能力变化、差异和影响',
        avoid: '空话、背景铺垫、泛泛而谈',
        style: '短句、结论先行、像真人拆重点',
        length: '60-90 秒，3 到 4 段推进',
      },
    },
  },
});

const buildLongFormDeepseekInput = () => ({
  generationMeta: {
    mode: 'generate',
    trigger: 'manual',
    attempt: 0,
  },
  projectState: {
    id: 'deepseek-v4-longform',
    name: 'deepseek v4',
    fps: 30,
    width: 1920,
    height: 1080,
  },
  shotsState: [],
  pipelineState: {
    inputTopic: 'deepseek v4',
    inputTitleKeywords: 'deepseek v4',
    selectedTitleId: 'title-1',
    titles: {
      options: [
        {
          id: 'title-1',
          title: '我把一个模糊需求丢给deepseek v4，18分钟后它返回了可用的完整方案',
          angle: '数据型',
          rationale: '时间数字 + 完整结果，直接展示任务闭环。',
          evidenceAnchor: '18分钟完成模糊需求到可用方案',
          hookStyle: '数字型+结果型',
        },
      ],
      selectedId: 'title-1',
      selectedReason: '直接承接任务闭环的主判断。',
    },
    selectedAnalysis: {
      thesis: 'deepseek v4不是简单迭代，而是推理能力从“给答案”到“完成任务”的质变',
      audience: '想用AI解决实际问题但不想被参数营销搞晕的普通用户和行业从业者',
      corePromise: '看完能判断deepseek v4能替你做什么、值不值得切换',
      analysisBrief: {
        mainQuestion: 'deepseek v4到底强在哪，和之前版本相比普通用户能用它做什么之前做不到的事',
        audienceFocus: '不关心参数大小，只关心“我丢个需求它能不能直接帮我搞定”',
        narrativeApproach: '用任务完成能力而非模型参数作为衡量维度',
        whyNow: 'deepseek v4 已形成公开讨论，适合做判断型内容',
      },
      researchFacts: [
        {
          label: '任务闭环',
          fact: 'deepseek v4 最值得看的不是聊天顺不顺，而是它开始能把模糊需求拆成可执行步骤，再收成完整方案。',
          evidenceAnchor: '18分钟完成模糊需求到可用方案',
          sourceTitle: '实测记录',
        },
        {
          label: '能力机制',
          fact: '关键机制不是一句更强，而是 Agent、多步骤 tool calling、长上下文和代码任务执行开始连成一条链。',
          evidenceAnchor: 'Agent + tool calling + 长上下文',
          sourceTitle: '能力变化摘要',
        },
        {
          label: '评测锚点',
          fact: 'SWE-bench 这类 benchmark 真正考的是 AI 能不能处理真实代码 issue，而不是会不会背答案。',
          evidenceAnchor: 'SWE-bench / 真实代码任务',
          sourceTitle: 'benchmark 说明',
        },
        {
          label: '落地判断',
          fact: '决定能不能放进工作流的，不只有模型强弱，还有 API 成本、调用限制和长任务稳定性。',
          evidenceAnchor: 'API 成本 / 调用限制 / 长任务稳定性',
          sourceTitle: '工程落地观察',
        },
      ],
      layers: [
        {label: '本质定位', insight: '核心突破不是聊天，而是任务执行链条开始闭环。', evidence: 'Agent + tool calling'},
        {label: '能力锚点', insight: '长上下文和真实代码任务是两个最该落地的能力点。', evidence: 'SWE-bench + 长上下文'},
        {label: '竞争位置', insight: '真正该比的是能不能进工作流，而不是海报式跑分。', evidence: 'API 成本 + 稳定性'},
      ],
      process: [
        {label: '先抛结果', detail: '先讲模糊需求在 18 分钟内闭环。'},
        {label: '再拆机制', detail: '再讲 Agent、tool calling 和长上下文为什么有用。'},
        {label: '最后给判断', detail: '最后判断它值不值得切换。'},
      ],
    },
    copy: {
      requirements: {
        focus: '只讲任务闭环、能力机制、benchmark和工程落地',
        avoid: '空话、背景铺垫、只讲热度',
        style: '短句、硬信息、像真人当面拆重点',
        length: '2-4 分钟口播，约800-1000字',
      },
    },
  },
});

test('step 3 content pipeline emits structured content contract from repo-owned skill source', async () => {
  disableWorkflowLlm();

  const result = await generateWorkflowStep({
    stepId: 3,
    ...buildBaseInput(),
  });

  const copy = result.payload?.copy || {};
  const body = Array.isArray(copy.body) ? copy.body : [];
  const outline = Array.isArray(copy.outline) ? copy.outline : [];

  assert.equal(result.resolvedSkill?.skillId, 'video-pipeline-content');
  assert.match(result.resolvedSkill?.sourcePath || '', /docs\/workflow-skills\/video-pipeline-content\.SKILL\.md$/);
  assert.ok(outline.length >= 3, 'expected structured outline items');
  assert.ok(outline.every((item) => typeof item.sceneIntent === 'string' && item.sceneIntent.length > 0));
  assert.ok(outline.every((item) => Array.isArray(item.mustInclude) && item.mustInclude.length > 0));
  assert.ok(outline.every((item) => Array.isArray(item.keywords) && item.keywords.length > 0));
  assert.ok(body.length >= 3, 'expected structured body blocks');
  assert.ok(body.every((item) => typeof item.sceneIntent === 'string' && item.sceneIntent.length > 0));
  assert.ok(body.every((item) => typeof item.evidenceAnchor === 'string' && item.evidenceAnchor.length > 0));
  assert.ok(body.every((item) => Array.isArray(item.keywords) && item.keywords.length > 0));
  assert.ok(body.every((item) => Array.isArray(item.dataPoints) && item.dataPoints.length > 0));
  assert.ok(Number(copy?.titleAlignment?.score || 0) >= 40, 'expected title alignment score');
  assert.ok(Array.isArray(copy?.titleAlignment?.matchedKeywords) && copy.titleAlignment.matchedKeywords.length >= 2);
  assert.ok(Array.isArray(copy?.storySpine?.sceneIntents) && copy.storySpine.sceneIntents.length >= 3);
  assert.ok(Array.isArray(copy?.coverage?.evidenceAnchors) && copy.coverage.evidenceAnchors.length > 0);
});

test('step 4 scene planner consumes upgraded step 3 block metadata', async () => {
  disableWorkflowLlm();

  const baseInput = buildBaseInput();
  const step3 = await generateWorkflowStep({
    stepId: 3,
    ...baseInput,
  });
  const bodyBlocks = Array.isArray(step3.payload?.copy?.body) ? step3.payload.copy.body : [];

  const step4 = await generateWorkflowStep({
    stepId: 4,
    ...baseInput,
    pipelineState: {
      ...baseInput.pipelineState,
      copy: step3.payload.copy,
    },
  });

  const middleScenes = Array.isArray(step4.payload?.shots) ? step4.payload.shots.slice(1, -1) : [];
  const matchedPair = bodyBlocks.flatMap((block) => middleScenes.map((scene) => ({block, scene}))).find(({block, scene}) => (
    String(scene?.title || '').includes(String(block?.sceneIntent || '').slice(0, 4))
    || (Array.isArray(scene?.keywords) && Array.isArray(block?.keywords) && scene.keywords.some((item) => block.keywords.includes(item)))
    || (Array.isArray(scene?.dataPoints) && Array.isArray(block?.dataPoints) && scene.dataPoints.some((item) => block.dataPoints.includes(item)))
  ));
  const matchedScene = matchedPair?.scene;
  const matchedBlock = matchedPair?.block;

  assert.ok(matchedScene, 'expected a middle scene to inherit step 3 body metadata');
  assert.ok(Array.isArray(matchedScene?.keywords) && matchedScene.keywords.length > 0);
  assert.ok(Array.isArray(matchedScene?.dataPoints) && matchedScene.dataPoints.length > 0);
  assert.ok(
    matchedScene.dataPoints.some((item) => matchedBlock.dataPoints.includes(item))
      || matchedScene.keywords.some((item) => matchedBlock.keywords.includes(item)),
    'expected step 4 scene to keep step 3 data points or keywords',
  );
});

test('gpt5.5 release flow keeps deterministic titles and copy aligned', async () => {
  disableWorkflowLlm();

  let state = buildGptReleaseInput();
  const step1 = await generateWorkflowStep({
    stepId: 1,
    ...state,
  });
  state = {
    ...state,
    ...mergeStepResult({
      stepId: 1,
      result: step1,
      projectState: state.projectState,
      shotsState: state.shotsState,
      pipelineState: state.pipelineState,
    }),
  };

  const step2 = await generateWorkflowStep({
    stepId: 2,
    ...state,
  });
  state = {
    ...state,
    ...mergeStepResult({
      stepId: 2,
      result: step2,
      projectState: state.projectState,
      shotsState: state.shotsState,
      pipelineState: state.pipelineState,
    }),
  };

  const step3 = await generateWorkflowStep({
    stepId: 3,
    ...state,
  });

  const selectedTitle = step2.payload?.titles?.options?.find((item) => item.id === step2.payload?.titles?.selectedId) || {};
  const copy = step3.payload?.copy || {};
  const joinedText = [
    String(copy.hook || ''),
    ...(Array.isArray(copy.body) ? copy.body.map((item) => String(item?.text || '')) : []),
    String(copy.cta || ''),
  ].join('\n');
  const safetyMatches = joinedText.match(/安全体系也在同步升级/g) || [];

  assert.doesNotMatch(step1.payload?.analysis?.thesis || '', /国产模型/);
  assert.doesNotMatch(step1.payload?.analysis?.thesis || '', /给\s*GPT-?5\.5\s*压力/i);
  assert.match(selectedTitle.title || '', /GPT-?5\.5/i);
  assert.match(selectedTitle.title || '', /Agent|工作流/i);
  assert.equal(step3.source, 'skill-deterministic');
  assert.ok(Number(copy?.titleAlignment?.score || 0) >= 40, 'expected GPT release title alignment score >= 40');
  assert.ok(Number(copy?.coverage?.targetDurationSeconds || 0) <= 90, 'expected requested duration to stay within 90 seconds');
  assert.doesNotMatch(joinedText, /国产模型/);
  assert.doesNotMatch(joinedText, /…/);
  assert.ok(safetyMatches.length <= 1, 'expected safety upgrade sentence not to repeat across deterministic copy');
});

test('deterministic step3 respects long-form skill timing and keeps tech-mechanism block', async () => {
  disableWorkflowLlm();

  const baseInput = buildLongFormDeepseekInput();
  const step3 = await generateWorkflowStep({
    stepId: 3,
    ...baseInput,
  });

  const copy = step3.payload?.copy || {};
  const brief = copy.brief || {};
  const body = Array.isArray(copy.body) ? copy.body : [];
  const techBlock = body.find((item) => /tech-mechanism/i.test(String(item?.type || item?.label || '')));
  const totalText = [
    String(copy.hook || ''),
    ...body.map((item) => String(item?.text || '')),
    String(copy.cta || ''),
  ].join('');

  assert.match(String(brief.pacing || ''), /(1\d{2}|2\d{2}) 秒口播/, 'expected long-form pacing seconds');
  assert.ok(totalText.length >= 700, 'expected deterministic step3 copy to be long-form');
  assert.ok(techBlock, 'expected deterministic copy to preserve tech-mechanism block');
});

process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {generateWorkflowStep} = require('../workflow/workflowGenerator');

const disableWorkflowLlm = () => {
  process.env.OPENAI_API_KEY = '';
  process.env.OPENAI_BASE_URL = '';
  process.env.OPENAI_WORKFLOW_MODEL = '';
  process.env.OPENAI_MODEL = '';
  process.env.OPENCLAW_CLI_PATH = '/__missing_openclaw_cli__';
};

const buildSixPlaceholderShots = () => (
  Array.from({length: 6}, (_, index) => ({
    id: `shot-${String(index + 1).padStart(2, '0')}`,
    title: `占位场景 ${index + 1}`,
    narration: `占位内容 ${index + 1}`,
    durationSeconds: 5,
  }))
);

const buildBaseInput = () => ({
  generationMeta: {
    mode: 'generate',
    trigger: 'manual',
    attempt: 0,
  },
  projectState: {
    id: 'scene-planner-spec',
    name: 'Scene Planner Spec',
    fps: 30,
    width: 1920,
    height: 1080,
  },
  shotsState: buildSixPlaceholderShots(),
  pipelineState: {
    inputTopic: 'Kimi K2.6 为什么让 GPT 压力变大',
    inputTitleKeywords: 'Kimi K2.6 为什么让 GPT 压力变大',
    selectedTitleId: 'title-1',
    titles: {
      options: [
        {
          id: 'title-1',
          title: 'Kimi K2.6 开源王炸，为什么这次真给 GPT 上压力',
        },
      ],
      selectedId: 'title-1',
    },
    copy: {
      hook: '这次真正让 GPT 感到压力的，不是又一个会聊天的模型，而是开源代码能力开始正面撞上闭源顶级选手。',
      body: [
        {
          label: '开源突破',
          text: 'Kimi K2.6 的关键信号不是热度，而是开源代码能力第一次进入真正可用区间。开发者不再只看参数，而是看它能不能在真实工程里稳定接手任务。',
        },
        {
          label: '基准压力',
          text: '如果只看 benchmark，这次更有压力。SWE-Bench Pro、HLE 这类测试不只是拿来宣传，它会直接影响开发者对模型可靠性的判断，也会影响团队是否愿意迁移工作流。',
        },
        {
          label: '工作流变化',
          text: '更大的变化在工作流层。以前一个功能从写代码到补测试再到整理部署，要靠人手动串起来。现在模型开始能承担其中多段工作，开发效率的上限被重新抬高。',
        },
        {
          label: '真正赢家',
          text: '所以最大的赢家不只是某一个模型，而是那些敢把开源模型接进自己研发管线的团队。谁先把工具链、记忆层、评测层接起来，谁就先吃到效率红利。',
        },
      ],
      cta: '如果你更关心的是 benchmark、工程落地还是开源生态，评论区告诉我，我下一条继续拆。',
      readingTime: 108,
    },
  },
});

test('step 4 scene planner expands beyond six placeholder shots and assigns Ultimate families', async () => {
  disableWorkflowLlm();

  const result = await generateWorkflowStep({
    stepId: 4,
    ...buildBaseInput(),
  });

  const shots = result.payload?.shots || [];

  assert.ok(shots.length > 6, 'expected step 4 to expand beyond 6 scenes');
  assert.equal(result.resolvedSkill?.skillId, 'video-pipeline-scene-planner');
  assert.equal(result.payload?.scenePlan?.sceneCount, shots.length);
  assert.equal(result.payload?.visualSystem, 'ultimate-1080p');
  assert.equal(result.payload?.templateCatalog?.length, 20);
  assert.equal(result.payload?.scenePlan?.system, 'ultimate-20-template');
  assert.equal(shots[0]?.sceneFamily, 'hero');
  assert.equal(shots[shots.length - 1]?.sceneFamily, 'cta');
  assert.ok(shots.every((shot) => typeof shot.sceneFamily === 'string' && shot.sceneFamily.length > 0));
  assert.ok(shots.every((shot) => Array.isArray(shot.templateCandidates) && shot.templateCandidates.length > 0));
  assert.ok(shots.every((shot) => typeof shot.scriptRole === 'string' && shot.scriptRole.length > 0));
  assert.ok(shots.every((shot) => typeof shot.director?.cameraMotion === 'string' && shot.director.cameraMotion.length > 0));
  assert.ok(shots.every((shot) => Number.isFinite(Number(shot.director?.staggerGap))));
  assert.ok(shots.every((shot) => typeof shot.director?.revealDirection === 'string' && shot.director.revealDirection.length > 0));
  assert.ok(
    shots.some((shot) => (
      shot.scriptRole === 'body'
      && typeof shot.scriptExcerpt === 'string'
      && shot.scriptExcerpt.length > 0
      && typeof shot.scriptSourceText === 'string'
      && shot.scriptSourceText.length > 0
    )),
    'expected body scenes to keep script binding metadata',
  );
  assert.ok(
    shots.some((shot) => typeof shot.storyboardCueZh === 'string' && shot.storyboardCueZh.length > 0),
    'expected scene planner to emit storyboard cue text from narration',
  );
});

test('step 5 scene prompts stay in 16:9 widescreen mode and retain sceneFamily', async () => {
  disableWorkflowLlm();

  const step4 = await generateWorkflowStep({
    stepId: 4,
    ...buildBaseInput(),
  });

  const step5 = await generateWorkflowStep({
    stepId: 5,
    ...buildBaseInput(),
    shotsState: step4.payload.shots,
    pipelineState: {
      ...buildBaseInput().pipelineState,
      scenePlan: step4.payload.scenePlan,
      templateCatalog: step4.payload.templateCatalog,
    },
  });

  const prompts = step5.payload?.prompts?.byShotId || {};
  const promptEntries = Object.values(prompts);
  const shotEntries = Object.fromEntries((step4.payload?.shots || []).map((shot) => [shot.id, shot]));

  assert.equal(step5.resolvedSkill?.skillId, 'video-pipeline-scene-prompts');
  assert.equal(promptEntries.length, step4.payload.shots.length);
  assert.ok(promptEntries.every((item) => typeof item.sceneFamily === 'string' && item.sceneFamily.length > 0));
  assert.ok(promptEntries.every((item) => item.canvasRatio === '16:9'));
  assert.ok(promptEntries.every((item) => Number(item.canvasWidth) === 1920 && Number(item.canvasHeight) === 1080));
  assert.ok(promptEntries.every((item) => String(item.prompt || item.promptZh || '').includes('16:9')));
  assert.ok(promptEntries.every((item) => typeof item.text === 'string' && item.text.length > 0));
  assert.ok(promptEntries.every((item) => typeof item.scriptExcerpt === 'string' && item.scriptExcerpt.length > 0));
  assert.ok(promptEntries.every((item) => typeof item.scriptSourceText === 'string' && item.scriptSourceText.length > 0));
  assert.ok(promptEntries.every((item) => typeof item.storyboardCueZh === 'string' && item.storyboardCueZh.length > 0));
  assert.ok(promptEntries.every((item) => String(item.promptZh || '').includes('口播原句')));
  assert.ok(
    Object.entries(prompts).every(([shotId, item]) => item.scriptExcerpt === shotEntries[shotId]?.scriptExcerpt),
    'expected prompt entries to preserve shot-level script excerpts',
  );
});

test('step 4 honors mechanismDepth visual hints and emits differentiated visual props', async () => {
  disableWorkflowLlm();

  const input = buildBaseInput();
  input.pipelineState.copy.body = [
    {
      id: 'copy-1',
      label: '机制拆解',
      text: '这里重点不是结果，而是它怎么把多段任务串成一条链路，先理解输入，再分配工具，再回收结果。',
      sceneIntent: '让用户看到任务链路是怎么被串起来的',
      evidenceAnchor: '流程链路',
      keywords: ['任务链路', '工具调度', '结果回收'],
      dataPoints: ['输入', '调度', '回收'],
      mechanismDepth: {
        level: 'deep',
        explains: 'HOW',
        technicalTerms: ['agent', 'router'],
        analogy: '像车间调度',
        visualHint: 'pipeline-flow',
      },
    },
    {
      id: 'copy-2',
      label: '关系网络',
      text: '真正有价值的是上下文记忆和知识召回连在一起，前面拿到的信息会继续影响后面的判断。',
      sceneIntent: '让用户理解记忆关系网络在持续生长',
      evidenceAnchor: '上下文记忆',
      keywords: ['上下文记忆', '知识召回', '关系网络'],
      dataPoints: ['记忆', '召回', '判断'],
      mechanismDepth: {
        level: 'deep',
        explains: 'WHY',
        technicalTerms: ['context', 'retrieval'],
        analogy: '像不断扩展的脑图',
        visualHint: 'memory-graph',
      },
    },
    {
      id: 'copy-3',
      label: '命令落地',
      text: '最后一层不是抽象能力，而是真的把命令跑起来，终端日志和执行结果会直接暴露它有没有完成闭环。',
      sceneIntent: '让程序员看到它到底有没有真正跑起来',
      evidenceAnchor: '终端日志',
      keywords: ['命令执行', '终端日志', '运行结果'],
      dataPoints: ['pnpm test', 'exit 0'],
    },
  ];

  const result = await generateWorkflowStep({
    stepId: 4,
    ...input,
  });

  const shots = result.payload?.shots || [];
  const pipelineShot = shots.find((shot) => shot.scriptBlockId === 'copy-1');
  const memoryShot = shots.find((shot) => shot.scriptBlockId === 'copy-2');
  const terminalShot = shots.find((shot) => shot.scriptBlockId === 'copy-3');

  assert.equal(pipelineShot?.sceneFamily, 'pipeline-flow');
  assert.equal(memoryShot?.sceneFamily, 'memory-graph');
  assert.equal(terminalShot?.sceneFamily, 'terminal');
  assert.equal(pipelineShot?.visual?.props?.scriptBlockLabel, pipelineShot?.scriptBlockLabel);
  assert.equal(memoryShot?.visual?.props?.layout, 'stack');
  assert.ok(Array.isArray(terminalShot?.visual?.props?.outputs));
  assert.equal(pipelineShot?.director?.cameraMotion, 'pan-y');
  assert.equal(memoryShot?.director?.revealDirection, 'left');
  assert.equal(terminalShot?.director?.cameraMotion, 'pan-y');
});

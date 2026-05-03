process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildUltimateProjectConfig} = require('../../scripts/lib/index.js');

const buildProject = (middleShot) => ({
  projectId: 'adapter-spec',
  title: 'Adapter Spec',
  template: 'ultimate',
  visualSystem: 'ultimate-1080p',
  render: {
    fps: 30,
    width: 1920,
    height: 1080,
  },
  shots: [
    {
      id: 'shot-01',
      title: '开场',
      narration: 'Kimi K2.6 开源+代码能力，第一次真正给 GPT 形成了正面压力。',
      durationSeconds: 4,
    },
    middleShot,
    {
      id: 'shot-03',
      title: '结尾',
      narration: 'K2.6的代码能力、13小时连续编码、300子Agent调度，你最看重哪个？',
      durationSeconds: 4,
    },
  ],
});

test('number-strip scenes remove compacted duplicate labels', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '竞品反常识',
      type: '对比',
      narration:
        "很多人以为国产代码模型不如GPT，实际上K2.6在SWE-Bench Pro、Humanity's Last Exam等基准测试里持平或优于GPT-5.4。开源模型第一次在代码能力上和闭源顶级模型站在同一档。",
      durationSeconds: 10,
      dataPoints: [
        '很多人以为国产代码模型不如GPT',
        "实际上K2.6在SWE-Bench Pro、Humanity's Last Exam等基准测试里持平或优于GPT-5.4",
        '开源模型第一次在代码能力上和闭源顶级模型站在同一档',
        '实际上K2.6在SWE-Bench Pro、Humanity\'s Last Exam等基准测试里持平或优于GPT-5.4……',
      ],
      imageUrl: '/assets/demo/number-strip.png',
      comparisons: [{left: '旧讲法', right: '当前方案'}],
    }),
  );

  const scene = config.scenes[1];
  const labels = scene.data.items.map((item) => item.label);
  const tags = scene.data.items.map((item) => item.tag);

  assert.equal(scene.family, 'number-strip');
  assert.equal(scene.mediaSrc, '/assets/demo/number-strip.png');
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.some((item) => item.includes('基准实测')));
  assert.equal(scene.data.summary, '开源模型第一次在代码能力上和闭源顶级模型站在同一档');
  assert.ok(tags.every(Boolean));
  assert.ok(scene.data.items.some((item) => Array.isArray(item.chips) && item.chips.length > 0));
  assert.ok(scene.data.items.every((item) => ['wide', 'regular'].includes(item.layout)));
});

test('code scenes render English JSON facts for workflow evidence', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '代入场景',
      type: '案例',
      narration:
        '想象一下：你是个全栈开发者，平时一个功能模块要2天，用K2.6辅助编程，1天搞定，还能同时调度子Agent处理测试和部署。开发者真正在乎的不是参数，是能不能解决真实问题。',
      durationSeconds: 12,
      dataPoints: [
        '你是个全栈开发者',
        '平时一个功能模块要2天',
        '用K2.6辅助编程',
        '1天搞定',
        '还能同时调度子Agent处理测试和部署',
      ],
    }),
  );

  const scene = config.scenes[1];
  const lineTexts = scene.data.lines.map((line) => line.text).join('\n');

  assert.equal(scene.family, 'code');
  assert.match(lineTexts, /"scenario":/);
  assert.match(lineTexts, /"baseline":/);
  assert.ok(/"result":|"parallelTasks":/.test(lineTexts));
  assert.ok(!/"场景":|"原流程":|"提效结果":/.test(lineTexts));
  assert.equal(scene.data.filename, 'workflow-facts.json');
  assert.equal(scene.data.footer, '开发者真正在乎的不是参数，是能不能解决真实问题');
});

test('cta scenes extract highlights and prioritize the question as heading', () => {
  const config = buildUltimateProjectConfig({
    ...buildProject({
      id: 'shot-02',
      title: '中段',
      narration: '中段说明。',
      durationSeconds: 4,
    }),
    shots: [
      {
        id: 'shot-01',
        title: '开场',
        narration: '开场。',
        durationSeconds: 4,
      },
      {
        id: 'shot-02',
        title: '收尾互动',
        narration: 'K2.6的代码能力、13小时连续编码、300子Agent调度，你最看重哪个？评论区说说，下期拆。',
        durationSeconds: 5,
        dataPoints: ['K2.6的代码能力', '13小时连续编码', '300子Agent调度'],
        imageUrl: '/assets/demo/cta.png',
      },
    ],
  });

  const scene = config.scenes[1];

  assert.equal(scene.family, 'cta');
  assert.equal(scene.mediaSrc, '/assets/demo/cta.png');
  assert.equal(scene.data.heading, '你最看重哪个');
  assert.deepEqual(scene.data.highlights, ['K2.6的代码能力', '13小时连续编码', '300子Agent调度']);
});

test('compare-board scenes use structured comparisons when comparison pairs exist', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '正面对比',
      narration: '把旧工作流和 K2.6 工作流并排看，差异才会一眼看明白。',
      durationSeconds: 8,
      dataPoints: ['开发周期', '并行能力', '稳定性'],
      comparisons: [
        {label: '开发周期', left: '一个模块 2 天', right: '一个模块 1 天'},
        {label: '并行能力', left: '单线程推进', right: '测试部署并行'},
      ],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'compare-board');
  assert.equal(scene.data.leftTitle, '旧方案');
  assert.equal(scene.data.rightTitle, '当前方案');
  assert.equal(scene.data.rows.length, 2);
  assert.deepEqual(scene.data.rows[0], {
    label: '开发周期',
    left: '一个模块 2 天',
    right: '一个模块 1 天',
    accent: scene.data.rows[0].accent,
  });
});

test('timeline scenes are inferred for release chronology segments', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '发布时间线',
      narration:
        '4月16日第一波消息出现，4月18日 benchmark 开始扩散，4月20日开发者案例落地，4月22日舆论进入主叙事。',
      durationSeconds: 9,
      dataPoints: ['4月16日第一波消息出现', '4月18日 benchmark 开始扩散', '4月20日开发者案例落地', '4月22日舆论进入主叙事'],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'timeline');
  assert.ok(scene.data.items.length >= 3);
  assert.ok(scene.data.items.some((item) => item.label === '4月16日'));
});

test('evidence-wall scenes collect proof cards for source-heavy narration', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '证据层',
      narration:
        '不是喊口号，是公开 benchmark、GitHub 开源、HLE 和 SWE-Bench Pro 这些证据一起把故事撑起来。',
      durationSeconds: 8,
      dataPoints: ['公开 benchmark', 'GitHub 开源', 'HLE', 'SWE-Bench Pro'],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'evidence-wall');
  assert.ok(scene.data.cards.length >= 2);
  assert.ok(scene.data.cards.some((card) => Array.isArray(card.chips) && card.chips.includes('HLE')));
});

test('architecture-map scenes can be forced and build node structures', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      family: 'architecture-map',
      title: '多 Agent 系统',
      narration:
        '整个系统由搜索入口、事实解析、分镜规划、口播层和渲染层组成，本质上是一个 agent orchestration stack。',
      durationSeconds: 10,
      dataPoints: ['搜索入口', '事实解析', '分镜规划', '口播层', '渲染层'],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'architecture-map');
  assert.equal(scene.data.centerTitle, '多 Agent 系统');
  assert.ok(scene.data.nodes.length >= 4);
});

test('scene copy stays grounded in narration when planner titles and visual summaries drift', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      family: 'architecture-map',
      title: '让观众意识到gpt5不是性能提升的版本号，而是…',
      displayTitle: 'gpt5不是性能迭代，而是工作模式变了',
      narration:
        'gpt5的核心变化不是参数规模，而是AI从被动回答升级为主动规划、调用工具、执行多步骤任务。',
      displaySummary:
        'gpt5的核心变化不是参数规模，而是AI从被动回答升级为主动规划、调用工具、执行多步骤任务。',
      visualSummaryZh:
        '本shot围绕「架构质变」展开。采用 architecture-map 风格，以 GPT-5 为核心节点辐射四个能力点。',
      dataPoints: ['Agent规划', '工具调用', '多步骤执行', '结果验证'],
      displayPoints: ['主动规划', '调用工具', '多步骤任务', '结果验证'],
      durationSeconds: 9,
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'architecture-map');
  assert.equal(scene.data.heading, 'gpt5的核心变化不是参数规模');
  assert.equal(scene.data.centerTitle, 'gpt5不是性能迭代，而是工作模式变了');
  assert.match(scene.subtitle, /主动规划/);
  assert.doesNotMatch(scene.data.heading, /让观众意识到|本shot围绕/);
  assert.ok(scene.data.nodes.some((node) => /主动规划|调用工具|多步骤任务/.test(node.label)));
});

test('benchmark-chart scenes are inferred for benchmark-heavy numeric comparisons', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '基准对比',
      narration:
        '这次别空聊热度，直接看 benchmark。SWE-Bench Pro 79%，HLE 71%，对照组 64%，这才是最有压力的地方。',
      durationSeconds: 9,
      dataPoints: ['SWE-Bench Pro 79%', 'HLE 71%', '对照组 64%', '公开 benchmark'],
      comparisons: [
        {label: 'SWE-Bench Pro', left: '64%', right: '79%'},
        {label: 'HLE', left: '58%', right: '71%'},
      ],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'benchmark-chart');
  assert.ok(scene.data.items.length >= 2);
  assert.ok(scene.data.primaryLabel);
  assert.ok(scene.data.secondaryLabel);
});

test('data-stream scenes are inferred for realtime throughput narration', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      title: '实时吞吐',
      narration:
        '现在看的不是静态结果，而是实时数据流：tokens/s 往上冲，QPS 在变，吞吐和延迟一起盯，才知道系统稳不稳。',
      durationSeconds: 8,
      dataPoints: ['tokens/s 128', 'QPS 42', '延迟 1.2 秒', '实时数据流'],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'data-stream');
  assert.ok(scene.data.items.length >= 2);
});

test('glossary-term scenes can be forced and build definition panels', () => {
  const config = buildUltimateProjectConfig(
    buildProject({
      id: 'shot-02',
      family: 'glossary-term',
      title: 'RAG',
      narration: 'RAG 本质上指的是检索增强生成，不是单纯搜索，而是先拿外部知识再生成答案。',
      durationSeconds: 8,
      dataPoints: ['检索增强生成', '先检索再生成', '外部知识'],
      keywords: ['RAG', 'retrieval', 'generation'],
    }),
  );

  const scene = config.scenes[1];

  assert.equal(scene.family, 'glossary-term');
  assert.equal(scene.data.term, 'RAG');
  assert.ok(scene.data.related.length >= 2);
});

test('family routing ignores visual tool keywords and restores compare scenes', () => {
  const config = buildUltimateProjectConfig({
    projectId: 'gpt55-worker-impact',
    title: 'GPT-5.5 Family Routing',
    template: 'ultimate',
    visualSystem: 'ultimate-1080p',
    render: {
      fps: 30,
      width: 1920,
      height: 1080,
    },
    shots: [
      {
        id: 'shot-01',
        title: '开场结论',
        narration: 'GPT-5.5发布，打工人的好日子到头了，这次真不是狼来了。',
        durationSeconds: 4,
      },
      {
        id: 'shot-02',
        title: '震撼发布',
        narration: 'GPT-5.5前脚刚发，后脚一堆公司已经开始用它替代初级岗位了。不是试点，是直接砍人。这次真不是狼来了，狼已经进门了。',
        durationSeconds: 10,
        dataPoints: ['GPT-5.5前脚刚发', '后脚一堆公司已经开始用它替代初级岗位了', '这次真不是狼来了'],
      },
      {
        id: 'shot-03',
        title: '能力痛点',
        narration: '它能帮你做方案，写代码、分析数据、生成报告。以前要一个团队干的活，现在一个GPT-5.5全包了。',
        durationSeconds: 10,
        dataPoints: ['写代码、分析数据、生成报告', '以前要一个团队干的活', '现在一个GPT-5.5全包了'],
        visualFocusZh: 'One person with six AI tools working in sync, warm home office glow',
        visualSummaryZh: '画面重点是 One person with six AI tools working in sync, warm home office glow',
      },
      {
        id: 'shot-04',
        title: '竞品反常识',
        type: '对比',
        narration: '很多人觉得AI替代还早，但GPT-5.5这次直接把成绩单亮出来。不是要取代你，是已经开始了。',
        durationSeconds: 10,
        dataPoints: ['很多人觉得AI替代还早', '但GPT-5.5这次直接把成绩单亮出来', '不是要取代你，是已经开始了'],
        comparisonSummaryZh: '对比关系：旧讲法 vs 当前方案',
        comparisons: [{left: '旧讲法', right: '当前方案'}],
      },
      {
        id: 'shot-05',
        title: '代入场景',
        type: '案例',
        narration: '一个普通文案，用GPT-5.5之后每天多出三小时。一个小电商团队，三个人干了原来十个人的活。',
        durationSeconds: 10,
        dataPoints: ['一个普通文案', '用GPT-5.5之后每天多出三小时', '一个小电商团队'],
      },
      {
        id: 'shot-06',
        title: '互动收束',
        narration: '评论区说说，你的工作有没有被它影响到？',
        durationSeconds: 4,
      },
    ],
  });

  assert.deepEqual(
    config.scenes.slice(0, 4).map((scene) => scene.family),
    ['hero', 'timeline', 'feature-rail', 'compare-board'],
  );
  assert.ok(['metrics', 'tag-matrix'].includes(config.scenes[4].family));
  assert.equal(config.scenes[4].family === 'feature-rail', false);
  assert.equal(new Set(config.scenes.slice(1, -1).map((scene) => scene.family)).size, 4);
});

test('adjacent middle scenes avoid repeating the same auto-inferred family', () => {
  const config = buildUltimateProjectConfig({
    projectId: 'repeat-guard',
    title: 'Repeat Guard',
    template: 'ultimate',
    visualSystem: 'ultimate-1080p',
    render: {
      fps: 30,
      width: 1920,
      height: 1080,
    },
    shots: [
      {
        id: 'shot-01',
        title: '开场',
        narration: '开场。',
        durationSeconds: 4,
      },
      {
        id: 'shot-02',
        title: '系统架构',
        narration: '这套系统分成4个模块、2层结构、3个Agent和1个router，本质上是完整的 orchestration stack。',
        durationSeconds: 8,
        dataPoints: ['4个模块', '2层结构', '3个Agent', '1个router'],
      },
      {
        id: 'shot-03',
        title: '系统扩容',
        narration: '扩容后还是4个模块、2层结构、3个Agent和1个router，但更关心4项指标、2段耗时、3个瓶颈。',
        durationSeconds: 8,
        dataPoints: ['4项指标', '2段耗时', '3个瓶颈', '4个模块'],
      },
      {
        id: 'shot-04',
        title: '结尾',
        narration: '结尾。',
        durationSeconds: 4,
      },
    ],
  });

  assert.deepEqual(
    config.scenes.map((scene) => scene.family),
    ['hero', 'architecture-map', 'metrics', 'cta'],
  );
});

test('global family planning maximizes middle-scene template diversity', () => {
  const config = buildUltimateProjectConfig({
    projectId: 'diversity-pass',
    title: 'Diversity Pass',
    template: 'ultimate',
    visualSystem: 'ultimate-1080p',
    render: {
      fps: 30,
      width: 1920,
      height: 1080,
    },
    shots: [
      {
        id: 'shot-01',
        title: '开场',
        narration: '开场。',
        durationSeconds: 4,
      },
      {
        id: 'shot-02',
        title: '发布时间线',
        narration: '前脚发布，后脚落地，第三天开始扩散，第四天进入主叙事。',
        durationSeconds: 8,
        dataPoints: ['前脚发布', '后脚落地', '第三天开始扩散', '第四天进入主叙事'],
      },
      {
        id: 'shot-03',
        title: '能力拆解',
        narration: '它能写代码、分析数据、生成报告，一个人顶一个团队。',
        durationSeconds: 8,
        dataPoints: ['写代码', '分析数据', '生成报告', '一个人顶一个团队'],
      },
      {
        id: 'shot-04',
        title: '反常识对比',
        type: '对比',
        narration: '很多人觉得替代还早，但现在已经开始了。',
        durationSeconds: 8,
        dataPoints: ['很多人觉得替代还早', '现在已经开始了', '旧讲法', '当前方案'],
        comparisonSummaryZh: '旧讲法 vs 当前方案',
        comparisons: [{left: '旧讲法', right: '当前方案'}],
      },
      {
        id: 'shot-05',
        title: '结果量化',
        narration: '普通文案每天多出三小时，小团队三个人干十个人的活。',
        durationSeconds: 8,
        dataPoints: ['每天多出三小时', '三个人干十个人的活', '效率更高', '不那么累'],
      },
      {
        id: 'shot-06',
        title: '收尾',
        narration: '收尾。',
        durationSeconds: 4,
      },
    ],
  });

  const middleFamilies = config.scenes.slice(1, -1).map((scene) => scene.family);

  assert.equal(new Set(middleFamilies).size, middleFamilies.length);
  assert.deepEqual(
    config.scenes.slice(0, 4).map((scene) => scene.family),
    ['hero', 'timeline', 'feature-rail', 'compare-board'],
  );
  assert.ok(['metrics', 'tag-matrix'].includes(config.scenes[4].family));
});

test('family planner avoids three consecutive structure-layer families', () => {
  const config = buildUltimateProjectConfig({
    projectId: 'rhythm-guard',
    title: 'Rhythm Guard',
    template: 'ultimate',
    visualSystem: 'ultimate-1080p',
    render: {
      fps: 30,
      width: 1920,
      height: 1080,
    },
    shots: [
      {id: 'shot-01', title: '开场', narration: '开场。', durationSeconds: 4},
      {
        id: 'shot-02',
        title: '流程变化',
        narration: '从单轮回答到多步骤任务执行，这是流程变化。',
        durationSeconds: 7,
        dataPoints: ['单轮回答', '多步骤任务执行', '流程变化'],
      },
      {
        id: 'shot-03',
        title: '系统架构',
        narration: '系统分成 Agent、router、memory、toolchain 四层。',
        durationSeconds: 7,
        dataPoints: ['Agent', 'router', 'memory', 'toolchain'],
      },
      {
        id: 'shot-04',
        title: '记忆连接',
        narration: '记忆图谱把上下文、知识库、召回链路串起来。',
        durationSeconds: 7,
        dataPoints: ['上下文', '知识库', '召回链路', 'graph'],
      },
      {id: 'shot-05', title: '结尾', narration: '结尾。', durationSeconds: 4},
    ],
  });

  const middleFamilies = config.scenes.slice(1, -1).map((scene) => scene.family);
  assert.notDeepEqual(middleFamilies, ['step-flow', 'architecture-map', 'memory-graph']);
});

test('feature-rail grammar stays on burst spread even with flow wording', async () => {
  const {resolveShotGrammar} = await import(path.resolve(__dirname, '../../src/data/shotGrammar.ts'));
  const grammar = resolveShotGrammar({
    family: 'feature-rail',
    shotIndex: 2,
    totalShots: 6,
    numericFields: [],
    sceneIntent: '代码能力和Agent集群才是关键',
    storyboardCueZh: '代码能力和Agent集群才是关键。想象一下：写代码、跑测试、修复bug，全流程闭环。',
    scriptBlockLabel: 'shot-03',
    type: 'feature-rail',
  });

  assert.equal(grammar.archetype, 'burst spread');
  assert.equal(grammar.dataEvent, 'burst-spread');
});

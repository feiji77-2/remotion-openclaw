process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {buildUltimateProjectConfig} = require('../../scripts/lib/ultimate-project-adapter.js');

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
  assert.ok(scene.data.items.some((item) => item.layout === 'wide'));
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

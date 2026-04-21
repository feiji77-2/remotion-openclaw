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

test('code scenes use narration facts instead of generic scene/claim/proof keys', () => {
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
  assert.match(lineTexts, /"场景":/);
  assert.match(lineTexts, /"原流程":/);
  assert.ok(/"提效结果":|"并行处理":/.test(lineTexts));
  assert.ok(!/"scene":|"claim":|"proof":/.test(lineTexts));
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

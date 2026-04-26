process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {__testUtils} = require('../api/server');

const REMOTION_ROOT = path.resolve(__dirname, '../..');
const EXPECTED_FAMILIES = [
  'hero',
  'feature-rail',
  'focus',
  'step-flow',
  'timeline',
  'compare-board',
  'number-strip',
  'terminal',
  'evidence-wall',
  'tag-matrix',
  'code',
  'architecture-map',
  'metrics',
  'data-stream',
  'memory-graph',
  'pipeline-flow',
  'benchmark-chart',
  'quote-highlight',
  'glossary-term',
  'cta',
];

function importRemotionModule(relativePath) {
  return import(pathToFileURL(path.join(REMOTION_ROOT, relativePath)).href);
}

test('inline image generation emits one stable asset per shot', async () => {
  const projectId = `contract-media-${Date.now()}`;
  const projectAssetDir = path.join(__testUtils.ASSETS_DIR, projectId);
  const imageJob = __testUtils.createImageJob({
    projectId,
    prompts: {
      byShotId: {
        intro: {
          shotTitle: '开场判断',
          visualSummaryZh: '蓝色科技背景里突出 GPT-5.5 对工作流的改变',
          visualFocusZh: '中心标题 + 发光边框',
          dataPoints: ['工作流升级', '多步骤执行'],
        },
        compare: {
          shotTitle: '能力对比',
          visualSummaryZh: '左右对比 GPT-5.5 与上一代模型的真实差异',
          visualFocusZh: '双栏对比',
          dataPoints: ['代码稳定性', '工具调用'],
        },
      },
    },
    shots: [
      {id: 'intro', title: '开场判断', narration: '先讲结论，再讲工作流'},
      {id: 'compare', title: '能力对比', narration: '再讲代码和工具调用的变化'},
    ],
  });

  try {
    await __testUtils.runInlineImageGeneration(imageJob.jobId);
    const storedJob = __testUtils.readImageJob(imageJob.jobId);

    assert.equal(storedJob?.status, 'done');
    assert.equal(storedJob?.completed, 2);
    assert.equal(storedJob?.images?.length, 2);
    assert.deepEqual(Object.values(storedJob?.byShotStatus || {}), ['done', 'done']);

    for (const image of storedJob.images) {
      assert.match(image.path, new RegExp(`^/assets/${projectId}/images/[a-z0-9-]+\\.svg$`));
      const absPath = path.join(projectAssetDir, 'images', path.basename(image.path));
      assert.ok(fs.existsSync(absPath), `expected generated asset to exist: ${absPath}`);
      const svg = fs.readFileSync(absPath, 'utf8');
      assert.match(svg, /^<svg[\s>]/);
    }
  } finally {
    fs.rmSync(__testUtils.getImageJobPath(imageJob.jobId), {force: true});
    fs.rmSync(projectAssetDir, {recursive: true, force: true});
  }
});

test('all-families example remains the 20-template render contract source', async () => {
  const configPath = path.join(REMOTION_ROOT, 'examples', 'ultimate-scene-all-families.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const {summarizeUltimateConfig, validateUltimateConfig} = await importRemotionModule('scripts/lib/ultimate-scene-config.mjs');

  const errors = validateUltimateConfig(config);
  const summary = summarizeUltimateConfig(config);
  const families = summary.families.map((item) => item.family);

  assert.deepEqual(errors, []);
  assert.equal(summary.sceneCount, 20);
  assert.deepEqual(families, EXPECTED_FAMILIES);
  assert.ok(summary.durationInFrames > 0);
  assert.ok(summary.durationInSeconds > 0);
});

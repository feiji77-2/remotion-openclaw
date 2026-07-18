#!/usr/bin/env node

import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const positional = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  const previous = args[index - 1];
  return !previous?.startsWith('--');
});

const title = valueFor('--title') ?? positional[0];
if (!title) {
  console.error('Usage: npm run production:scaffold -- "选题标题" [--link https://example.com] [--id project-id]');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const slugify = (value) => {
  const ascii = String(value)
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 48);
  return ascii || 'topic';
};

const productionId = (valueFor('--id') ?? `${today}-${slugify(title)}`)
  .replace(/[^A-Za-z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 96);
const productionDir = path.resolve(PROJECT_ROOT, valueFor('--out', 'projects'), productionId);
const publicPrefix = `projects/${productionId}`;
const publicDir = path.resolve(PROJECT_ROOT, 'public', publicPrefix);
const primaryLink = valueFor('--link');

if (existsSync(productionDir)) {
  throw new Error(`Production directory already exists: ${productionDir}`);
}

const writeJson = async (file, value) => {
  await fs.writeFile(path.join(productionDir, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

await fs.mkdir(productionDir, {recursive: true});
await fs.mkdir(path.join(publicDir, 'screenshots'), {recursive: true});
await fs.mkdir(path.join(publicDir, 'logos'), {recursive: true});
await fs.mkdir(path.join(publicDir, 'diagrams'), {recursive: true});
await fs.mkdir(path.join(publicDir, 'audio'), {recursive: true});

await writeJson('brief.json', {
  productionId,
  title,
  primaryLink,
  platform: 'douyin',
  format: {width: 1920, height: 1080, fps: 30, maxDurationSeconds: 180},
  audience: ['技术小白', 'AI 从业者', '创业者', '产品经理', '老板/投资人'],
  contentType: '技术教程',
  tone: '技术布道',
  structure: '痛点 -> 方案 -> 3 步教程 -> 注意事项 -> 结论',
  visualStyle: {
    palette: '蓝绿 AI 感',
    subtitles: '固定字幕样式',
    branding: '第一阶段不做强品牌化',
  },
  research: {
    sourcePriority: ['官方文档/官网', 'GitHub/论文/发布页', '权威媒体', '社交平台讨论'],
    socialPolicy: '只当线索，不当证据',
    allowLoggedInBrowserScreenshots: true,
  },
  viewpointCandidates: [
    {id: 'view-1', claim: '这个工具真正改变的是工作流，不只是生成内容。', whyItMatters: '适合做技术布道主线。'},
    {id: 'view-2', claim: '它的价值取决于能否接进真实业务，而不是演示效果。', whyItMatters: '适合强调落地。'},
    {id: 'view-3', claim: '普通人上手的门槛正在降低，但组织使用的门槛正在转移。', whyItMatters: '适合给创业者和管理者判断。'},
  ],
  selectedViewpointId: null,
});

await writeJson('script-pack.json', {
  productionId,
  title,
  hook: '先写一句能让观众停下来的开头钩子。',
  selectedViewpoint: '',
  pain: '写清楚旧方式的问题。',
  solution: '写清楚新工具或新技术的解决方案。',
  steps: [
    {label: '第一步', detail: '入口、准备或安装。'},
    {label: '第二步', detail: '核心操作。'},
    {label: '第三步', detail: '输出结果或接入工作流。'},
  ],
  cautions: [
    {label: '注意事项', value: '写清楚限制、成本或误区。'},
  ],
  codeSnippets: [
    {label: 'flow', value: 'topic -> script -> assets -> project.json'},
  ],
  takeaway: '写一句能收束观点的结尾金句。',
  spokenScript: '',
});

await writeJson('asset-pack.json', {
  productionId,
  publicPathPrefix: publicPrefix,
  strategy: {
    missingAssetPolicy: '用 Logo + 解释型图表降级，并提醒补图',
    diagramPolicy: '根据文案自动选择流程图、对比图、三步图、架构图、数据图或时间线',
    sourceScreenshotPolicy: '只截关键段落',
  },
  assets: [
    {id: 'product-logo', kind: 'image', src: `${publicPrefix}/logos/product-logo.png`, required: false, role: 'logo', status: 'missing'},
    {id: 'source-excerpt', kind: 'image', src: `${publicPrefix}/screenshots/source-excerpt.png`, required: false, role: 'news-source-excerpt', status: 'missing'},
    {id: 'workflow-diagram', kind: 'image', src: `${publicPrefix}/diagrams/workflow-diagram.png`, required: false, role: 'explanatory-diagram', status: 'planned'},
  ],
  sceneAssetPlan: {
    opening: ['product-logo'],
    'pain-solution': ['source-excerpt'],
    steps: ['workflow-diagram'],
  },
  missingAssets: [
    {assetId: 'product-logo', reason: '等待官网或产品页截图'},
    {assetId: 'source-excerpt', reason: '等待新闻原文关键段落截图'},
  ],
});

await fs.writeFile(path.join(productionDir, 'sources.md'), `# Sources\n\n| Priority | Source | Role | Status |\n| --- | --- | --- | --- |\n| 官方文档/官网 | ${primaryLink ?? '待补充'} | 主来源 | 待核验 |\n`, 'utf8');

await fs.writeFile(path.join(productionDir, 'production-log.md'), `# PRODUCTION_LOG\n\n## Topic\n\n- productionId: ${productionId}\n- title: ${title}\n- primaryLink: ${primaryLink ?? '待补充'}\n- platform: 抖音\n- format: 1920x1080 / 30fps\n\n## Decisions\n\n- contentType: 技术教程\n- structure: 痛点 -> 方案 -> 3 步教程 -> 注意事项 -> 结论\n- selectedViewpoint: 待选择\n- visualStyle: 蓝绿 AI 感\n- brand: 第一阶段不做强品牌化\n\n## Checkpoints\n\n- [ ] 选题确认\n- [ ] 观点确认\n- [ ] 文案确认\n- [ ] 素材确认\n- [ ] still 确认\n- [ ] MP4 确认\n\n## Render\n\n\`\`\`bash\nnpm run production:build-project -- ${path.relative(PROJECT_ROOT, productionDir)}\nnpm run project:check -- ${path.relative(PROJECT_ROOT, productionDir)}/project.json\nnpm run project:still -- ${path.relative(PROJECT_ROOT, productionDir)}/project.json --frame 30\nnpm run project:render -- ${path.relative(PROJECT_ROOT, productionDir)}/project.json --out out/${productionId}.mp4\n\`\`\`\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  productionId,
  productionDir,
  publicDir,
  next: [
    `npm run production:check -- ${path.relative(PROJECT_ROOT, productionDir)}`,
    `npm run production:build-project -- ${path.relative(PROJECT_ROOT, productionDir)}`,
  ],
}, null, 2));

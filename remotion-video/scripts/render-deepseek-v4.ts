/**
 * Render DeepSeek V4 storyboard — 8 scenes as still frames (技术深挖 × B结构).
 * Usage: npx tsx scripts/render-deepseek-v4.ts
 */
import {execSync} from 'child_process';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {existsSync, mkdirSync, writeFileSync} from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, '__snapshots__', 'deepseek-v4');
if (!existsSync(OUT)) mkdirSync(OUT, {recursive: true});

const scenes = [
  {
    id: 'shot-01', family: 'hero',
    subtitle: "DeepSeek V4 发布。这次不是简单的参数堆叠——新架构、新训练策略、新推理效率曲线。我们从 Benchmark 和数据说起。",
    durationInFrames: 300, frame: 150,
    data: {
      kicker: 'DeepSeek / 技术深挖 / 开场',
      title: 'DeepSeek V4：先看 Benchmark，再谈架构',
      subtitle: "新架构、新训练策略、新推理效率曲线。我们从数据说起。",
      badge: 'BENCHMARK FIRST', accent: 'cyan',
      visualStyle: 'morfeo',
      tag: 'DeepSeek / V4 / 技术分析', tagEmoji: '\u{1F4CA}',
      heroEmoji: '\u{1F4CA}', highlightedWord: 'Benchmark',
      lines: [
        'MMLU 89.7%、MATH 96.2%、HumanEval 91.5%。',
        '三项核心基准全部刷新，平均提升 12 个百分点。',
        '从 Benchmark 和数据说起。',
      ],
      brandIcon: 'github', brandLabel: 'OpenClaw',
    },
  },
  {
    id: 'shot-02', family: 'benchmark-chart',
    subtitle: "MMLU 89.7%、MATH 96.2%、HumanEval 91.5%。三项核心基准全部刷新，相比 V3 平均提升 12 个百分点。",
    durationInFrames: 360, frame: 180,
    data: {
      kicker: 'DeepSeek V4', heading: 'Benchmark 全面领先',
      summary: '三项全部刷新、全面超越前代',
      primaryLabel: 'DeepSeek V4', secondaryLabel: 'V3', accent: 'cyan',
      items: [
        {label: 'MMLU', primaryValue: '89.7%', secondaryValue: '82.1%', primaryRatio: 0.897, secondaryRatio: 0.821},
        {label: 'MATH', primaryValue: '96.2%', secondaryValue: '81.3%', primaryRatio: 0.962, secondaryRatio: 0.813},
        {label: 'HumanEval', primaryValue: '91.5%', secondaryValue: '72.8%', primaryRatio: 0.915, secondaryRatio: 0.728},
        {label: 'GSM8K', primaryValue: '95.8%', secondaryValue: '86.5%', primaryRatio: 0.958, secondaryRatio: 0.865},
      ],
    },
  },
  {
    id: 'shot-03', family: 'architecture-map',
    subtitle: "一切回到架构。V4 延续 MoE 路线，671B 总参数、每次推理只激活 37B。核心创新：Multi-Head Latent Attention，KV Cache 压缩 4 倍。",
    durationInFrames: 420, frame: 210,
    data: {
      kicker: 'DeepSeek V4',
      centerTitle: 'MoE + MLA 架构',
      centerDetail: '671B 总参数 / 37B 激活',
      accent: 'cyan',
      nodes: [
        {label: 'Attention', detail: 'Multi-Head Latent\n4x KV Cache 压缩', accent: 'cyan'},
        {label: 'FFN', detail: '8 Expert 路由\n稀疏激活', accent: 'purple'},
        {label: 'Router', detail: '动态负载均衡\n高效调度', accent: 'green'},
        {label: 'Train', detail: '4.5T tokens 预训练\n效率优先', accent: 'cyan'},
      ],
    },
  },
  {
    id: 'shot-04', family: 'compare-board',
    subtitle: "和 GPT-4 对比：参数量接近但激活参数仅 1/17，推理吞吐高出 3 倍，训练成本仅为 GPT-4 的 1/11。",
    durationInFrames: 360, frame: 180,
    data: {
      kicker: 'DeepSeek V4',
      title: 'V4 vs GPT-4：效率账本',
      subtitle: '不是堆算力的逻辑，是架构效率的胜利。',
      badge: 'EFFICIENCY', accent: 'cyan',
      leftTitle: 'V4', rightTitle: 'GPT-4',
      leftEyebrow: 'DeepSeek 最新旗舰', rightEyebrow: '闭源标杆',
      rows: [
        {left: '1T 总参数 / 37B 激活', right: '~1.7T 总参数 / ~1.7T 激活', detail: '激活参数'},
        {left: '3x 推理吞吐', right: '1x 基准', detail: '推理吞吐'},
        {left: '128K 上下文', right: '32K 上下文', detail: '窗口长度'},
        {left: '训练成本 1', right: '训练成本 11', detail: '训练成本比'},
      ],
    },
  },
  {
    id: 'shot-05', family: 'timeline',
    subtitle: "V2 到 V4，18 个月。2024 年初 V2 发布时还是追随者，V3 开源后在推理赛道站稳，V4 在架构和效率两个维度同时实现了超越。",
    durationInFrames: 360, frame: 180,
    data: {
      kicker: 'DeepSeek V4',
      title: '18 个月追上全球最强',
      subtitle: '从 V2 到 V4 的进化之路。',
      badge: 'TIMELINE', accent: 'cyan',
      items: [
        {label: '2024 Q1', detail: 'DeepSeek V2 发布', accent: 'cyan'},
        {label: '2024 Q3', detail: 'DeepSeek V3 开源', accent: 'cyan'},
        {label: '2025 Q1', detail: 'V4 研发启动', accent: 'cyan'},
        {label: '2025 Q2', detail: 'V4 正式发布', accent: 'green'},
      ],
    },
  },
  {
    id: 'shot-06', family: 'evidence-wall',
    subtitle: "开源社区的反应说明一切：GitHub 24 小时内 20K star，Hugging Face 下载量突破 150 万。",
    durationInFrames: 360, frame: 180,
    data: {
      kicker: 'DeepSeek V4', heading: '社区验证',
      summary: '开发者最敏感——谁真正好用，代码和数据不会说谎。',
      cards: [
        {source: 'GitHub', quote: '24 小时内 20K+ star，趋势榜第一', detail: '开源仓库', accent: 'cyan'},
        {source: 'Hugging Face', quote: '下载量突破 150 万次', detail: '模型下载', accent: 'purple'},
        {source: '开发者评价', quote: '「代码和数据不会说谎」', detail: '社区口碑', accent: 'green'},
      ],
    },
  },
  {
    id: 'shot-07', family: 'step-flow',
    subtitle: "权重已开源，API 已开放，Python 和 TypeScript SDK 都已支持。三行代码跑通第一个推理。",
    durationInFrames: 300, frame: 150,
    data: {
      kicker: 'DeepSeek V4', heading: '五分钟上手',
      summary: '权重开源 + API 开放 + SDK 支持，即刻可用。',
      steps: [
        {label: 'Step 1', detail: '注册 API Key'},
        {label: 'Step 2', detail: '安装 Python / TS SDK'},
        {label: 'Step 3', detail: '三行代码跑通推理'},
      ],
      accent: 'cyan',
    },
  },
  {
    id: 'shot-08', family: 'cta',
    subtitle: "DeepSeek V4 重新定义了开源模型的效率天花板。你准备用它试什么？",
    durationInFrames: 280, frame: 140,
    data: {
      kicker: 'DeepSeek V4',
      title: 'DeepSeek V4 已来。你准备用它试什么？',
      subtitle: '开源模型重新定义了效率天花板。',
      badge: 'CTA', accent: 'cyan',
    },
  },
];

let ok = 0, fail = 0;
for (const scene of scenes) {
  const pngName = `${scene.id}-${scene.family}.png`;
  const pngPath = join(OUT, pngName);

  const config = {
    title: 'DeepSeek V4 — 技术深挖',
    defaultTransition: false,
    scenes: [{
      id: scene.id,
      family: scene.family,
      subtitle: scene.subtitle,
      durationInFrames: scene.durationInFrames ?? 300,
      warm: true,
      showGrid: false,
      transition: {preset: 'lift', durationInFrames: 12},
      data: scene.data,
    }],
  };

  // Write props to temp file to avoid shell quoting issues with Chinese chars
  const propsFile = join(OUT, `.props-${scene.id}.json`);
  writeFileSync(propsFile, JSON.stringify({config}));

  console.log(`[${ok + 1}/${scenes.length}] ${scene.family}...`);
  try {
    execSync(
      `npx remotion still UltimateSceneTemplate --props="${propsFile}" --output="${pngPath}" --frame=${scene.frame}`,
      {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
    );
    console.log(`  \u2705 ${pngName}`);
    ok++;
  } catch (e: any) {
    console.error(`  \u274c ${e.stderr?.slice(-300) || e.message}`);
    fail++;
  }
  // Cleanup temp props file
  try { execSync(`rm "${propsFile}"`); } catch {}
}

console.log(`\nDone: ${ok} OK, ${fail} FAIL`);

// 构造 swiss-skill-spoken-v2.json —— 基于口播稿重新构建的 16-scene Swiss 分镜。
// 约束：fps=30, orientation=landscape, captionStyle=editorial, audio:{}（分镜图通路不依赖音频）。
// 字幕按中文 ~14 字/秒分摊时间，captionRange 连续且由字幕换算 durationInFrames（相差 ≤1 帧）。
// payload 全填非空字符串（避开"空串只在渲染期被拒"的坑）。

import {writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'examples', 'swiss-skill-spoken-v2.json');

const FPS = 30;
const CPS = 14; // 中文字/秒

// 句级字幕：把整段口播稿切成 22 句，每句配 startMs/endMs（ms）。
// 累积时间，按句长估算时长（每句最少 1100ms 保证可读，最少句末停顿 200ms）。
const sentences = [
  '你有没有发现，AI 给你的设计，一眼就能看出是 AI 做的？',
  '紫色渐变、居中布局，千篇一律，这些都是 AI 默认的平均审美。',
  '装一个 skill 就不一样了。',
  '大多数 AI 出图的问题，不是技术，是没有设计语言。',
  'Impeccable 把这些 AI 审美问题归纳成 37 条规则。',
  '视觉、字体、色彩、布局等八个类别，让人一眼认出 AI 出图的特征。',
  '它能实时检测设计里存在哪些反模式，并标注出来。',
  '左边是装上之后，右边是默认 AI 输出，同样的提示词，完全不同的结果。',
  '22000 star，是 AI 辅助设计弊装的第一个。',
  'skill Frontend Design 提供了六种鲜明的审美方向。',
  'Swiss 极简，RAW list 粗粝工业，Nordic 克制，Neo 赛博。',
  '不是让 AI 乱选风格，是让你主动锚定一个，AI 才能稳定输出有记忆点的界面。',
  '它内置了一份反模式清单，禁用英特尔字体，禁用紫色渐变，禁用居中堆叠。',
  '让 AI 从源头规避这些设计雷区，左边是装上之后，右边是没有 skill 的默认输出。',
  'UX Pro Max 把你每次设计时都要查的东西，全部内置进去了。',
  '161 套按行业划分的配色方案，67 种 UI 风格定义，57 个字体搭配，99 条 UX 指导原则。',
  '告诉它你在做什么产品，它直接给你一整套设计系统，颜色、字体、间距、无障碍标准。',
  '做官网，做工具，做作品集，每个场景都有对应的规则和反模式。',
  '每次开新项目，你有没有从零定义颜色变量、字体规则、组件规范，结果还是没行业感？',
  'Awesome Cloud Design 把 68 个品牌的设计系统打包进一个文件。',
  'Stripe 的极简兼容感，Linear 的工程美学，Vercel 的极致黑白，Recta 的精密渐变。',
  '以前 AI 帮设计师出图，现在更重要的是把审美判断变成可复用系统，装对 skill，AI 才有立场。',
];

// 估算每句时长（ms），并累积 startMs/endMs。
const captions = [];
let t = 0;
for (const s of sentences) {
  const len = s.length;
  // 句内预留 200ms 尾部静音（计入该句 dur），句与句首尾相接无间隙，避免 scene 间时间空洞。
  const core = Math.max(900, Math.round((len / CPS) * 1000));
  const dur = core + 200;
  const end = t + dur;
  captions.push({text: s, startMs: t, endMs: end, timestampMs: null, confidence: null});
  t = end; // 无句间停顿，紧接下一句
}
const totalMs = t;

// scene 定义：family + payload + 绑定哪几句字幕（captionIndex 范围 [start,end] 双闭）。
// 顺序对应口播稿推进：钩子 → 问题归因 → Impeccable → frontend-design → UX Pro Max → Awesome Cloud Design → 主张。
// captionIdx 使用 [start,end] 双闭索引，对应 captions 数组下标。
const sceneDefs = [
  // ===== intro 钩子（句 0）=====
  {
    id: 's01-hook', family: 'swiss-title', captions: [0, 0], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '01', total: 16, chapter: '钩子',
      title: 'AI 的设计，一眼能认',
      kicker: 'SWISS / 01',
      subtitle: '紫色渐变、居中布局、千篇一律',
      caption: '你有没有发现，AI 给你的设计，一眼就能看出是 AI 做的？',
    },
  },
  // ===== 问题归因（句 1-3）=====
  {
    id: 's02-average', family: 'swiss-question', captions: [1, 1], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '02', total: 16, chapter: '问题',
      question: '为什么都一个样？',
      crossedOut: '技术不够',
      caption: '紫色渐变、居中布局，这些都是 AI 默认的平均审美。',
    },
  },
  {
    id: 's03-stamp-skill', family: 'swiss-stamp', captions: [2, 3], transition: {type: 'slide', durationInFrames: 10},
    payload: {
      index: '03', total: 18, chapter: '问题',
      headline: '不是技术问题，是没有设计语言',
      subhead: '装一个 skill，就不一样了',
      stamp: '缺语言',
    },
  },
  // ===== Impeccable：37 条规则 / 8 类（句 4-7）=====
  {
    id: 's04-impeccable-number', family: 'swiss-number', captions: [4, 4], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '04', total: 18, chapter: 'Impeccable',
      number: '37', unit: '条 AI 反模式规则',
      caption: 'Impeccable 把这些 AI 审美问题归纳成 37 条规则。',
    },
  },
  {
    id: 's05-impeccable-categories', family: 'swiss-grid', captions: [5, 5], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '05', total: 18, chapter: 'Impeccable',
      heading: '八个类别，一眼认出 AI 出图',
      columns: 2,
      highlightIndex: 0,
      tiles: [
        {code: 'TYPO', label: '视觉字体'},
        {code: 'COLR', label: '色彩'},
        {code: 'LAYT', label: '布局'},
        {code: 'SPCE', label: '间距'},
        {code: 'GRID', label: '网格'},
        {code: 'CONT', label: '对比'},
        {code: 'HIER', label: '层级'},
        {code: 'A11Y', label: '无障碍'},
      ],
    },
  },
  {
    id: 's06-impeccable-detect', family: 'swiss-flow', captions: [6, 6], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '06', total: 18, chapter: 'Impeccable',
      heading: '实时检测反模式并标注',
      steps: [
        {label: '扫描设计', detail: '逐元素识别反模式'},
        {label: '标注问题', detail: '每条都有名字'},
        {label: '给出说明', detail: '为什么是 AI 味'},
      ],
    },
  },
  {
    id: 's07-impeccable-compare', family: 'swiss-compare', captions: [7, 7], transition: {type: 'slide', durationInFrames: 12},
    payload: {
      index: '07', total: 18, chapter: 'Impeccable',
      heading: '同样提示词，完全不同的结果',
      sharedPrompt: '生成一个落地页 hero',
      left: {
        tag: '装上 Impeccable', claim: '规避反模式', mock: 'swiss-anchored',
        bullets: ['禁紫色渐变', '禁居中堆叠', '禁毛玻璃'],
      },
      right: {
        tag: '默认 AI', claim: '平均审美', mock: 'default-ai',
        bullets: ['紫色渐变', '居中堆叠', '毛玻璃滥用'],
      },
    },
  },
  // ===== Frontend Design：6 方向 + 反模式清单（句 8-13）=====
  {
    id: 's08-frontend-stars', family: 'swiss-number', captions: [8, 8], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '08', total: 18, chapter: 'Frontend Design',
      number: '22k', unit: 'star · AI 辅助设计之首',
      caption: '22000 star，是 AI 辅助设计弊装的第一个。',
    },
  },
  {
    id: 's09-frontend-sixways', family: 'swiss-list', captions: [9, 10], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '09', total: 18, chapter: 'Frontend Design',
      heading: '六种鲜明的审美方向',
      bigNumber: '6', bigLabel: '种方向',
      items: [
        {code: 'SWS', label: 'Swiss 极简'},
        {code: 'RAW', label: 'RAW list 粗粝工业'},
        {code: 'NRD', label: 'Nordic 克制'},
        {code: 'NEO', label: 'Neo 赛博'},
      ],
    },
  },
  {
    id: 's10-frontend-anchor', family: 'swiss-title', captions: [11, 11], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '10', total: 18, chapter: 'Frontend Design',
      title: '主动锚定，不乱选',
      kicker: 'SWISS / 10',
      subtitle: '让 AI 稳定输出有记忆点的界面',
      caption: '不是让 AI 乱选风格，是让你主动锚定一个。',
    },
  },
  {
    id: 's11-frontend-antipattern', family: 'swiss-list', captions: [12, 12], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '11', total: 18, chapter: 'Frontend Design',
      heading: '内置反模式清单',
      items: [
        '禁用英特尔字体',
        '禁用紫色渐变',
        '禁用居中堆叠',
      ],
    },
  },
  {
    id: 's12-frontend-compare', family: 'swiss-compare', captions: [13, 13], transition: {type: 'slide', durationInFrames: 12},
    payload: {
      index: '12', total: 18, chapter: 'Frontend Design',
      heading: '同一句提示词，两个结果',
      sharedPrompt: '设计一个产品落地页',
      left: {
        tag: '装上 skill', claim: '源头规避雷区', mock: 'swiss-anchored',
        bullets: ['有审美锚', '有记忆点', '行业立场'],
      },
      right: {
        tag: '没 skill 默认', claim: '靠 AI 随机', mock: 'default-ai',
        bullets: ['无锚点', '无记忆', '通用模板'],
      },
    },
  },
  // ===== UX Pro Max：数字清单 + 决策（句 14-17）=====
  {
    id: 's13-ux-builtin', family: 'swiss-stamp', captions: [14, 14], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '13', total: 18, chapter: 'UX Pro Max',
      headline: '把每次都要查的都内置',
      subhead: '做官网、做工具、做作品集都适用',
      stamp: '一站集成',
    },
  },
  {
    id: 's14-ux-numbers', family: 'swiss-number', captions: [15, 15], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '14', total: 18, chapter: 'UX Pro Max',
      number: '161', unit: '套配色 · 按行业',
      caption: '67 种 UI 风格 / 57 个字体搭配 / 99 条 UX 原则',
    },
  },
  {
    id: 's15-ux-system', family: 'swiss-tabular', captions: [16, 17], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '15', total: 18, chapter: 'UX Pro Max',
      heading: '一句话，整套设计系统',
      rows: [
        {code: 'COLR', dimension: '颜色', tokens: ['行业配色', '变量生成']},
        {code: 'TYPE', dimension: '字体', tokens: ['搭配推荐', '层级']},
        {code: 'SPCE', dimension: '间距', tokens: ['token', '网格']},
        {code: 'A11Y', dimension: '无障碍', tokens: ['WCAG', '标准']},
      ],
    },
  },
  // ===== Awesome Cloud Design：68 品牌 + 对比（句 18-20）=====
  {
    id: 's16-cloud-pain', family: 'swiss-question', captions: [18, 18], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '16', total: 18, chapter: 'Cloud Design',
      question: '又从零定义了一遍？',
      crossedOut: '还是没行业感',
      caption: '每次开新项目，你有没有从零定义颜色、字体、组件规范？',
    },
  },
  {
    id: 's17-cloud-brands', family: 'swiss-number', captions: [19, 19], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '17', total: 18, chapter: 'Cloud Design',
      number: '68', unit: '个品牌设计系统 · 一个文件',
      caption: 'Awesome Cloud Design 把 68 个品牌打包进一个文件。',
    },
  },
  {
    id: 's18-cloud-tokens', family: 'swiss-grid', captions: [20, 20], transition: {type: 'fade', durationInFrames: 8},
    payload: {
      index: '18', total: 18, chapter: 'Cloud Design',
      heading: '加载模板，每个组件自带规则',
      columns: 2,
      highlightIndex: 0,
      tiles: [
        {code: 'STP', label: 'Stripe 极简兼容'},
        {code: 'LNR', label: 'Linear 工程美学'},
        {code: 'VRC', label: 'Vercel 极致黑白'},
        {code: 'RCT', label: 'Recta 精密渐变'},
      ],
    },
  },
  // ===== outro 主张（句 21）=====
  {
    id: 's19-thesis', family: 'swiss-stamp', captions: [21, 21], transition: {type: 'fade', durationInFrames: 10},
    payload: {
      index: '19', total: 18, chapter: '主张',
      headline: '把审美判断，变成可复用系统',
      subhead: '以前 AI 帮你出图，现在帮你建系统',
      stamp: '装对 skill',
    },
  },
];

// 编译 scene：durationInFrames 由绑定的字幕区间换算，captionRange 连续。
let sceneIdx = 0;
const scenes = sceneDefs.map((def, i) => {
  const startMs = captions[def.captions[0]].startMs;
  const endMs = captions[def.captions[1]].endMs;
  const durationInFrames = Math.max(1, Math.round((endMs - startMs) / 1000 * FPS));
  const scene = {
    id: def.id,
    family: def.family,
    durationInFrames,
    captionRange: {startIndex: def.captions[0], endIndex: def.captions[1]},
    payload: def.payload,
    assetIds: [],
    transition: def.transition,
  };
  sceneIdx++;
  return scene;
});

// 严格校验 captionRange：scene 间严格连续不重叠、不倒退，且覆盖全部 captions。
let expectedNext = 0;
for (let i = 0; i < scenes.length; i++) {
  const r = scenes[i].captionRange;
  if (r.startIndex !== expectedNext) {
    throw new Error(`scene ${i} (${scenes[i].id}) startIndex=${r.startIndex} 期望 ${expectedNext}（必须严格连续不重叠）`);
  }
  expectedNext = r.endIndex + 1;
}
if (expectedNext !== captions.length) {
  throw new Error(`captionRange 覆盖不完整：期望结束于 ${captions.length}，实际到 ${expectedNext}`);
}

const project = {
  schemaVersion: 1,
  projectId: 'swiss-skill-spoken-v2',
  title: '装对 Skill，AI 才有立场 — Swiss 分镜',
  render: {
    fps: 30,
    width: 1920,
    height: 1080,
    qualityMode: 'fast',
    orientation: 'landscape',
    captionStyle: 'editorial',
    showProjectLabel: false,
  },
  scenes,
  captions,
  audio: {},
  assets: {},
};

writeFileSync(OUT, JSON.stringify(project, null, 2));

// 自检报告
const sumFrames = scenes.reduce((s, sc) => s + sc.durationInFrames, 0);
const lastEndMs = captions[captions.length - 1].endMs;
console.log('written:', OUT);
console.log('scenes:', scenes.length, 'captions:', captions.length);
console.log('sum durationInFrames:', sumFrames, '=', (sumFrames / FPS).toFixed(2), 's');
console.log('last caption endMs:', lastEndMs, '=', (lastEndMs / 1000).toFixed(2), 's');
console.log('frame秒 vs caption秒 diff:', ((sumFrames / FPS) - (lastEndMs / 1000)).toFixed(3), 's');
console.log('chapter 分布:');
const chapters = {};
scenes.forEach(s => {const c = s.payload.chapter; chapters[c] = (chapters[c] || 0) + 1;});
Object.entries(chapters).forEach(([c, n]) => console.log('  ', c, n));

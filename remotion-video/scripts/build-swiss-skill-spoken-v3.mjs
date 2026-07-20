#!/usr/bin/env node

import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SOURCE = resolve(PROJECT_ROOT, 'examples', 'swiss-skill-spoken-v2.json');
const OUTPUT = resolve(PROJECT_ROOT, 'examples', 'swiss-skill-spoken-v3.json');
const TIMINGS = resolve(PROJECT_ROOT, 'public', 'projects', 'swiss-skill-spoken-v3', 'audio', 'timings.json');
const FPS = 30;

const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
const correctedText = new Map([
  [8, '22000 star，是 AI 辅助设计必装的第一个。'],
  [12, '它内置了一份反模式清单，禁用 Inter 字体，禁用紫色渐变，禁用居中堆叠。'],
]);
const timingSidecar = existsSync(TIMINGS) ? JSON.parse(readFileSync(TIMINGS, 'utf8')) : null;
const captions = source.captions.map((caption, index) => ({
  ...caption,
  text: correctedText.get(index) ?? caption.text,
  ...(timingSidecar?.captions?.[index] ? {
    startMs: timingSidecar.captions[index].startMs,
    endMs: timingSidecar.captions[index].endMs,
  } : {}),
}));

const frameForMs = (ms) => Math.round(ms / 1000 * FPS);
const textForRange = (startIndex, endIndex) => captions
  .slice(startIndex, endIndex + 1)
  .map((caption) => caption.text)
  .join('');

const beat = (captionIndex, config) => ({
  startFrame: 0,
  endFrame: 1,
  captionStartIndex: captionIndex,
  captionEndIndex: captionIndex,
  ...config,
});

const definitions = [
  {
    id: 'intro-position',
    range: [0, 3],
    transition: {type: 'fade', durationInFrames: 8},
    payload: {
      variant: 'intro',
      title: '设计为什么一眼像 AI',
      subtitle: '默认平均审美，没有稳定立场',
      index: '01',
      accent: '#20d9e8',
      secondaryAccent: '#9a7cff',
      brandName: 'Design Skill',
      brandIcon: 'design-system',
      headline: 'AI 的设计，一眼能认',
      body: '紫色渐变、居中堆叠只是表象，真正缺少的是可复用的设计语言。',
      labels: ['Impeccable', 'Frontend Design', 'UX Pro Max', 'Cloud Design'],
      labelIcons: ['scan-search', 'palette', 'swatch-book', 'component'],
      productIcons: ['impeccable', 'frontend-design', 'ux-pro', 'cloud-design'],
      progressIndex: 0,
      progressTotal: 6,
      layoutSignature: 'landscape:position-compare',
      beats: [
        beat(0, {keyword: 'AI 设计', icon: 'palette', action: 'compare', visualState: 'problem', motionPreset: 'split-reveal', placement: 'bottom', evidence: ['默认平均审美', '一眼能认']}),
        beat(1, {keyword: '紫色渐变', icon: 'swatch-book', action: 'compare', visualState: 'problem', motionPreset: 'split-reveal', placement: 'highlight', detail: '默认平均审美', evidence: ['紫色渐变', '居中布局']}),
        beat(2, {keyword: '装一个 skill', icon: 'plug-zap', action: 'burst', visualState: 'install', motionPreset: 'flash-cut', placement: 'bottom'}),
        beat(3, {keyword: '没有设计语言', icon: 'shield-alert', action: 'stack', visualState: 'language', motionPreset: 'card-regroup', placement: 'bottom', evidence: ['不是技术', '设计语言']}),
      ],
    },
  },
  {
    id: 'impeccable-system',
    range: [4, 7],
    transition: {type: 'slide', durationInFrames: 8},
    payload: {
      variant: 'impeccable',
      title: 'Impeccable',
      subtitle: '反模式扫描 · 命名 · 标注 · 对照',
      index: '02',
      accent: '#45e28d',
      secondaryAccent: '#20d9e8',
      productIcon: 'impeccable',
      progressIndex: 1,
      progressTotal: 6,
      layoutSignature: 'landscape:rules-scan-compare',
      beats: [
        beat(4, {keyword: '37 条规则', icon: 'list-checks', action: 'counter', visualState: 'rules', motionPreset: 'number-roll', placement: 'body', value: '37'}),
        beat(5, {keyword: '八个类别', icon: 'grid-3x3', action: 'stack', visualState: 'categories', motionPreset: 'card-regroup', placement: 'body', evidence: ['视觉字体', '色彩布局', '间距层级']}),
        beat(6, {keyword: '实时检测', icon: 'scan-line', action: 'focus', visualState: 'scan', motionPreset: 'scan-lock', placement: 'highlight', detail: '识别并标注反模式'}),
        beat(7, {keyword: '完全不同的结果', icon: 'git-compare-arrows', action: 'compare', visualState: 'compare', motionPreset: 'split-reveal', placement: 'bottom', evidence: ['装上之后', '默认 AI']}),
      ],
    },
  },
  {
    id: 'frontend-direction',
    range: [8, 13],
    transition: {type: 'fade', durationInFrames: 8},
    payload: {
      variant: 'frontend-design',
      title: 'Frontend Design',
      subtitle: '主动锚定审美方向，而不是让 AI 随机选择',
      index: '03',
      accent: '#5f7dff',
      secondaryAccent: '#20d9e8',
      productIcon: 'frontend-design',
      progressIndex: 2,
      progressTotal: 6,
      layoutSignature: 'landscape:direction-grid-rules',
      beats: [
        beat(8, {keyword: '22000 star', icon: 'badge-check', action: 'counter', visualState: 'proof', motionPreset: 'number-roll', placement: 'body', value: '22K'}),
        beat(9, {keyword: '审美方向', icon: 'palette', action: 'stamp', visualState: 'directions', motionPreset: 'slow-rise', placement: 'bottom', detail: '六种鲜明的审美方向'}),
        beat(10, {keyword: 'Swiss 极简', icon: 'ruler', action: 'stack', visualState: 'directions', motionPreset: 'card-regroup', placement: 'body', evidence: ['RAW list', 'Nordic', 'Neo']}),
        beat(11, {keyword: '主动锚定', icon: 'focus', action: 'focus', visualState: 'anchor', motionPreset: 'focus-pulse', placement: 'highlight', detail: '稳定输出有记忆点的界面'}),
        beat(12, {keyword: '反模式清单', icon: 'shield-alert', action: 'stack', visualState: 'rules', motionPreset: 'card-regroup', placement: 'body', evidence: ['Inter 字体', '紫色渐变', '居中堆叠']}),
        beat(13, {keyword: '源头规避', icon: 'shield-check', action: 'compare', visualState: 'compare', motionPreset: 'split-reveal', placement: 'bottom', evidence: ['装上 skill', '默认输出']}),
      ],
    },
  },
  {
    id: 'ux-pro-database',
    range: [14, 17],
    transition: {type: 'slide', durationInFrames: 8},
    payload: {
      variant: 'ux-pro',
      title: 'UX Pro Max',
      subtitle: '把设计时反复查询的决策全部内置',
      index: '04',
      accent: '#ffc44d',
      secondaryAccent: '#ff7a45',
      productIcon: 'ux-pro',
      progressIndex: 3,
      progressTotal: 6,
      layoutSignature: 'landscape:metric-system-output',
      beats: [
        beat(14, {keyword: '全部内置', icon: 'database', action: 'stamp', visualState: 'database', motionPreset: 'slow-rise', placement: 'bottom', detail: '不再从零搜索设计资料'}),
        beat(15, {keyword: '161 套配色', icon: 'palette', action: 'counter', visualState: 'metrics', motionPreset: 'number-roll', placement: 'body', value: '161·67·57·99'}),
        beat(16, {keyword: '整套设计系统', icon: 'swatch-book', action: 'stack', visualState: 'system', motionPreset: 'card-regroup', placement: 'body', evidence: ['颜色', '字体', '间距', '无障碍']}),
        beat(17, {keyword: '每个场景', icon: 'layout-template', action: 'focus', visualState: 'system', motionPreset: 'focus-pulse', placement: 'highlight', detail: '官网、工具、作品集都有规则'}),
      ],
    },
  },
  {
    id: 'cloud-brand-system',
    range: [18, 20],
    transition: {type: 'fade', durationInFrames: 8},
    payload: {
      variant: 'cloud-design',
      title: 'Awesome Cloud Design',
      subtitle: '品牌系统不是灵感图，而是可以加载的规则',
      index: '05',
      accent: '#ff5f91',
      secondaryAccent: '#9a7cff',
      productIcon: 'cloud-design',
      progressIndex: 4,
      progressTotal: 6,
      layoutSignature: 'landscape:brand-token-relay',
      beats: [
        beat(18, {keyword: '从零定义', icon: 'circle-help', action: 'compare', visualState: 'pain', motionPreset: 'split-reveal', placement: 'bottom', evidence: ['重复定义', '行业系统']}),
        beat(19, {keyword: '68 个品牌', icon: 'blocks', action: 'counter', visualState: 'brands', motionPreset: 'number-roll', placement: 'body', value: '68'}),
        beat(20, {keyword: '品牌风格', icon: 'component', action: 'stack', visualState: 'brand-relay', motionPreset: 'card-regroup', placement: 'body', detail: '四种品牌风格', evidence: ['Stripe', 'Linear', 'Vercel', 'Recta']}),
      ],
    },
  },
  {
    id: 'outro-position',
    range: [21, 21],
    transition: false,
    payload: {
      variant: 'outro',
      title: '装对 Skill，AI 才有立场',
      subtitle: '把审美判断变成可复用系统',
      index: '06',
      accent: '#9a7cff',
      secondaryAccent: '#20d9e8',
      brandName: 'Design Skill',
      brandIcon: 'design-system',
      headline: '把审美判断，变成可复用系统',
      body: '以前 AI 帮你出图，现在更重要的是让它稳定执行你的设计立场。',
      labels: ['反模式规则', '审美方向', '行业系统', '品牌 Token'],
      labelIcons: ['scan-search', 'palette', 'swatch-book', 'component'],
      productIcons: ['impeccable', 'frontend-design', 'ux-pro', 'cloud-design'],
      progressIndex: 5,
      progressTotal: 6,
      layoutSignature: 'landscape:position-outro',
      beats: [
        beat(21, {keyword: '可复用系统', icon: 'workflow', action: 'burst', visualState: 'outro', motionPreset: 'flash-cut', placement: 'bottom', detail: '装对 skill，AI 才有立场'}),
      ],
    },
  },
];

const scenes = definitions.map((definition) => {
  const [startIndex, endIndex] = definition.range;
  const sceneStartFrame = frameForMs(captions[startIndex].startMs);
  const sceneEndFrame = frameForMs(captions[endIndex].endMs);
  const durationInFrames = sceneEndFrame - sceneStartFrame;
  const beats = definition.payload.beats.map((item) => ({
    ...item,
    startFrame: frameForMs(captions[item.captionStartIndex].startMs) - sceneStartFrame,
    endFrame: frameForMs(captions[item.captionEndIndex].endMs) - sceneStartFrame,
  }));
  return {
    id: definition.id,
    family: 'skill-showcase',
    durationInFrames,
    captionRange: {startIndex, endIndex},
    payload: {
      ...definition.payload,
      sourceText: textForRange(startIndex, endIndex),
      beats,
    },
    assetIds: [],
    transition: definition.transition,
  };
});

const project = {
  schemaVersion: 1,
  projectId: 'swiss-skill-spoken-v3',
  title: '装对 Skill，AI 才有立场 — 横屏语义动效版',
  render: {
    fps: FPS,
    width: 1920,
    height: 1080,
    qualityMode: 'cinematic',
    orientation: 'landscape',
    captionStyle: 'editorial',
    showProjectLabel: false,
  },
  scenes,
  captions,
  audio: {voiceAssetId: 'voiceover'},
  assets: {
    voiceover: {
      kind: 'audio',
      src: 'projects/swiss-skill-spoken-v3/audio/voice.m4a',
      required: true,
    },
  },
};

writeFileSync(OUTPUT, `${JSON.stringify(project, null, 2)}\n`);

const beatCount = scenes.reduce((total, scene) => total + scene.payload.beats.length, 0);
const totalFrames = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
console.log(`written: ${OUTPUT}`);
console.log(`scenes: ${scenes.length}`);
console.log(`beats: ${beatCount}`);
console.log(`duration: ${totalFrames} frames / ${(totalFrames / FPS).toFixed(2)}s`);

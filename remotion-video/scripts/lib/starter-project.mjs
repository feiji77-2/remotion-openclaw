// scripts/lib/starter-project.mjs
// P4: 新建项目的 starter project.json 生成逻辑 — 从 production-style-contract 读取风格配置

import {
  accentForStyle,
  accentForFamily,
  renderParams,
} from './production-style-contract.mjs';

/**
 * 根据用户输入生成可通过 VideoProjectSchema 校验的 starter project.json。
 * @param {string} projectId
 * @param {string} title
 * @param {string} spokenScript - 口播稿（≥20 字）
 * @param {'portrait'|'landscape'} orientation
 * @param {'swiss'|'minimal'|'cinematic'|'tech'} style
 * @param {string} keywords - 逗号/空格分隔的标签
 * @returns {Record<string, unknown>}
 */
export const buildStarterProject = (
  projectId,
  title,
  spokenScript,
  orientation = 'portrait',
  style = 'swiss',
  keywords = '',
) => {
  const params = renderParams(style, orientation);
  const accents = params.accents;
  const isPortrait = orientation !== 'landscape';
  const keywordItems = keywords
    ? keywords.split(/[,，、\s]+/).filter(Boolean).slice(0, 6).map((kw, i) => ({
        label: kw,
        value: ['概念', '工具', '方法', '趋势', '产品', '技术'][i] ?? '关键词',
      }))
    : [
        {label: '选题', value: 'topic'},
        {label: '口播稿', value: 'script'},
        {label: '分镜', value: 'storyboard'},
        {label: '渲染', value: 'render'},
      ];

  const captions = spokenScript
    .split(/[。！？；\n]+/)
    .filter((s) => s.trim().length >= 2)
    .map((text, index) => ({
      text: text.trim(),
      startMs: index * 5000,
      endMs: (index + 1) * 5000,
      timestampMs: index * 5000,
      confidence: 1,
    }));

  return {
    schemaVersion: 1,
    projectId,
    title,
    render: {
      fps: 30,
      width: params.width,
      height: params.height,
      qualityMode: 'fast',
      orientation,
      captionStyle: params.captionStyle,
      showProjectLabel: params.showProjectLabel,
    },
    scenes: [
      {
        id: 'opening',
        family: 'spoken-title',
        durationInFrames: 90,
        payload: {
          title,
          subtitle: `风格：${accents.palette} · ${isPortrait ? '竖屏' : '横屏'} · 点击「生成分镜」拆成完整场景。`,
          kicker: style === 'swiss' ? 'SWISS' : style === 'minimal' ? 'MINIMAL' : style === 'cinematic' ? 'CINEMA' : 'TECH',
          accent: accents.primary,
        },
        assetIds: [],
        transition: {type: 'slide', durationInFrames: 6},
      },
      {
        id: 'keywords',
        family: 'spoken-tags',
        durationInFrames: 60,
        payload: {
          heading: '关联主题',
          items: keywordItems,
          accent: accents.secondary,
        },
        assetIds: [],
        transition: {type: 'fade', durationInFrames: 6},
      },
      {
        id: 'takeaway',
        family: 'spoken-takeaway',
        durationInFrames: 60,
        payload: {
          title: '先把文案定下来，再生成分镜和视频。',
          subtitle: '制作台已经帮你建好项目结构，可以开始填文案了。',
          kicker: 'READY',
          accent: accents.primary,
        },
        assetIds: [],
        transition: false,
      },
    ],
    captions,
    audio: {},
    assets: {},
  };
};

/**
 * 生成 POST /api/projects 用的 brief.json 合同
 */
export const buildBrief = (projectId, title, orientation, style) => {
  const isPortrait = orientation !== 'landscape';
  const accents = accentForStyle(style);
  return {
    productionId: projectId,
    title,
    primaryLink: '',
    platform: 'douyin',
    format: {width: isPortrait ? 1080 : 1920, height: isPortrait ? 1920 : 1080, fps: 30, maxDurationSeconds: 180},
    audience: ['AI 从业者', '产品经理', '创作者'],
    contentType: '技术教程',
    tone: style === 'tech' ? '技术布道' : style === 'cinematic' ? '文艺解说' : '轻松教学',
    structure: '钩子 -> 痛点 -> 方案 -> 步骤 -> 结论',
    visualStyle: {palette: accents.palette, captionStyle: accents.captionStyle, showProjectLabel: accents.showProjectLabel, subtitles: '固定字幕样式', branding: '第一阶段不做强品牌化'},
    research: {sourcePriority: ['官方文档', 'GitHub', '权威媒体'], socialPolicy: '只当线索，不当证据'},
    viewpointCandidates: [{id: 'view-1', claim: '这条视频的关键价值是让观众看完即可上手。', whyItMatters: '作为本片主观点。'}],
    selectedViewpointId: 'view-1',
  };
};

/**
 * 生成 POST /api/projects 用的 script-pack.json 合同
 */
export const buildScriptPack = (projectId, title, spokenScript, keywords) => ({
  productionId: projectId,
  title,
  hook: spokenScript.slice(0, 120),
  selectedViewpoint: '这条视频的关键价值是让观众看完即可上手。',
  pain: '',
  solution: '',
  spokenScript,
  keywords: keywords || title,
});

/**
 * 生成 POST /api/projects 用的 asset-pack.json 合同
 */
export const buildAssetPack = (projectId) => ({
  productionId: projectId,
  publicPathPrefix: `projects/${projectId}`,
  strategy: {missingAssetPolicy: '用 Logo + 解释型图表降级', diagramPolicy: '自动选择', sourceScreenshotPolicy: '只截关键段落'},
  assets: [],
  sceneAssetPlan: {},
  missingAssets: [],
});

// src/styles/video-gen/style-presets.ts
// Stage C: 4 个产品级视觉 preset 定义 — 纯数据，不依赖运行时 LLM/TTS/网络
//
// 使用方式：
//   import {STYLE_PRESETS, getStylePreset, STYLE_PRESET_MAP} from '../styles/video-gen/style-presets';

// ─── 类型定义 ──────────────────────────────────────────────────────────

export type CaptionStyle = 'boxed' | 'editorial';
export type TransitionType = 'fade' | 'slide';
export type MotionIntensity = 'low' | 'medium' | 'high';
export type BackgroundType = 'grid' | 'gradient' | 'solid' | 'dot-grid';
export type StylePresetId = 'tech-explainer' | 'cinematic-editorial' | 'swiss-minimal' | 'product-launch';

export interface StylePreset {
  id: StylePresetId;
  label: string;                    // 中文名
  description: string;              // 一句话描述
  palette: {
    bg: string;                     // 背景色
    primary: string;                // 主 accent
    secondary: string;              // 副 accent
    surface: string;                // 卡片表面色
    text: string;                   // 正文色
    muted: string;                  // 辅助文字色
  };
  typography: {
    titleSize: number;              // 标题字号(px)
    bodySize: number;               // 正文字号
    captionSize: number;            // 字幕字号
    fontFamily: string;             // 字体栈
    letterSpacing: number;          // 字间距
    lineHeight: number;             // 行高
  };
  captionStyle: CaptionStyle;
  familyPriority: string[];         // 优先使用的 scene family 列表
  transitions: {
    default: TransitionType;
    durationInFrames: number;
  };
  motion: {
    intensity: MotionIntensity;
    springDamping: number;
    entranceDelay: number;          // 入场延迟帧数
  };
  background: {
    type: BackgroundType;
    gridSize: number;               // 网格大小(px)
    gridOpacity: number;            // 0-1
    radialGlow: boolean;            // 径向光晕
    glowOpacity: number;            // 0-1
  };
  showProjectLabel: boolean;
  icon: string;                     // emoji 图标
}

// ─── 4 个产品级 preset ─────────────────────────────────────────────────

/**
 * Tech Explainer — 科技蓝绿光感
 * 适合：AI / 工具 / 技术原理 / 开发者内容
 */
const TECH_EXPLAINER: StylePreset = {
  id: 'tech-explainer',
  label: '科技解说',
  description: '蓝绿光感 · 终端美学 · 适合 AI / 工具 / 技术原理',
  palette: {
    bg: '#05070d',
    primary: '#00f5ff',
    secondary: '#10ff8a',
    surface: '#0a1520',
    text: '#e8eaed',
    muted: '#4a5568',
  },
  typography: {
    titleSize: 52,
    bodySize: 28,
    captionSize: 18,
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    letterSpacing: 0.02,
    lineHeight: 1.5,
  },
  captionStyle: 'boxed',
  familyPriority: [
    'spoken-title',
    'spoken-process',
    'spoken-code',
    'spoken-metric',
    'terminal',
    'code',
    'architecture-map',
    'data-stream',
    'benchmark-chart',
    'step-flow',
    'tag-matrix',
    'spoken-takeaway',
  ],
  transitions: {
    default: 'fade',
    durationInFrames: 12,
  },
  motion: {
    intensity: 'medium',
    springDamping: 200,
    entranceDelay: 6,
  },
  background: {
    type: 'grid',
    gridSize: 52,
    gridOpacity: 0.12,
    radialGlow: true,
    glowOpacity: 0.24,
  },
  showProjectLabel: true,
  icon: '⚡',
};

/**
 * Cinematic Editorial — 温暖琥珀暗调
 * 适合：故事叙述 / 思想观点 / 纪录片式 / 深度内容
 */
const CINEMATIC_EDITORIAL: StylePreset = {
  id: 'cinematic-editorial',
  label: '电影编辑',
  description: '温暖琥珀 · 暗调叙事 · 适合故事 / 观点 / 深度内容',
  palette: {
    bg: '#0a0806',
    primary: '#ffd43b',
    secondary: '#ffad63',
    surface: '#1c1510',
    text: '#f5eedc',
    muted: '#7a6e5a',
  },
  typography: {
    titleSize: 56,
    bodySize: 30,
    captionSize: 20,
    fontFamily: "'Georgia', 'Noto Serif SC', Charter, 'Times New Roman', serif",
    letterSpacing: 0.01,
    lineHeight: 1.6,
  },
  captionStyle: 'editorial',
  familyPriority: [
    'hero',
    'spoken-title',
    'quote-highlight',
    'compare-board',
    'evidence-wall',
    'timeline',
    'skill-showcase',
    'spoken-ranking',
    'number-strip',
    'glossary-term',
    'cta',
  ],
  transitions: {
    default: 'fade',
    durationInFrames: 14,
  },
  motion: {
    intensity: 'low',
    springDamping: 180,
    entranceDelay: 10,
  },
  background: {
    type: 'gradient',
    gridSize: 0,
    gridOpacity: 0,
    radialGlow: true,
    glowOpacity: 0.18,
  },
  showProjectLabel: true,
  icon: '🎬',
};

/**
 * Swiss Minimal — 克制的红 · 白底黑字
 * 适合：设计观点 / 反直觉洞察 / 极简知识卡片 / 瑞士平面设计感
 */
const SWISS_MINIMAL: StylePreset = {
  id: 'swiss-minimal',
  label: '瑞士极简',
  description: '克制红白黑 · 反平均审美 · 适合设计观点 / 反直觉洞察',
  palette: {
    bg: '#fafafa',
    primary: '#c1121f',
    secondary: '#780000',
    surface: '#ffffff',
    text: '#1a1a1a',
    muted: '#888888',
  },
  typography: {
    titleSize: 48,
    bodySize: 26,
    captionSize: 16,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Noto Sans SC', sans-serif",
    letterSpacing: -0.01,
    lineHeight: 1.3,
  },
  captionStyle: 'boxed',
  familyPriority: [
    'swiss-title',
    'swiss-question',
    'swiss-list',
    'swiss-compare',
    'swiss-number',
    'swiss-grid',
    'swiss-flow',
    'swiss-tabular',
    'swiss-stamp',
  ],
  transitions: {
    default: 'slide',
    durationInFrames: 10,
  },
  motion: {
    intensity: 'low',
    springDamping: 200,
    entranceDelay: 4,
  },
  background: {
    type: 'solid',
    gridSize: 0,
    gridOpacity: 0,
    radialGlow: false,
    glowOpacity: 0,
  },
  showProjectLabel: false,
  icon: '✕',
};

/**
 * Product Launch — 暗紫奢华 · 渐变光效
 * 适合：产品发布 / 功能介绍 / 品牌宣传 / 商业演示
 */
const PRODUCT_LAUNCH: StylePreset = {
  id: 'product-launch',
  label: '产品发布',
  description: '暗紫奢华 · 渐变光效 · 适合产品发布 / 功能 / 品牌宣传',
  palette: {
    bg: '#06060e',
    primary: '#a78bfa',
    secondary: '#f59e0b',
    surface: '#111122',
    text: '#f0e6ff',
    muted: '#6b6b8a',
  },
  typography: {
    titleSize: 54,
    bodySize: 28,
    captionSize: 18,
    fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    letterSpacing: -0.005,
    lineHeight: 1.45,
  },
  captionStyle: 'boxed',
  familyPriority: [
    'hero',
    'feature-rail',
    'skill-showcase',
    'number-strip',
    'metrics',
    'cta',
    'spoken-title',
    'spoken-tags',
    'minimal-hero',
    'compare-board',
    'step-flow',
  ],
  transitions: {
    default: 'slide',
    durationInFrames: 12,
  },
  motion: {
    intensity: 'high',
    springDamping: 200,
    entranceDelay: 8,
  },
  background: {
    type: 'dot-grid',
    gridSize: 40,
    gridOpacity: 0.08,
    radialGlow: true,
    glowOpacity: 0.22,
  },
  showProjectLabel: true,
  icon: '🚀',
};

// ─── 导出 ──────────────────────────────────────────────────────────────

/** 4 个产品级视觉 preset 数组 */
export const STYLE_PRESETS: StylePreset[] = [
  TECH_EXPLAINER,
  CINEMATIC_EDITORIAL,
  SWISS_MINIMAL,
  PRODUCT_LAUNCH,
];

/** preset id → preset 快速查找 */
export const STYLE_PRESET_MAP: Record<StylePresetId, StylePreset> = {
  'tech-explainer': TECH_EXPLAINER,
  'cinematic-editorial': CINEMATIC_EDITORIAL,
  'swiss-minimal': SWISS_MINIMAL,
  'product-launch': PRODUCT_LAUNCH,
};

/** 根据 preset id 获取完整配置；找不到返回 tech-explainer */
export const getStylePreset = (id: string): StylePreset =>
  STYLE_PRESET_MAP[id as StylePresetId] ?? TECH_EXPLAINER;

// ─── 向后兼容：映射到旧的 style 名称 ────────────────────────────────────

/**
 * 旧 style 名称 → 新版 StylePresetId 映射
 * 用于兼容 production-style-contract.mjs 的调用方
 */
export const LEGACY_STYLE_MAP: Record<string, StylePresetId> = {
  tech: 'tech-explainer',
  cinematic: 'cinematic-editorial',
  swiss: 'swiss-minimal',
  minimal: 'tech-explainer', // 旧 "极简日系" → 最接近的是 tech-explainer
};

/** 旧 style 名 → 新版 accent 颜色映射（向后兼容 production-style-contract.mjs） */
export const LEGACY_ACCENT = {
  'tech-explainer': {primary: 'cyan', secondary: 'green', palette: '蓝绿科技感', captionStyle: 'boxed' as const, showProjectLabel: true},
  'cinematic-editorial': {primary: 'amber', secondary: 'orange', palette: '电影感暗调', captionStyle: 'editorial' as const, showProjectLabel: true},
  'swiss-minimal': {primary: 'cyan', secondary: 'purple', palette: 'Swiss 极简', captionStyle: 'boxed' as const, showProjectLabel: true},
  'product-launch': {primary: 'purple', secondary: 'amber', palette: '暗紫奢华', captionStyle: 'boxed' as const, showProjectLabel: true},
};

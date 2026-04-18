/**
 * sceneFamilies.ts — 镜头家族类型定义
 *
 * 7大视觉家族 = 7种叙事策略
 * 每个家族定义：内容结构 + 视觉布局规则 + 典型组件
 *
 * 家族划分依据：
 * - 内容模式（对比型 / 证据型 / 递进型 / 循环型 / 数据型 / 情感型 / 行动型）
 * - 布局规则（单栏 / 双栏 / 网格 / 全屏 / 焦点）
 * - 组件选择
 */

import React from 'react';

// ===== 场景家族类型 =====

export type SceneFamily =
  | 'opening'      // 爆点开场 — 大数字/大标题 + 悬念引导
  | 'platform'    // 平台接入 — logo矩阵 + 连接线动画
  | 'problem'     // 问题抛出 — 痛感描述 + 图标列表
  | 'proof'       // 证据展示 — 截图/评论/数据 + 标注
  | 'diagram'     // 系统原理 — 流程图/循环图/树图
  | 'comparison'  // 对比对撞 — 左右双栏 + 胜负标注
  | 'data'        // 数据说话 — 图表/曲线/数字动画
  | 'social'      // 社会证明 — 案例/引用/Reddit帖子
  | 'philosophy'  // 哲学对撞 — 极端对立的世界观
  | 'cta';        // 行动引导 — 收尾 + 互动问题

export type LayoutMode =
  | 'fullscreen'      // 全屏占据，文字居中
  | 'split-left'      // 左文字，右视觉
  | 'split-right'     // 左视觉，右文字
  | 'split-top'       // 上视觉，下文字
  | 'split-bottom'    // 上文字，下视觉
  | 'grid'            // 多元素网格
  | 'diagram'         // 居中图表
  | 'cards'           // 卡片列表
  | 'focus'           // 单焦点放大
  | 'overlay';        // 背景+叠加文字

export type BackgroundPreset =
  | 'dark-grid'        // 深色+网格背景
  | 'dark-particles'   // 深色+粒子
  | 'gradient-pulse'   // 渐变呼吸
  | 'dark-solid';      // 纯深色

// ===== 家族配置 =====

export interface SceneFamilyConfig {
  family: SceneFamily;
  layout: LayoutMode;
  bgPreset: BackgroundPreset;
  accentDefault: string;
  description: string;
}

export const SCENE_FAMILY_CONFIG: Record<SceneFamily, SceneFamilyConfig> = {
  opening: {
    family: 'opening',
    layout: 'fullscreen',
    bgPreset: 'dark-particles',
    accentDefault: '#FFD700',
    description: '全屏大数字/标题，爆点开场，吸引眼球',
  },
  platform: {
    family: 'platform',
    layout: 'grid',
    bgPreset: 'dark-grid',
    accentDefault: '#00d4ff',
    description: '多平台logo矩阵，展示接入能力',
  },
  problem: {
    family: 'problem',
    layout: 'split-left',
    bgPreset: 'dark-solid',
    accentDefault: '#FF6B6B',
    description: '左侧问题列表，右侧图标强调',
  },
  proof: {
    family: 'proof',
    layout: 'focus',
    bgPreset: 'dark-grid',
    accentDefault: '#00FF88',
    description: '单一证据放大展示，截图+标注',
  },
  diagram: {
    family: 'diagram',
    layout: 'diagram',
    bgPreset: 'dark-particles',
    accentDefault: '#00d4ff',
    description: '居中系统图，循环/树/流程',
  },
  comparison: {
    family: 'comparison',
    layout: 'split-left',
    bgPreset: 'dark-solid',
    accentDefault: '#00d4ff',
    description: '左右对比，红绿胜负色标注',
  },
  data: {
    family: 'data',
    layout: 'diagram',
    bgPreset: 'dark-grid',
    accentDefault: '#00FF88',
    description: '图表/曲线，动态绘制+数据标注',
  },
  social: {
    family: 'social',
    layout: 'cards',
    bgPreset: 'dark-particles',
    accentDefault: '#FFD700',
    description: '社会证明，引用卡片+标签',
  },
  philosophy: {
    family: 'philosophy',
    layout: 'split-left',
    bgPreset: 'gradient-pulse',
    accentDefault: '#fff',
    description: '极端对立世界观，左右对撞',
  },
  cta: {
    family: 'cta',
    layout: 'fullscreen',
    bgPreset: 'dark-particles',
    accentDefault: '#00d4ff',
    description: '收尾互动，发起讨论',
  },
};

// ===== 家族 → 组件映射（供导演层使用）=====

// 导出各家族的视觉配置，供 Video1v4 导演调度器引用
export const FAMILY_LAYOUTS = {
  opening: { justifyContent: 'center', alignItems: 'center' },
  platform: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  problem: { flexDirection: 'row' },
  proof: { justifyContent: 'center', alignItems: 'center' },
  diagram: { justifyContent: 'center', alignItems: 'center' },
  comparison: { flexDirection: 'row' },
  data: { justifyContent: 'center', alignItems: 'center' },
  social: { flexDirection: 'column', alignItems: 'center' },
  philosophy: { flexDirection: 'row' },
  cta: { justifyContent: 'center', alignItems: 'center' },
} as const;

// ===== Beat 类型 =====

export type BeatAction =
  | 'reveal'        // 入场揭示
  | 'countup'       // 数字滚动
  | 'highlight'     // 高亮框
  | 'zoom'          // 镜头推近
  | 'swap'          // 内容替换
  | 'glow'          // 发光强调
  | 'slide'         // 滑入
  | 'arrow-trace'   // 箭头追踪
  | 'label-appear'; // 标签出现

export interface Beat {
  /** 在 shot 内第几帧触发（相对于 shot 起始帧） */
  at: number;
  /** 触发的特效动作 */
  action: BeatAction;
  /** 作用于哪个目标元素（可选） */
  target?: string;
  /** 特效参数 */
  params?: Record<string, any>;
}

// ===== ShotDirector 导演配置结构 =====

export type IconPackKey =
  | 'github' | 'telegram' | 'discord' | 'slack' | 'ollama' | 'reddit' | 'nous'
  | 'brain' | 'loop' | 'skill' | 'plugin' | 'automation' | 'clock' | 'dollar' | 'growth' | 'context';

export type FXPresetKey =
  | 'entrance-slide-left' | 'entrance-slide-up' | 'entrance-pop-in' | 'entrance-mask-reveal'
  | 'emphasis-glow' | 'emphasis-countup' | 'emphasis-zoom' | 'emphasis-highlight'
  | 'bg-particles' | 'bg-grid' | 'bg-gradient-pulse' | 'bg-scanline'
  | 'proof-screenshot' | 'proof-arrow-trace'
  | 'transition-flash' | 'transition-wipe';

export interface EvidenceAsset {
  kind: 'logo' | 'screenshot' | 'chart' | 'comment' | 'terminal' | 'text-block';
  label?: string;
  /** 图标 key（kind=logo 时） */
  iconKey?: IconPackKey;
  /** 颜色（kind=logo 时） */
  color?: string;
}

export interface ShotDirector {
  id: string;
  /** 视觉家族 */
  family: SceneFamily;
  /** 背景预设 */
  bgPreset: BackgroundPreset;
  /** 布局模式 */
  layout: LayoutMode;
  /** 强调色（覆盖全局） */
  accentColor?: string;
  /** 使用的图标 */
  iconPack?: IconPackKey[];
  /** 使用的特效预设 */
  fxPresets?: FXPresetKey[];
  /** 证据素材 */
  evidenceAssets?: EvidenceAsset[];
  /** 该镜头内部 beats（时间轴上的视觉事件） */
  beats: Beat[];
  /** 镜头是否需要动态更新（默认 true） */
  isDynamic?: boolean;
}

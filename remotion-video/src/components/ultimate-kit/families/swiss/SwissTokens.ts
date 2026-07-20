/**
 * swissTokens — Swiss 极简口播系列共享视觉系统
 *
 * 一致设计语言（反"AI 平均审美"）：
 *   · 白底 #fafafa / 黑字 #0a0a0a / Swiss 红 #d63232 accent
 *   · Helvetica Neue grotesk、左对齐、粗网格、大量留白
 *   · 显式禁止：紫色渐变、毛玻璃（backdrop-filter）、居中堆叠、霓虹发光
 *
 * 所有 Swiss* 组件都从这里取色/取字/取尺度，确保整条口播 16 cut 视觉同构。
 * ProjectSceneRegistry 会在 family 组件外面套一层深色 #05070d + 网格 + 径向光晕外壳
 * (sceneRegistry.tsx:378-419)；每个 Swiss 组件根 AbsoluteFill 必须用 `bg` 盖白。
 */

import type {CSSProperties} from 'react';

// ── 颜色 ──────────────────────────────────────────────────────────────────
export const swissColor = {
  bg:        '#fafafa', // 主背景（盖过 ProjectSceneRegistry 的深色外壳）
  ink:       '#0a0a0a', // 主文字
  inkSoft:   '#6b6b6b', // 辅助文字 / 说明
  inkMute:   '#9a9a9a', // 更弱 / 编号 / metadata
  rule:      '#0a0a0a', // 主分割线 / 边框
  ruleSoft:  'rgba(10,10,10,0.08)', // 粗网格底纹
  red:       '#d63232', // Swiss 红（唯一 accent，克制使用）
  redSoft:   'rgba(214,50,50,0.10)', // 高亮底
  white:     '#ffffff', // 卡片/单元格
} as const;

// ── 字体 ──────────────────────────────────────────────────────────────────
// Helvetica Neue 在 macOS 系统级必有；中文走 PingFang SC grotesk 回退。
// 渲染机若非 macOS，回退到 Avenir Next / Helvetica / 系统无衬线。
export const swissFont = {
  sans: '"Helvetica Neue","Avenir Next","Helvetica","PingFang SC",sans-serif',
  // 数字 / 标号的 grotesk：用更紧的字距，强调瑞士国际化主义风格
  numeric: '"Helvetica Neue","Avenir Next","Helvetica",sans-serif',
} as const;

// ── 尺度 / 网格 ────────────────────────────────────────────────────────────
// 1920×1080 画布，粗网格 baseline=8，page margin 左右 120 上下 96。
export const swissLayout = {
  width: 1920,
  height: 1080,
  pageX: 120,
  pageY: 96,
  gridGutter: 48,    // 列槽
  rowGap: 56,        // 行槽
  baseline: 8,       // 基线栅格单位
  ruleThickness: 2,  // 主分割线
} as const;

// ── 字号阶（基于 1920×1080）─────────────────────────────────────────────────
export const swissType = {
  kicker:    22,   // eyebrow / 顶栏小字
  caption:   26,   // 图注 / 说明
  body:      30,   // 正文
  bodyLead:  36,   // lead 段
  subhead:   48,   // 子标题
  heading:   64,   // 段标题
  headline:  96,   // 大主张
  mega:     160,   // 巨大数字（22,000 量级会自适应缩小）
  stamp:     54,   // 印章字
} as const;

// ── 缓动 / 入场（仿 MinimalCompareBoard 的 smooth spring）─────────────────
// damping:200 stiffness:120 是工程内通用的"平滑"弹性；Swiss 入场克制，不用弹跳。
export const swissSpring = {damping: 200, stiffness: 120, mass: 1} as const;

// ── 通用 stylehelpers ──────────────────────────────────────────────────────

/** 根 AbsoluteFill：盖白底，强制覆盖 ProjectSceneRegistry 的深色外壳 + 径向光晕。 */
export const swissRootStyle = (extra?: CSSProperties): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: swissColor.bg,
  color: swissColor.ink,
  fontFamily: swissFont.sans,
  fontWeight: 400,
  overflow: 'hidden',
  // 显式禁用平均审美特征：无渐变、无 blur、无发光、无滤镜
  backgroundImage: 'none',
  backdropFilter: 'none',
  filter: 'none',
  ...extra,
});

/**
 * 粗网格底纹 — 极淡的等分线，张贴于画布左上，强化"瑞士网格"质感。
 * 这不是"AI 紫色霓虹网格"，是黑白淡灰的排版网格，与 ProjectSceneRegistry
 * 那套 accent 彩色网格有本质不同。
 */
export const swissGridStyle = (): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  backgroundImage: [
    `linear-gradient(${swissColor.ruleSoft} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${swissColor.ruleSoft} 1px, transparent 1px)`,
  ].join(', '),
  // 48px 一格，粗网格
  backgroundSize: `${swissLayout.gridGutter}px ${swissLayout.gridGutter}px`,
  // 底纹非常淡，绝不喧宾夺主
  opacity: 0.5,
  pointerEvents: 'none',
});

/** 左对齐主文字块的内边距（page margin + 顶栏避开）。 */
export const swissPageStyle = (): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  padding: `${swissLayout.pageY}px ${swissLayout.pageX}px`,
  display: 'flex',
  flexDirection: 'column',
});

/** 顶栏 meta 行（左：编号 / 右：标识），Swiss 海报常见骨架。 */
export const swissTopBarStyle = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontFamily: swissFont.sans,
  fontSize: swissType.kicker,
  fontWeight: 700,
  letterSpacing: 2,
  color: swissColor.ink,
  textTransform: 'uppercase' as const,
  paddingBottom: 18,
  borderBottom: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
});

/** 底栏 meta 行（左：来源 / 右：章节进度）。 */
export const swissBottomBarStyle = (): CSSProperties => ({
  position: 'absolute',
  left: swissLayout.pageX,
  right: swissLayout.pageX,
  bottom: swissLayout.pageY,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontFamily: swissFont.sans,
  fontSize: swissType.kicker,
  fontWeight: 700,
  letterSpacing: 2,
  color: swissColor.ink,
  textTransform: 'uppercase' as const,
  paddingTop: 18,
  borderTop: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
});

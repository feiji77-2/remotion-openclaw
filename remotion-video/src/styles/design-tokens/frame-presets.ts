/**
 * frame-presets.ts — 画面预设目录
 *
 * 从 HyperFrames design 技能移植的画面预设集合。
 * 每个预设定义了视觉风格、布局结构和排版规格。
 */

// ===== 类型定义 =====

export interface FramePresetTypography {
  heading: string;
  body: string;
  accent: string;
}

export interface FramePreset {
  id: string;
  name: string;
  style: string;
  layout: string;
  typography: FramePresetTypography;
  idealFor: string[];
}

// ===== 画面预设列表 =====

/**
 * Biennale Yellow — 文学编辑风
 * 暖色羊皮纸基底 + 靛蓝墨水 + 太阳黄晕彩, Instrument Serif + Archivo + JetBrains Mono
 */
export const BIENNALE_YELLOW: FramePreset = {
  id: 'biennale-yellow',
  name: 'Biennale Yellow',
  style:
    'Literary-editorial — warm parchment ground, single deep indigo ink, solar yellow as bloom/panel/tile. 1px hairline rules only, no shadows, no rounded corners.',
  layout:
    'Left/asymmetric on cover/chapter/list, centered on manifesto. Sun bloom as primary depth layer. Fixed-width containers with cqw units.',
  typography: {
    heading: 'Instrument Serif 400 (tight, negative-tracked, sentence case)',
    body: 'Archivo 400, 0.85cqw',
    accent: 'JetBrains Mono 400 (all numerals/dates, uppercase micro-labels)',
  },
  idealFor: [
    'Art-biennale catalogue style',
    'Slow-reading literary quarterly mood',
    'Warm, atmospheric editorial content',
  ],
};

/**
 * BlockFrame — 极繁新粗野主义
 * 4px 黑色边框 + 8px 硬阴影, 五粉彩糖果色, Inter 800-900 大写显示
 */
export const BLOCKFRAME: FramePreset = {
  id: 'blockframe',
  name: 'BlockFrame',
  style:
    'Maximalist neobrutalist — 4px black borders, 8px hard offset shadows, five-pastel candy palette. Inter 800-900 uppercase display, square corners.',
  layout:
    'Cycle pastel grounds across frames. 4px↔8px / 3px↔4px border-shadow coupling. Tilted decorations puncture the grid.',
  typography: {
    heading: 'Inter 800-900 uppercase, negative-tracked, fit-to-measure',
    body: 'Inter 500 sentence case, 0.95cqw',
    accent: 'Space Grotesk 600 uppercase, 0.08em tracking (labels/chrome)',
  },
  idealFor: [
    'Zine / 1990s sticker-book aesthetic',
    'Toy-packaging style spreads',
    'Bold, playful, high-contrast content',
  ],
};

/**
 * Blue Professional — 咨询级专业风
 * 暖奶油底色 + 单一钴蓝强调, Space Grotesk + Inter, 无阴影柔和卡片
 */
export const BLUE_PROFESSIONAL: FramePreset = {
  id: 'blue-professional',
  name: 'Blue Professional',
  style:
    'Consulting-grade — warm cream canvas, single saturated cobalt accent, tinted cards (4% fill / 20% border / 10-14px radius), no shadows.',
  layout:
    'Left on cover/dashboard/split, centered on quote/closer. Atmosphere (diagonal panel, dot grid) on cover/closing only. Pill chrome everywhere.',
  typography: {
    heading: 'Space Grotesk 600-700, near-black, −0.02em tracking',
    body: 'Inter 400 muted, 0.85cqw, line-height 1.6',
    accent: 'Space Grotesk 600 uppercase, 0.08em tracking, cobalt (eyebrows/numerals)',
  },
  idealFor: [
    'Investment-research / McKinsey briefing style',
    'Data-dense but uncluttered dashboards',
    'Executive-readable presentations',
  ],
};

/**
 * Bold Poster — 民粹编辑海报
 * Shrikhand 倾斜大写 + Libre Baskerville 衬线, 番茄红强调, 双线网格
 */
export const BOLD_POSTER: FramePreset = {
  id: 'bold-poster',
  name: 'Bold Poster',
  style:
    'Populist editorial poster — vintage Italian sports-magazine. Shrikhand display routinely tilted −6° to +2°, single tomato red accent, 3px+1.5px double-border grids.',
  layout:
    'Stacked 3-line hero composition. Flat plane, stacked text-shadow on red display only. Square corners everywhere.',
  typography: {
    heading: 'Shrikhand 400, routinely tilted (−6° to +2°), poster scale',
    body: 'Libre Baskerville 400, 0.85cqw, line-height 1.75',
    accent: 'Space Grotesk 600 uppercase, 2-3px tracking (chrome/labels only)',
  },
  idealFor: [
    'Italian sports-magazine style',
    'Mid-century European annual report mood',
    'Populist, printed-feel statement content',
  ],
};

/**
 * Broadside — 抗议海报系统
 * Barlow 900 小写作为图形基元, 双色域 (墨黑 / 火焰橙), IBM Plex Mono 铬
 */
export const BROADSIDE: FramePreset = {
  id: 'broadside',
  name: 'Broadside',
  style:
    'Protest-poster system — massive lowercase Barlow 900 as graphic primitive. Two registers (ink-black dark / fire-orange), IBM Plex Mono chrome, flat plane, 1px hairlines.',
  layout:
    'One statement per frame. Two registers — dark (cream text) or orange (ink text). Chrome suppressed on declarative frames. Left-anchored dominant.',
  typography: {
    heading: 'Barlow 700-900, lowercase, negative-tracked, up to 13cqw display',
    body: 'Barlow 400, 1.2cqw, line-height 1.6',
    accent: 'IBM Plex Mono 500 uppercase, 0.14em tracking (chrome/catalogue)',
  },
  idealFor: [
    'Broadside printing / protest-poster aesthetic',
    'SPACE10 report / Wim Crouwel grid style',
    'Single loud statement per frame',
  ],
};

/**
 * Capsule — 趣味编辑药丸系统
 * 所有容器均为药丸形状 (border-radius: 9999px / 2rem), Bodoni Moda + Space Grotesk
 */
export const CAPSULE: FramePreset = {
  id: 'capsule',
  name: 'Capsule',
  style:
    'Playful editorial — every container is a pill (9999px / 2rem) with 2px ink outline. Bodoni Moda display, nine candy accents, soft hard-offset shadows.',
  layout:
    'Cream canvas + radial glows + 4% grain on every frame. 5-8 floating decorative pills on declarative frames. Centered on cover/closer, left on cards/quote.',
  typography: {
    heading: 'Bodoni Moda 700-800, ink, sentence case, negative-tracked',
    body: 'Space Grotesk 400, 0.85cqw, line-height 1.6',
    accent: 'Space Grotesk 500-600 uppercase, 0.08-0.12em tracking (pills/labels)',
  },
  idealFor: [
    'Memphis / ice-cream-parlor editorial spread',
    'Inflated, friendly, graphically distinct content',
    'Candy-colored playful presentations',
  ],
};

/**
 * Cartesian — 安静博物馆目录风
 * 1px 灰褐色发丝线为唯一结构, Playfair Display 400 + Inter, 指南针圆形装饰
 */
export const CARTESIAN: FramePreset = {
  id: 'cartesian',
  name: 'Cartesian',
  style:
    'Quiet museum-catalog editorial — 1px taupe hairline as the universal structural device. Playfair Display 400, five warm stones + ink, compass-drafted geometric rings.',
  layout:
    'Sparse and breathing — 55-60% empty on declarative frames. Centered on quote/closer, asymmetric/left on cover/agenda/editorial. At most two geo rings per frame.',
  typography: {
    heading: 'Playfair Display 400, ink, sentence case (never bold/uppercase)',
    body: 'Inter 400 gray, 1.0cqw, line-height 1.6',
    accent: 'Inter 500 uppercase taupe, 2-3px tracking (labels/chrome)',
  },
  idealFor: [
    'Vignelli editorial / Cooper Hewitt catalogue style',
    'Pencil-and-tracing-paper plan aesthetic',
    'Minimal, breathing, type-driven content',
  ],
};

/**
 * Claude — 温暖编辑品牌书
 * 奶油底 + 墨水 + 珊瑚色电压, EB Garamond + Inter + JetBrains Mono, 发丝线高度
 */
export const CLAUDE: FramePreset = {
  id: 'claude',
  name: 'Claude',
  style:
    'Warm-editorial brand book — cream/ink/coral trinity, EB Garamond display (sentence case), hairline elevation (1px low-alpha border + soft warm shadow), warm-navy code surface.',
  layout:
    'Cream floor with half-step tile surfaces. One coral moment per frame. Kicker-spike (✱) opens regions. Code on warm-navy surface. Density is free.',
  typography: {
    heading: 'EB Garamond 400, sentence case, negative-tracked (−0.018 to −0.028em)',
    body: 'Inter 400, 1.5cqw, line-height 1.5',
    accent: 'JetBrains Mono 500 uppercase, 0.16em tracking (kickers/code)',
  },
  idealFor: [
    'Literary imprint / research note aesthetic',
    'PR and code review storytelling',
    'Warm, editorial tech content with code',
  ],
};

/**
 * Cobalt Grid — 双色孔版趋势报告
 * 暖奶油纸 + 电光钴蓝墨水 + 永久方格纸, Newsreader + Hanken Grotesk + DM Mono
 */
export const COBALT_GRID: FramePreset = {
  id: 'cobalt-grid',
  name: 'Cobalt Grid',
  style:
    'Two-color risograph trend-report — warm cream paper, electric cobalt ink, permanent ~2cqw graph-paper grid behind every frame. Top + bottom cobalt hairlines.',
  layout:
    'Grid + hairlines on every frame. Pixel-glitch column + QR-block on declarative frames. Left on index/chapter/cover, centered on quote/closer.',
  typography: {
    heading: 'Newsreader 400, cobalt, negative-tracked, size-driven hierarchy',
    body: 'Hanken Grotesk 400, 0.83cqw, line-height 1.5',
    accent: 'DM Mono 400, 0.04-0.08em tracking (all chrome/numbers/dates)',
  },
  idealFor: [
    'Two-color risograph monograph style',
    'WIRED Japan / trend-report aesthetic',
    'Grid-driven, data-rich editorial content',
  ],
};

/**
 * Coral — 大胆杂志海报
 * 三表面硬边缘分割 (珊瑚火 / 墨黑 / 暖奶油), Bebas Neue 全大写 + Inter
 */
export const CORAL: FramePreset = {
  id: 'coral',
  name: 'Coral',
  style:
    'Bold magazine poster — three solid surfaces (coral fire / ink black / warm cream) meeting at hard color edges. Bebas Neue uppercase tracked + Inter body.',
  layout:
    'Region-split as primary layout device. 45° diagonal hatch on coral regions. Background wallpaper numerals. No shadows, no rounded rectangles.',
  typography: {
    heading: 'Bebas Neue 400, uppercase, tracked (1-12px), bold magazine scale',
    body: 'Inter 300-400, 1.0cqw, line-height 1.7',
    accent: 'Inter 700 uppercase, 3-4px tracking (labels/categories)',
  },
  idealFor: [
    'Sports-magazine cover / Saul Bass travel poster style',
    'Solid planes at hard edges aesthetic',
    'Bold, typographic magazine content',
  ],
};

/**
 * Creative Mode — 新粗野主义编辑海报
 * 暖奶油纸 + 近黑墨水 + 四种强调色, Archivo Black 大写 0.92 行高
 */
export const CREATIVE_MODE: FramePreset = {
  id: 'creative-mode',
  name: 'Creative Mode',
  style:
    'Neo-brutalist editorial poster — warm cream paper, near-black ink, four accents at full saturation. Archivo Black uppercase 0.92 line-height, hard offset shadows.',
  layout:
    'One idea per frame, centered by default. 0.4cqw ink borders on every element. One hard-offset shadow per frame. Green ground reserved for closing plate.',
  typography: {
    heading: 'Archivo Black, uppercase, 0.84-0.92 line-height, fit-to-measure',
    body: 'Space Grotesk 400, 1.25-1.46cqw (px+cqw hybrid)',
    accent: 'JetBrains Mono 400 uppercase, 0.06-0.14em tracking (all labels/chrome)',
  },
  idealFor: [
    'Risograph editorial poster style',
    'Punk-zine / underground spread aesthetic',
    'Loud, blocky, accent-driven content',
  ],
};

/**
 * Daisy Days — 快乐童趣系统
 * 3px 木炭轮廓 + 硬偏移阴影 + 粉彩调色板, Fredoka + Quicksand, 手绘 SVG 装饰
 */
export const DAISY_DAYS: FramePreset = {
  id: 'daisy-days',
  name: 'Daisy Days',
  style:
    'Cheerful, childlike system — 3px charcoal outline + hard offset shadow on every shape. Fredoka One headlines, hand-drawn SVG ornament layer (daisies, stars, clouds).',
  layout:
    'One content container per frame surrounded by 3-7 ornament wreath. Generous radii (20/28px). Dot bullets (outlined butter discs, never glyphs). Centered.',
  typography: {
    heading: 'Fredoka One, single weight, rounded, 0.02em tracking',
    body: 'Quicksand 500-600, 0.95cqw, line-height 1.6',
    accent: 'Fredoka One (badges) / Quicksand 600 (emphasis)',
  },
  idealFor: [
    'Childrens picture-book style',
    'Sticker-sheet kawaii zine aesthetic',
    'Cheerful, playful, friendly content',
  ],
};

/**
 * Editorial Forest — 文学编辑风
 * 绿/粉/奶油编辑三元组, Source Serif 4 500 + JetBrains Mono, 平坦纸面深度
 */
export const EDITORIAL_FOREST: FramePreset = {
  id: 'editorial-forest',
  name: 'Editorial Forest',
  style:
    'Serif-led literary-editorial — green/pink/cream triad. Source Serif 4 weight 500 (optical-size axis) for all display, JetBrains Mono 500 uppercase for chrome.',
  layout:
    'Topbar on every frame. One subject per frame in deep negative space. 2px hairline rules. Monogram circle identity stamp on cover/summary.',
  typography: {
    heading: 'Source Serif 4 500, opsz, negative-tracked, up to 11.5cqw display',
    body: 'Source Serif 4 400, 1.56cqw, line-height 1.38',
    accent: 'JetBrains Mono 500 uppercase, 0.08-0.18em tracking (all chrome)',
  },
  idealFor: [
    'Penguin classic / quiet annual report style',
    'Art-book spread aesthetic',
    'Literary, editorial, serif-driven content',
  ],
};

// ===== 预设注册表 =====

export const FRAME_PRESETS: Record<string, FramePreset> = {
  'biennale-yellow': BIENNALE_YELLOW,
  'blockframe': BLOCKFRAME,
  'blue-professional': BLUE_PROFESSIONAL,
  'bold-poster': BOLD_POSTER,
  'broadside': BROADSIDE,
  'capsule': CAPSULE,
  'cartesian': CARTESIAN,
  'claude': CLAUDE,
  'cobalt-grid': COBALT_GRID,
  'coral': CORAL,
  'creative-mode': CREATIVE_MODE,
  'daisy-days': DAISY_DAYS,
  'editorial-forest': EDITORIAL_FOREST,
};

export type FramePresetId = keyof typeof FRAME_PRESETS;

// ===== 辅助函数 =====

/**
 * 按 ID 获取画面预设，不存在时返回 null
 */
export const getFramePreset = (id: string): FramePreset | undefined =>
  FRAME_PRESETS[id];

/**
 * 获取所有预设 ID 列表
 */
export const getFramePresetIds = (): FramePresetId[] =>
  Object.keys(FRAME_PRESETS) as FramePresetId[];

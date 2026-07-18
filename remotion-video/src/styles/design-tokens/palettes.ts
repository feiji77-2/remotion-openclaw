/**
 * palettes.ts — 调色板系统
 *
 * 从 HyperFrames 设计技能移植的完整调色板集合。
 * 每个调色板定义了主色、辅色、强调色、背景色、表面色和文字色。
 */

// ===== 类型定义 =====

export interface DesignPaletteColors {
  primary: string; // 主色
  secondary: string; // 辅色
  accent: string; // 强调色
  background: string; // 背景色
  surface: string; // 表面色
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface DesignPalette {
  id: string;
  name: string;
  description: string;
  colors: DesignPaletteColors;
}

// ===== 调色板列表 =====

/**
 * Bold / Energetic — 产品发布、社交媒体、公告、高能量内容
 * 充满活力的橙红主色调，搭配电光蓝和洋红点缀。
 */
export const BOLD_ENERGETIC: DesignPalette = {
  id: 'bold-energetic',
  name: 'Bold / Energetic',
  description: 'Product launches, social media, announcements, high-energy content.',
  colors: {
    primary: '#FB5607',
    secondary: '#3A86FF',
    accent: '#FF006E',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: {
      primary: '#1A1A2E',
      secondary: '#495057',
      accent: '#8338EC',
    },
  },
};

/**
 * Clean / Corporate — 产品解释、教程、演示、专业内容
 * 干净克制的配色，暖灰与深蓝搭配。
 */
export const CLEAN_CORPORATE: DesignPalette = {
  id: 'clean-corporate',
  name: 'Clean / Corporate',
  description: 'Explainers, tutorials, presentations, professional content.',
  colors: {
    primary: '#3D5A80',
    secondary: '#98C1D9',
    accent: '#EE6C4D',
    background: '#FFFCF2',
    surface: '#FFFFFF',
    text: {
      primary: '#293241',
      secondary: '#4A4E69',
      accent: '#EF233C',
    },
  },
};

/**
 * Dark / Premium — 科技、金融、奢侈品、电影级内容
 * 深邃暗色基调配金色点缀，营造高端质感。
 */
export const DARK_PREMIUM: DesignPalette = {
  id: 'dark-premium',
  name: 'Dark / Premium',
  description: 'Tech, finance, luxury, cinematic content.',
  colors: {
    primary: '#FCA311',
    secondary: '#E5E5E5',
    accent: '#FFD60A',
    background: '#000000',
    surface: '#14213D',
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E5',
      accent: '#FCA311',
    },
  },
};

/**
 * Jewel / Rich — 奢侈品、活动、高端、精致内容
 * 宝石色调的浓郁配色，深红配金色。
 */
export const JEWEL_RICH: DesignPalette = {
  id: 'jewel-rich',
  name: 'Jewel / Rich',
  description: 'Luxury, events, sophisticated, high-end content.',
  colors: {
    primary: '#9A031E',
    secondary: '#5F0F40',
    accent: '#FB8B24',
    background: '#FDF0D5',
    surface: '#FFFFFF',
    text: {
      primary: '#0F4C5C',
      secondary: '#6D597A',
      accent: '#E36414',
    },
  },
};

/**
 * Monochrome — 戏剧性、排版驱动、严肃内容
 * 纯黑白灰体系，蓝色作为唯一强调。
 */
export const MONOCHROME: DesignPalette = {
  id: 'monochrome',
  name: 'Monochrome',
  description: 'Dramatic, typography-focused, serious content.',
  colors: {
    primary: '#212529',
    secondary: '#6C757D',
    accent: '#0466C8',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: {
      primary: '#212529',
      secondary: '#6C757D',
      accent: '#0466C8',
    },
  },
};

/**
 * Nature / Earth — 可持续、户外、有机、健康内容
 * 大地色系，橄榄绿配暖沙色。
 */
export const NATURE_EARTH: DesignPalette = {
  id: 'nature-earth',
  name: 'Nature / Earth',
  description: 'Sustainability, outdoor, organic, wellness content.',
  colors: {
    primary: '#606C38',
    secondary: '#283618',
    accent: '#BC6C25',
    background: '#FEFAE0',
    surface: '#F0EAD2',
    text: {
      primary: '#344E41',
      secondary: '#6B9080',
      accent: '#DDA15E',
    },
  },
};

/**
 * Neon / Electric — 游戏、科技、夜生活、Z世代内容
 * 高饱和霓虹色，紫粉配电蓝。
 */
export const NEON_ELECTRIC: DesignPalette = {
  id: 'neon-electric',
  name: 'Neon / Electric',
  description: 'Gaming, tech, nightlife, Gen Z content.',
  colors: {
    primary: '#F72585',
    secondary: '#7209B7',
    accent: '#70D6FF',
    background: '#0B132B',
    surface: '#1C2541',
    text: {
      primary: '#FFFFFF',
      secondary: '#48BFE3',
      accent: '#F72585',
    },
  },
};

/**
 * Pastel / Soft — 时尚、美容、生活方式、健康内容
 * 柔和粉彩配色，温柔且舒适。
 */
export const PASTEL_SOFT: DesignPalette = {
  id: 'pastel-soft',
  name: 'Pastel / Soft',
  description: 'Fashion, beauty, lifestyle, wellness content.',
  colors: {
    primary: '#FFAFCC',
    secondary: '#CDB4DB',
    accent: '#A2D2FF',
    background: '#FAF9F9',
    surface: '#FFFFFF',
    text: {
      primary: '#5E6472',
      secondary: '#89B0AE',
      accent: '#F07167',
    },
  },
};

/**
 * Warm / Editorial — 故事叙述、纪录片、案例研究
 * 暖色调编辑风，陶土色配深青绿。
 */
export const WARM_EDITORIAL: DesignPalette = {
  id: 'warm-editorial',
  name: 'Warm / Editorial',
  description: 'Storytelling, documentaries, case studies, narrative content.',
  colors: {
    primary: '#E76F51',
    secondary: '#264653',
    accent: '#F4A261',
    background: '#F4F1DE',
    surface: '#FFFFFF',
    text: {
      primary: '#264653',
      secondary: '#3D405B',
      accent: '#E76F51',
    },
  },
};

// ===== 调色板注册表 =====

export const PALETTES: Record<string, DesignPalette> = {
  'bold-energetic': BOLD_ENERGETIC,
  'clean-corporate': CLEAN_CORPORATE,
  'dark-premium': DARK_PREMIUM,
  'jewel-rich': JEWEL_RICH,
  'monochrome': MONOCHROME,
  'nature-earth': NATURE_EARTH,
  'neon-electric': NEON_ELECTRIC,
  'pastel-soft': PASTEL_SOFT,
  'warm-editorial': WARM_EDITORIAL,
};

export type PaletteId = keyof typeof PALETTES;

// ===== 辅助函数 =====

/**
 * 按 ID 获取调色板，不存在时返回默认调色板
 */
export const getPalette = (id: string): DesignPalette =>
  PALETTES[id] ?? CLEAN_CORPORATE;

/**
 * 解析强调色：若提供了 accent 参数则使用之，否则返回调色板的默认强调色
 */
export const resolveAccentColor = (
  palette: DesignPalette,
  accent?: string,
): string => accent ?? palette.colors.accent;

/**
 * 获取所有调色板 ID 列表
 */
export const getPaletteIds = (): PaletteId[] =>
  Object.keys(PALETTES) as PaletteId[];

// scripts/lib/production-style-contract.mjs
// P4: 统一视觉风格合同 — starter/brief/build-project 单一真源

/**
 * style 名称 → accent 配色 + 渲染参数
 * 所有生产流程（starter JSON、brief、build-project）都从这里读取。
 */
export const STYLE_ACCENT = {
  swiss:     {primary: 'cyan',    secondary: 'purple',  palette: 'Swiss 极简',    captionStyle: 'boxed',     showProjectLabel: true},
  minimal:   {primary: 'purple',  secondary: 'cyan',    palette: '极简日系',       captionStyle: 'boxed',     showProjectLabel: true},
  cinematic: {primary: 'amber',   secondary: 'orange',  palette: '电影感暗调',     captionStyle: 'editorial', showProjectLabel: true},
  tech:      {primary: 'green',   secondary: 'cyan',    palette: '科技绿光',       captionStyle: 'boxed',     showProjectLabel: true},
};

/** palette 字符串 → accent 色值（向后兼容旧的 brief.visualStyle 记录） */
export const PALETTE_MAP = {
  'Swiss 极简':   {primary: 'cyan',    secondary: 'purple'},
  '极简日系':     {primary: 'purple',  secondary: 'cyan'},
  '电影感暗调':   {primary: 'amber',   secondary: 'orange'},
  '科技绿光':     {primary: 'green',   secondary: 'cyan'},
  '蓝绿科技感':   {primary: 'cyan',    secondary: 'green'},
  '蓝绿 AI 感':   {primary: 'cyan',    secondary: 'purple'},
};

const FALLBACK_ACCENT = STYLE_ACCENT.swiss;

/**
 * 根据 style 名获取完整风格配置
 */
export const accentForStyle = (style) => STYLE_ACCENT[style] ?? FALLBACK_ACCENT;

/**
 * 根据 palette 字符串获取 accent（用于从 brief 反向解析）
 */
export const accentForPalette = (palette) => PALETTE_MAP[palette] ?? PALETTE_MAP['蓝绿科技感'];

/**
 * 根据 family 分配 accent 色
 */
export const accentForFamily = (family, styleAccent) => {
  switch (family) {
    case 'spoken-title': return styleAccent.primary;
    case 'spoken-tags': return styleAccent.secondary;
    case 'spoken-code': return styleAccent.primary;
    case 'spoken-ranking': return 'amber';
    case 'spoken-takeaway': return styleAccent.primary;
    default: return styleAccent.primary;
  }
};

/**
 * 根据 style + orientation 推算 render 参数
 */
export const renderParams = (style, orientation) => {
  const accents = accentForStyle(style);
  const isPortrait = orientation !== 'landscape';
  return {
    width: isPortrait ? 1080 : 1920,
    height: isPortrait ? 1920 : 1080,
    orientation,
    captionStyle: accents.captionStyle,
    showProjectLabel: accents.showProjectLabel,
    accents,
  };
};

export const STYLE_ACCENT = {
  "cyan-tech": {
    primary: "cyan",
    secondary: "green",
    palette: "蓝绿科技感",
    captionStyle: "boxed",
  },
  "amber-editorial": {
    primary: "amber",
    secondary: "orange",
    palette: "电影感暗调",
    captionStyle: "editorial",
  },
  "red-minimal": {
    primary: "red",
    secondary: "cyan",
    palette: "瑞士极简",
    captionStyle: "boxed",
  },
  "purple-launch": {
    primary: "purple",
    secondary: "amber",
    palette: "产品发布",
    captionStyle: "boxed",
  },
};

export const normalizeStyleId = (style) => {
  return Object.hasOwn(STYLE_ACCENT, style) ? style : "cyan-tech";
};

export const accentForStyle = (style) =>
  STYLE_ACCENT[normalizeStyleId(style)];

export const styleForPalette = (palette) =>
  Object.entries(STYLE_ACCENT).find(([, value]) => value.palette === palette)?.[0]
  ?? "cyan-tech";

export const renderParams = (style) => {
  const accents = accentForStyle(style);
  return {
    width: 1080,
    height: 1920,
    orientation: "portrait",
    captionStyle: accents.captionStyle,
    showProjectLabel: false,
    accents,
  };
};

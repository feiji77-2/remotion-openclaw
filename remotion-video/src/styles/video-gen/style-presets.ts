export type StylePresetId =
  | "cyan-tech"
  | "amber-editorial"
  | "red-minimal"
  | "purple-launch";

export interface StylePreset {
  id: StylePresetId;
  label: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    surface: string;
  };
  icon: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "cyan-tech",
    label: "科技蓝绿",
    description: "20 组件主链路 · 蓝绿高对比配色",
    palette: { primary: "#00f5ff", secondary: "#10ff8a", surface: "#0a1520" },
    icon: "T",
  },
  {
    id: "amber-editorial",
    label: "电影编辑",
    description: "20 组件主链路 · 琥珀暗调配色",
    palette: { primary: "#ffd43b", secondary: "#ffad63", surface: "#1c1510" },
    icon: "C",
  },
  {
    id: "red-minimal",
    label: "瑞士极简",
    description: "20 组件主链路 · 红白黑克制配色",
    palette: { primary: "#c1121f", secondary: "#00a6c8", surface: "#ffffff" },
    icon: "S",
  },
  {
    id: "purple-launch",
    label: "产品发布",
    description: "20 组件主链路 · 紫金发布配色",
    palette: { primary: "#a78bfa", secondary: "#f59e0b", surface: "#111122" },
    icon: "P",
  },
];

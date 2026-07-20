// scripts/lib/starter-project.mjs
// P4: 新建项目的 starter project.json 生成逻辑 — 从 production-style-contract 读取风格配置

import {
  accentForStyle,
  normalizeStyleId,
  renderParams,
} from "./production-style-contract.mjs";
import { buildSkillShowcaseProjectFromScript } from "./script-project-generator.mjs";

/**
 * 根据用户输入生成可通过 VideoProjectSchema 校验的 starter project.json。
 * @param {string} projectId
 * @param {string} title
 * @param {string} spokenScript - 口播稿（≥20 字）
 * @param {'portrait'|'landscape'} orientation - accepted for API compatibility; production is portrait-only
 * @param {string} style - renderer-neutral palette preset
 * @param {string} keywords - 逗号/空格分隔的标签
 * @returns {Record<string, unknown>}
 */
export const buildStarterProject = (
  projectId,
  title,
  spokenScript,
  orientation = "portrait",
  style = "cyan-tech",
  keywords = "",
) => {
  const params = renderParams(style);
  const accents = accentForStyle(style);
  const project = buildSkillShowcaseProjectFromScript({
    scriptText: spokenScript,
    projectId,
    title,
    maxScenes: 8,
  });
  return {
    ...project,
    scenes: project.scenes.map((scene, index) => ({
      ...scene,
      payload: {
        ...scene.payload,
        accent: index % 2 === 0 ? accents.primary : accents.secondary,
        secondaryAccent:
          index % 2 === 0 ? accents.secondary : accents.primary,
      },
    })),
    render: {
      ...project.render,
      width: 1080,
      height: 1920,
      orientation: "portrait",
      captionStyle: params.captionStyle,
      showProjectLabel: false,
    },
  };
};

/**
 * 生成 POST /api/projects 用的 brief.json 合同
 */
export const buildBrief = (projectId, title, orientation, style) => {
  const accents = accentForStyle(style);
  return {
    productionId: projectId,
    title,
    primaryLink: "",
    platform: "douyin",
    format: {
      width: 1080,
      height: 1920,
      fps: 30,
      maxDurationSeconds: 180,
    },
    audience: ["AI 从业者", "产品经理", "创作者"],
    contentType: "技术教程",
    tone: normalizeStyleId(style) === "amber-editorial" ? "文艺解说" : "技术布道",
    structure: "钩子 -> 痛点 -> 方案 -> 步骤 -> 结论",
    visualStyle: {
      presetId: normalizeStyleId(style),
      palette: accents.palette,
      captionStyle: accents.captionStyle,
      showProjectLabel: accents.showProjectLabel,
      subtitles: "固定字幕样式",
      branding: "第一阶段不做强品牌化",
    },
    research: {
      sourcePriority: ["官方文档", "GitHub", "权威媒体"],
      socialPolicy: "只当线索，不当证据",
    },
    viewpointCandidates: [
      {
        id: "view-1",
        claim: "这条视频的关键价值是让观众看完即可上手。",
        whyItMatters: "作为本片主观点。",
      },
    ],
    selectedViewpointId: "view-1",
  };
};

/**
 * 生成 POST /api/projects 用的 script-pack.json 合同
 */
export const buildScriptPack = (projectId, title, spokenScript, keywords) => ({
  productionId: projectId,
  title,
  hook: spokenScript.slice(0, 120),
  selectedViewpoint: "这条视频的关键价值是让观众看完即可上手。",
  pain: "",
  solution: "",
  spokenScript,
  keywords: keywords || title,
});

/**
 * 生成 POST /api/projects 用的 asset-pack.json 合同
 */
export const buildAssetPack = (projectId) => ({
  productionId: projectId,
  publicPathPrefix: `projects/${projectId}`,
  strategy: {
    missingAssetPolicy: "用 Logo + 解释型图表降级",
    diagramPolicy: "自动选择",
    sourceScreenshotPolicy: "只截关键段落",
  },
  assets: [],
  sceneAssetPlan: {},
  missingAssets: [],
});

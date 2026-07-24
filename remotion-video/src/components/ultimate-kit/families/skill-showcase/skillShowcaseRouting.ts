import type {
  HeroTrack,
  HeroTrackKind,
  HeroShotKind,
  SkillBeatAction,
  SkillBeatShotPreset,
  SkillShowcaseBeat,
  SkillShowcaseProps,
  SkillShowcaseVariant,
} from "./types";

const VARIANT_HERO_KIND: Record<SkillShowcaseVariant, HeroTrackKind> = {
  intro: "generic-explainer",
  overview: "overview-matrix",
  coding: "rule-compare",
  remotion: "code-render",
  ppt: "slide-editor",
  illustration: "article-map",
  hyperframes: "video-agent",
  ui: "design-compare",
  outro: "system-summary",
  impeccable: "rule-compare",
  "frontend-design": "design-compare",
  "ux-pro": "design-compare",
  "cloud-design": "system-summary",
  generic: "generic-explainer",
};

const ENTITY_TARGETS: Record<HeroTrackKind, readonly string[]> = {
  "overview-matrix": [
    "skill-01",
    "skill-02",
    "skill-03",
    "skill-04",
    "skill-05",
    "skill-06",
  ],
  "rule-compare": [
    "bad-rule-01",
    "bad-rule-02",
    "bad-rule-03",
    "good-rule-02",
    "terminal-verify",
  ],
  "code-render": ["code-line-01", "code-line-02", "frame-track", "mp4-output"],
  "slide-editor": [
    "slide-01",
    "shape-object",
    "chart-object",
    "text-object",
    "export-result",
  ],
  "article-map": [
    "article-source",
    "article-body",
    "article-bridge",
    "article-action",
  ],
  "video-agent": [
    "input-html",
    "agent-run",
    "render-preview",
    "capability-matrix",
  ],
  "design-compare": [
    "before-surface",
    "type-token",
    "space-token",
    "color-token",
    "system-token",
  ],
  "system-summary": [
    "skill-karpathy",
    "skill-remotion",
    "skill-ppt",
    "skill-article",
    "skill-hyperframes",
    "skill-ui",
  ],
  "generic-explainer": ["input-node", "rule-node", "result-node"],
};

const ACTION_PRESET: Record<SkillBeatAction, SkillBeatShotPreset> = {
  spotlight: "kinetic-type",
  stamp: "focus-lock",
  trace: "pipeline-flow",
  compare: "split-wipe",
  counter: "particle-field",
  stack: "token-assembly",
  focus: "focus-lock",
  burst: "system-convergence",
};

const ACTION_SHOT: Record<SkillBeatAction, HeroShotKind> = {
  spotlight: "browser-demo",
  stamp: "config-check",
  trace: "flow-trace",
  compare: "before-after",
  counter: "test-report",
  stack: "asset-library",
  focus: "interface-audit",
  burst: "system-map",
};

const SHOT_META: Record<HeroShotKind, {
  environment: string;
  target: string;
  actionLabel: string;
  evidenceType: string;
}> = {
  "browser-demo": {environment: "Browser + DevTools", target: "viewport / DOM", actionLabel: "浏览器实操", evidenceType: "DOM 状态"},
  "terminal-execution": {environment: "Terminal + CI", target: "stdout / process", actionLabel: "终端执行", evidenceType: "命令输出"},
  "code-diff": {environment: "IDE + Diff", target: "changed file / diff hunk", actionLabel: "代码差异", evidenceType: "代码行"},
  "config-check": {environment: "Config Inspector", target: "config file / rule switch", actionLabel: "配置检查", evidenceType: "配置状态"},
  "interface-audit": {environment: "Browser + Inspector", target: "component / issue row", actionLabel: "界面审计", evidenceType: "DOM 状态"},
  "flow-trace": {environment: "Trace + Flow", target: "node graph / path", actionLabel: "流程追踪", evidenceType: "流程节点"},
  "test-report": {environment: "Test Runner", target: "test summary / assertions", actionLabel: "测试报告", evidenceType: "测试断言"},
  "asset-library": {environment: "Asset Library", target: "library grid / selected item", actionLabel: "素材库", evidenceType: "素材条目"},
  "system-map": {environment: "Architecture Workspace", target: "module graph / relation map", actionLabel: "系统图", evidenceType: "关系图"},
  "before-after": {environment: "Split Compare", target: "before / after split", actionLabel: "前后对照", evidenceType: "截图差异"},
  "metric-highlight": {environment: "Metric Stage", target: "value / unit / context", actionLabel: "指标强调", evidenceType: "明确数值"},
  "concept-explainer": {environment: "Editorial Stage", target: "claim / explanation / evidence", actionLabel: "概念解释", evidenceType: "语义证据"},
};

const shotKindForBeat = (beat: SkillShowcaseBeat): HeroShotKind => {
  const text = `${beat.keyword} ${beat.detail ?? ""} ${(beat.evidence ?? []).join(" ")}`;
  if (/系统图|架构|Prompt|Skill|Token|设计系统|模块|关系图/i.test(text)) return "system-map";
  if (/浏览器|DevTools|DOM|页面|viewport|web/i.test(text)) return "browser-demo";
  if (/终端|命令|npm|pnpm|yarn|shell|CI|执行|构建|安装|运行/i.test(text)) return "terminal-execution";
  if (/diff|git|代码行|文件变更|修改|删除|新增|patch|\bPR\b/i.test(text)) return "code-diff";
  if (/配置|JSON|YAML|AGENTS|env|环境变量|规则|开关|参数/i.test(text)) return "config-check";
  if (/审计|检查器|定位|扫描|问题|按钮/i.test(text)) return "interface-audit";
  if (/流程|链路|步骤|输入|输出|追踪|trace|流转|路径/i.test(text)) return "flow-trace";
  if (/测试|断言|通过|失败|回归|复检|验证/i.test(text)) return "test-report";
  if (/素材库|组件库|动画|模板|资源|素材|library/i.test(text)) return "asset-library";
  if (/对比|前后|之前|之后|旧.*新|不是.*而是|左边|右边|VS|变化/i.test(text)) return "before-after";
  return ACTION_SHOT[beat.action];
};

const shotEvidenceForBeat = (beat: SkillShowcaseBeat, kind: HeroShotKind) => {
  const evidence = (beat.evidence?.length ? beat.evidence : [beat.detail ?? beat.keyword])
    .filter((item): item is string => Boolean(item));
  if (kind === "terminal-execution") return ["npm run verify", "stdout: ok", "exit code 0"];
  if (kind === "code-diff") return ["- old line", "+ new line", evidence[0] ?? "diff hunk"];
  if (kind === "test-report") return [beat.value ? `${beat.value} 断言` : "test suite", "0 failed", "CI green"];
  if (kind === "flow-trace") return [evidence[0] ?? "输入", evidence[1] ?? "处理", evidence[2] ?? "输出"];
  if (kind === "before-after") return [evidence[0] ?? "Before", evidence[1] ?? "After", "Evidence"];
  return evidence.slice(0, 3);
};

const lensAndShotForBeat = (beat: SkillShowcaseBeat, stateIndex: number) => {
  const kind = shotKindForBeat(beat);
  const meta = SHOT_META[kind];
  const evidence = shotEvidenceForBeat(beat, kind);
  return {
    lens: {
      key: `${kind}:${stateIndex}`,
      objective: (beat.detail ?? beat.keyword).slice(0, 72),
      actionLabel: meta.actionLabel,
      signal: beat.visualState ?? beat.action,
      evidenceType: meta.evidenceType,
    },
    shot: {
      kind,
      environment: meta.environment,
      target: meta.target,
      before: kind === "before-after" ? evidence[0] : undefined,
      after: kind === "before-after" ? evidence[1] : undefined,
      command: kind === "terminal-execution" ? evidence[0] : undefined,
      path: kind === "code-diff" ? "src/change.ts" : kind === "config-check" ? "config.json" : undefined,
      log: kind === "test-report" ? evidence.join(" · ") : undefined,
      metric: kind === "test-report" ? beat.value ?? "100%" : undefined,
      status: "active",
      evidence,
    },
  };
};

const evidenceFor = (beats: readonly SkillShowcaseBeat[]) => {
  const evidence = beats.flatMap((beat) => beat.evidence ?? []).filter(Boolean);
  return evidence.length > 0
    ? [...new Set(evidence)].slice(0, 4)
    : beats.map((beat) => beat.keyword).slice(0, 4);
};

const cinematicPresetFor = (
  beats: readonly SkillShowcaseBeat[],
): SkillBeatShotPreset =>
  beats.find((beat) => beat.shotPreset)?.shotPreset ??
  ACTION_PRESET[beats[0]?.action ?? "spotlight"];

const synthesizeHeroTrack = (
  variant: SkillShowcaseVariant,
  beats: readonly SkillShowcaseBeat[],
): HeroTrack => {
  const kind = VARIANT_HERO_KIND[variant];
  const targets = ENTITY_TARGETS[kind];
  const stateCount = Math.max(1, Math.min(6, beats.length));
  const states = Array.from({ length: stateCount }, (_, stateIndex) => {
    const startIndex = Math.floor((stateIndex * beats.length) / stateCount);
    const endIndex = Math.max(
      startIndex + 1,
      Math.floor(((stateIndex + 1) * beats.length) / stateCount),
    );
    const group = beats.slice(startIndex, endIndex);
    const first = group[0] ?? beats[0];
    const last = group[group.length - 1] ?? first;
    const captionStartIndex = first?.captionStartIndex ?? startIndex;
    const captionEndIndex =
      last?.captionEndIndex ?? Math.max(captionStartIndex, endIndex - 1);
    const detail = group
      .map((beat) => beat.detail ?? beat.keyword)
      .filter(Boolean)
      .join(" / ");
    const primaryBeat = first ?? beats[0];
    const technical = primaryBeat ? lensAndShotForBeat(primaryBeat, stateIndex) : null;
    return {
      startFrame: first?.startFrame ?? 0,
      endFrame: last?.endFrame ?? Math.max(1, first?.endFrame ?? 1),
      captionStartIndex,
      captionEndIndex,
      label: first?.keyword ?? variant,
      detail: detail.slice(0, 120) || variant,
      evidence: technical?.shot.evidence ?? evidenceFor(group),
      entityTarget: targets[Math.min(stateIndex, targets.length - 1)],
      cinematicPreset: cinematicPresetFor(group),
      ...(technical ?? {}),
    };
  });

  return {
    kind,
    captionStartIndex: states[0]?.captionStartIndex ?? 0,
    captionEndIndex: states[states.length - 1]?.captionEndIndex ?? 0,
    states,
  };
};

export const ensureCinematicPresets = (
  beats: readonly SkillShowcaseBeat[],
): SkillShowcaseBeat[] =>
  beats.map((beat) => ({
    ...beat,
    shotPreset: beat.shotPreset ?? ACTION_PRESET[beat.action],
  }));

export type SkillShowcaseRenderPlan = {
  mode: "cinematic" | "hero-track-v2";
  beats: SkillShowcaseBeat[];
  heroTrack?: HeroTrack;
};

export const resolveSkillShowcaseRenderPlan = (
  props: SkillShowcaseProps,
  resolvedBeats: readonly SkillShowcaseBeat[],
): SkillShowcaseRenderPlan => {
  if (props.heroTrack || props.heroStyle === "hero-track-v2") {
    return {
      mode: "hero-track-v2",
      beats: ensureCinematicPresets(resolvedBeats),
      heroTrack:
        props.heroTrack ?? synthesizeHeroTrack(props.variant, resolvedBeats),
    };
  }

  const explicitlyCinematic =
    props.heroStyle === "cinematic" ||
    props.layoutSignature?.startsWith("portrait:cinematic-v4");

  if (explicitlyCinematic) {
    return { mode: "cinematic", beats: ensureCinematicPresets(resolvedBeats) };
  }

  return {
    mode: "hero-track-v2",
    beats: ensureCinematicPresets(resolvedBeats),
    heroTrack: synthesizeHeroTrack(props.variant, resolvedBeats),
  };
};

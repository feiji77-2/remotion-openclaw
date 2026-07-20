import type {
  HeroTrack,
  HeroTrackKind,
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
    return {
      startFrame: first?.startFrame ?? 0,
      endFrame: last?.endFrame ?? Math.max(1, first?.endFrame ?? 1),
      captionStartIndex,
      captionEndIndex,
      label: first?.keyword ?? variant,
      detail: detail.slice(0, 120) || variant,
      evidence: evidenceFor(group),
      entityTarget: targets[Math.min(stateIndex, targets.length - 1)],
      cinematicPreset: cinematicPresetFor(group),
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

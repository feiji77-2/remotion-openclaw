export type SkillShowcaseVariant =
  | "intro"
  | "overview"
  | "coding"
  | "remotion"
  | "ppt"
  | "illustration"
  | "hyperframes"
  | "ui"
  | "outro"
  | "impeccable"
  | "frontend-design"
  | "ux-pro"
  | "cloud-design"
  | "generic";

export type SkillShowcaseVisualMode =
  | "hero"
  | "grid"
  | "compare"
  | "process"
  | "metrics"
  | "quote";

export type SkillShowcaseNarrativeSignal = {
  key: string;
  family: string;
};

import type { SkillIconKey } from "./iconRegistry";
import type { ProductIconKey } from "./productIcons";

export type { SkillIconKey } from "./iconRegistry";
export type { ProductIconKey } from "./productIcons";

export type SkillBeatAction =
  | "spotlight"
  | "stamp"
  | "trace"
  | "compare"
  | "counter"
  | "stack"
  | "focus"
  | "burst";

export type SkillBeatMotionPreset =
  | "slow-rise"
  | "scan-lock"
  | "number-roll"
  | "split-reveal"
  | "card-regroup"
  | "icon-relay"
  | "focus-pulse"
  | "flash-cut";

export type SkillBeatPlacement = "bottom" | "body" | "highlight";

export type SkillBeatShotPreset =
  | "kinetic-type"
  | "split-wipe"
  | "particle-field"
  | "orbital-map"
  | "ui-scan"
  | "material-carousel"
  | "focus-lock"
  | "pipeline-flow"
  | "token-assembly"
  | "surface-morph"
  | "system-convergence";

export type SkillShowcaseHeroStyle = "cinematic" | "hero-track-v2";

export type HeroTrackKind =
  | "overview-matrix"
  | "rule-compare"
  | "code-render"
  | "slide-editor"
  | "article-map"
  | "video-agent"
  | "design-compare"
  | "system-summary"
  | "generic-explainer";

export type HeroTrackState = {
  startFrame: number;
  endFrame: number;
  captionStartIndex: number;
  captionEndIndex: number;
  label: string;
  detail: string;
  evidence?: string[];
  /** Stable ID for the exact visual entity that this spoken state controls. */
  entityTarget?: string;
  /** Motion transition selected from the cinematic visual library. */
  cinematicPreset?: SkillBeatShotPreset;
};

export type HeroTrack = {
  kind: HeroTrackKind;
  captionStartIndex: number;
  captionEndIndex: number;
  states: HeroTrackState[];
};

export type SkillShowcaseBeat = {
  startFrame: number;
  endFrame: number;
  captionStartIndex?: number;
  captionEndIndex?: number;
  keyword: string;
  icon: SkillIconKey;
  action: SkillBeatAction;
  visualState?: string;
  motionPreset?: SkillBeatMotionPreset;
  placement?: SkillBeatPlacement;
  shotPreset?: SkillBeatShotPreset;
  detail?: string;
  evidence?: string[];
  value?: string;
};

export interface SkillShowcaseProps {
  variant: SkillShowcaseVariant;
  title: string;
  subtitle?: string;
  index?: string;
  accent?: string;
  secondaryAccent?: string;
  bullets?: string[];
  labels?: string[];
  labelIcons?: SkillIconKey[];
  productIcon?: ProductIconKey;
  productIcons?: ProductIconKey[];
  brandName?: string;
  brandIcon?: ProductIconKey;
  eyebrow?: string;
  headline?: string;
  body?: string;
  footer?: string;
  progressIndex?: number;
  progressTotal?: number;
  visualMode?: SkillShowcaseVisualMode;
  heroStyle?: SkillShowcaseHeroStyle;
  narrativeSignal?: SkillShowcaseNarrativeSignal;
  layoutSignature?: string;
  captionStartIndex?: number;
  captionEndIndex?: number;
  sourceText?: string;
  beats?: SkillShowcaseBeat[];
  heroTrack?: HeroTrack;
}

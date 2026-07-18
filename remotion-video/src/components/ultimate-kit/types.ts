import type {UltimateAccentTone} from './tokens';
import type {BrandIconName} from '../BrandIcon';

export type UltimateStagePreset = 'opening' | 'data' | 'evidence' | 'climax' | 'cta';
export type UltimateHudMode = 'auto' | 'minimal' | 'terminal';

export interface UltimateSceneGrammar {
  archetype?: string;
  cameraIntent?: string;
  cameraMotion?: string;
  dataEvent?: string;
  enterFrames?: number;
  emphasisFrames?: number;
  staggerGap?: number;
  revealDirection?: string;
  memoryObject?: {
    type?: string;
    role?: string;
    enterFrame?: number;
    color?: string;
  };
  directorNote?: string;
}

export interface UltimateStageProps {
  children: React.ReactNode;
  warm?: boolean;
  showGrid?: boolean;
  family?: string;
  sceneIndex?: number;
  sceneDurationFrames?: number;
  stagePreset?: UltimateStagePreset;
  hudMode?: UltimateHudMode;
}

export interface UltimatePlatformOverlayProps {
  brand?: string;
  account?: string;
  searchLabel?: string;
  watermark?: string;
  family?: string;
  mode?: UltimateHudMode;
  accent?: UltimateAccentTone;
}

export interface UltimateHeroPanelProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: UltimateAccentTone;
  avatarLabel?: string;
  visualStyle?: 'classic' | 'morfeo';
  tag?: string;
  tagEmoji?: string;
  heroEmoji?: string;
  highlightedWord?: string;
  lines?: string[];
  brandIcon?: BrandIconName | string;
  brandLabel?: string;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateFeatureCardItem {
  title: string;
  eyebrow?: string;
  caption?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateFeatureCardRailProps {
  kicker?: string;
  heading: string;
  items: UltimateFeatureCardItem[];
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateFocusDiagramProps {
  eyebrow?: string;
  keyword: string;
  question?: string;
  description?: string;
  accent?: UltimateAccentTone;
  diagram?: 'framing' | 'rings' | 'scale';
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateStripItem {
  label: string;
  detail?: string;
  chips?: string[];
  layout?: 'wide' | 'regular';
  tag?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateNumberStripProps {
  count: string;
  heading: string;
  summary?: string;
  items: UltimateStripItem[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateStepItem {
  label: string;
  detail?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateStepFlowProps {
  heading: string;
  steps: UltimateStepItem[];
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateTimelineItem {
  label: string;
  title: string;
  detail?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateTimelineProps {
  heading: string;
  summary?: string;
  items: UltimateTimelineItem[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateCompareBoardRow {
  label: string;
  left: string;
  right: string;
  accent?: UltimateAccentTone;
}

export interface UltimateCompareBoardProps {
  heading: string;
  summary?: string;
  leftTitle: string;
  rightTitle: string;
  leftEyebrow?: string;
  rightEyebrow?: string;
  rows: UltimateCompareBoardRow[];
  leftAccent?: UltimateAccentTone;
  rightAccent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateTerminalPanelProps {
  heading: string;
  windowTitle?: string;
  command: string;
  outputs: string[];
  note?: string;
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateTagChip {
  label: string;
  accent?: UltimateAccentTone;
}

export interface UltimateTagMatrixProps {
  heading: string;
  tabs?: string[];
  activeTab?: string;
  items: UltimateTagChip[];
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateCodeLine {
  text: string;
  tone?: 'base' | 'muted' | 'accent';
}

export interface UltimateCodePanelProps {
  heading: string;
  filename?: string;
  lines: UltimateCodeLine[];
  highlightLine?: number;
  footer?: string;
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateMetricItem {
  label: string;
  value: string;
  ratio: number;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateMetricBarsProps {
  heading: string;
  summary?: string;
  items: UltimateMetricItem[];
  layout?: 'bars' | 'cards';
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateDataStreamItem {
  label: string;
  value: string;
  detail?: string;
  trend?: 'up' | 'steady' | 'alert';
  accent?: UltimateAccentTone;
}

export interface UltimateDataStreamProps {
  heading: string;
  summary?: string;
  items: UltimateDataStreamItem[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateEvidenceCard {
  source: string;
  quote: string;
  detail?: string;
  chips?: string[];
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateEvidenceWallProps {
  heading: string;
  summary?: string;
  cards: UltimateEvidenceCard[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateArchitectureNode {
  label: string;
  detail?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateArchitectureMapProps {
  heading: string;
  centerTitle: string;
  centerDetail?: string;
  nodes: UltimateArchitectureNode[];
  accent?: UltimateAccentTone;
  layout?: 'radial' | 'stack';
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateMemoryGraphNode {
  label: string;
  detail?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimateMemoryGraphProps {
  heading: string;
  summary?: string;
  centerTitle: string;
  centerDetail?: string;
  nodes: UltimateMemoryGraphNode[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimatePipelineStage {
  label: string;
  detail?: string;
  icon?: string;
  accent?: UltimateAccentTone;
}

export interface UltimatePipelineFlowProps {
  heading: string;
  summary?: string;
  stages: UltimatePipelineStage[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateBenchmarkItem {
  label: string;
  primaryValue: string;
  secondaryValue: string;
  primaryRatio: number;
  secondaryRatio: number;
  accent?: UltimateAccentTone;
}

export interface UltimateBenchmarkChartProps {
  heading: string;
  summary?: string;
  primaryLabel: string;
  secondaryLabel: string;
  items: UltimateBenchmarkItem[];
  /** 强调色 */
  accent?: UltimateAccentTone;
  /** 导演层 grammar（staggerGap / dataEvent / enterFrames）*/
  grammar?: UltimateSceneGrammar;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateQuoteHighlightProps {
  heading?: string;
  quote: string;
  attribution?: string;
  tags?: UltimateTagChip[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateGlossaryTermProps {
  heading: string;
  term: string;
  pronunciation?: string;
  definition: string;
  related?: UltimateTagChip[];
  accent?: UltimateAccentTone;
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateCtaPanelProps {
  heading: string;
  subtitle?: string;
  searchLabel?: string;
  badge?: string;
  highlights?: string[];
  directorMeta?: FamilyDirectorMeta;
}

export interface UltimateSubtitleBarProps {
  text?: string;
}

export interface FamilyDirectorMeta {
  adaptive: {
    density: { padding: number; spacing: number; scale: number };
    contrast: { sizeRatio: number; weightRatio: number; opacityRatio: number };
    energy: { duration: number; bounce: number; intensity: number; peakFrame?: number };
  };
  platform: string;
  /** 导演层元素动画 cue（可选）- 由 DirectorScoreOrchestrator 注入 */
  directorCue?: import('../../data/directorScore').ElementCue;
}

import type {UltimateAccentTone} from './tokens';

export interface UltimateStageProps {
  children: React.ReactNode;
  warm?: boolean;
  showGrid?: boolean;
}

export interface UltimatePlatformOverlayProps {
  brand?: string;
  account?: string;
  searchLabel?: string;
  watermark?: string;
}

export interface UltimateHeroPanelProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: UltimateAccentTone;
  avatarLabel?: string;
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
}

export interface UltimateFocusDiagramProps {
  eyebrow?: string;
  keyword: string;
  question?: string;
  description?: string;
  accent?: UltimateAccentTone;
  diagram?: 'framing' | 'rings' | 'scale';
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
}

export interface UltimateTerminalPanelProps {
  heading: string;
  windowTitle?: string;
  command: string;
  outputs: string[];
  note?: string;
  accent?: UltimateAccentTone;
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
}

export interface UltimateCtaPanelProps {
  heading: string;
  subtitle?: string;
  searchLabel?: string;
  badge?: string;
  highlights?: string[];
}

export interface UltimateSubtitleBarProps {
  text?: string;
}

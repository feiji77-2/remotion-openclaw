import { VIDEO1V4_CONTENT_MANIFEST as GENERATED_VIDEO1V4_CONTENT_MANIFEST } from './generated/contentManifest_v4h.generated';

export type ThemeColorToken = 'accent' | 'secondary' | 'tertiary' | 'danger';

export type Video1v4ShotId =
  | 'shot-01'
  | 'shot-02'
  | 'shot-03'
  | 'shot-04'
  | 'shot-05'
  | 'shot-06'
  | 'shot-07'
  | 'shot-08'
  | 'shot-09'
  | 'shot-10'
  | 'shot-11'
  | 'shot-12'
  | 'shot-13'
  | 'shot-14'
  | 'shot-15'
  | 'shot-16'
  | 'shot-17'
  | 'shot-18'
  | 'shot-19'
  | 'shot-20';

export interface OpeningShotContent {
  kind: 'opening';
  mainNumber: string;
  mainNumberLabel?: string;
  subtitle?: string;
  suspenseLine?: string;
  accentTone?: ThemeColorToken;
}

export interface ConceptShotContent {
  kind: 'concept';
  title: string;
  body: string;
  highlight?: string;
  accentTone?: ThemeColorToken;
}

export interface SplitComparisonShotContent {
  kind: 'split-comparison';
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
  leftTone?: ThemeColorToken;
  rightTone?: ThemeColorToken;
}

export interface BulletListShotContent {
  kind: 'bullet-list';
  title?: string;
  points: string[];
  iconType?: 'check' | 'arrow' | 'number' | 'dot';
  accentTone?: ThemeColorToken;
}

export interface LoopFlowShotContent {
  kind: 'loop-flow';
  openLoopSteps: string[];
  closedLoopSteps: string[];
  title?: string;
}

export interface SkillTreeNodeContent {
  label: string;
  x: number;
  y: number;
}

export interface SkillTreeShotContent {
  kind: 'skill-tree';
  title?: string;
  mainNumber: string;
  mainLabel: string;
  subInfo?: string;
  nodes: SkillTreeNodeContent[];
  accentTone?: ThemeColorToken;
}

export interface CTAShotContent {
  kind: 'cta';
  mainText?: string;
  subText?: string;
  ctaText?: string;
  accentTone?: ThemeColorToken;
}

export interface Shot10Metric {
  label: string;
  value: string;
  color: string;
  x: number;
  y: number;
}

export interface ChartSeriesPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  label: string;
  color: string;
  points: ChartSeriesPoint[];
}

export interface Shot10LegendItem {
  label: string;
  color: string;
}

export interface Shot10ProblemItem {
  label: string;
  color: string;
}

export interface TechAnalysisContent {
  kind: 'tech-analysis';
  topLabel: string;
  problemItems: Shot10ProblemItem[];
  summaryLabel: string;
  formulaIntro: string;
  formulaText: string;
  formulaSubline: string;
  yAxisLabel: string;
  legend: Shot10LegendItem[];
  metrics: Shot10Metric[];
  conclusionLabel: string;
  conclusionLines: string[];
  conclusionFootnote: string;
  template?: {
    particleColor?: string;
    chartTop?: string;
    conclusionLeft?: number;
    conclusionBottom?: number;
    beats?: {
      summaryStart?: number;
      problemStagger?: number;
      formulaStart?: number;
      chartStart?: number;
      conclusionStart?: number;
    };
    series?: ChartSeries[];
  };
}

export interface Shot17Tag {
  label: string;
  color: string;
  bg: string;
}

export interface SocialProofPostContent {
  kind: 'social-proof-post';
  community: string;
  authorMeta: string;
  postTitle: string;
  quote: string;
  engagementItems: string[];
  tags: Shot17Tag[];
  sourceLabel: string;
  footnote: string;
  template?: {
    accentColor?: string;
    postWidth?: number;
    cardOffsetY?: number;
    tagsBottom?: number;
    sourceTop?: number;
    sourceRight?: number;
    footnoteBottom?: number;
    beats?: {
      cardIntroDuration?: number;
      quoteStart?: number;
      quoteRevealDuration?: number;
      tagsStart?: number;
      tagsRevealDuration?: number;
      sourceStart?: number;
      sourceRevealDuration?: number;
    };
    highlightRanges?: Array<{
      start: number;
      end: number;
      color?: string;
    }>;
  };
}

export interface ClashPalette {
  bgStart: string;
  bgEnd: string;
  accent: string;
  subAccent: string;
  pulseRgb: string;
}

export interface PhilosophyClashContent {
  kind: 'philosophy-clash';
  leftHeadline: string;
  leftBrand: string;
  leftItems: string[];
  rightHeadline: string;
  rightBrand: string;
  rightItems: string[];
  centerLabel: string;
  template?: {
    splitRatio?: number;
    dividerColor?: string;
    centerAccentColor?: string;
    centerSecondaryColor?: string;
    beats?: {
      leftIntroDuration?: number;
      rightStart?: number;
      rightIntroDuration?: number;
      clashStart?: number;
      clashIntroDuration?: number;
    };
    leftPalette?: ClashPalette;
    rightPalette?: ClashPalette;
  };
}

export type Video1v4ShotContent =
  | OpeningShotContent
  | ConceptShotContent
  | SplitComparisonShotContent
  | BulletListShotContent
  | LoopFlowShotContent
  | SkillTreeShotContent
  | CTAShotContent
  | TechAnalysisContent
  | SocialProofPostContent
  | PhilosophyClashContent;

export const VIDEO1V4_CONTENT_MANIFEST: Record<Video1v4ShotId, Video1v4ShotContent> =
  GENERATED_VIDEO1V4_CONTENT_MANIFEST;

export const getVideo1v4ShotContent = (id: string): Video1v4ShotContent => {
  const content = VIDEO1V4_CONTENT_MANIFEST[id as Video1v4ShotId];

  if (!content) {
    throw new Error(`Missing Video1v4 content manifest entry for shot: ${id}`);
  }

  return content;
};

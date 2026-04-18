import type {
  ChartSeries,
  ClashPalette,
  PhilosophyClashContent,
  SocialProofPostContent,
  TechAnalysisContent,
} from '../data/contentManifest_v4h';

type TechSeriesTuple = [ChartSeries, ChartSeries, ...ChartSeries[]];

type SocialHighlightRange = {
  start: number;
  end: number;
  color: string;
};

type SocialHighlightTuple = [SocialHighlightRange, ...SocialHighlightRange[]];

export interface NormalizedTechAnalysisContent extends Omit<TechAnalysisContent, 'template'> {
  template: {
    particleColor: string;
    chartTop: string;
    conclusionLeft: number;
    conclusionBottom: number;
    beats: {
      summaryStart: number;
      problemStagger: number;
      formulaStart: number;
      chartStart: number;
      conclusionStart: number;
    };
    series: TechSeriesTuple;
  };
}

export interface NormalizedSocialProofPostContent extends Omit<SocialProofPostContent, 'template'> {
  template: {
    accentColor: string;
    postWidth: number;
    cardOffsetY: number;
    tagsBottom: number;
    sourceTop: number;
    sourceRight: number;
    footnoteBottom: number;
    beats: {
      cardIntroDuration: number;
      quoteStart: number;
      quoteRevealDuration: number;
      tagsStart: number;
      tagsRevealDuration: number;
      sourceStart: number;
      sourceRevealDuration: number;
    };
    highlightRanges: SocialHighlightTuple;
  };
}

export interface NormalizedPhilosophyClashContent extends Omit<PhilosophyClashContent, 'template'> {
  template: {
    splitRatio: number;
    dividerColor: string;
    centerAccentColor: string;
    centerSecondaryColor: string;
    beats: {
      leftIntroDuration: number;
      rightStart: number;
      rightIntroDuration: number;
      clashStart: number;
      clashIntroDuration: number;
    };
    leftPalette: ClashPalette;
    rightPalette: ClashPalette;
  };
}

const TECH_DEFAULT_BEATS = {
  summaryStart: 110,
  problemStagger: 40,
  formulaStart: 120,
  chartStart: 200,
  conclusionStart: 360,
};

const SOCIAL_DEFAULT_BEATS = {
  cardIntroDuration: 40,
  quoteStart: 40,
  quoteRevealDuration: 60,
  tagsStart: 240,
  tagsRevealDuration: 60,
  sourceStart: 280,
  sourceRevealDuration: 50,
};

const PHILOSOPHY_DEFAULT_BEATS = {
  leftIntroDuration: 70,
  rightStart: 100,
  rightIntroDuration: 100,
  clashStart: 280,
  clashIntroDuration: 80,
};

const DEFAULT_HIGHLIGHT_RANGE: SocialHighlightRange = {
  start: 20,
  end: 35,
  color: '#FFD700',
};

const DEFAULT_LEFT_PALETTE: ClashPalette = {
  bgStart: '#1a0a0a',
  bgEnd: '#2d0a0a',
  accent: '#FF4444',
  subAccent: '#FF8888',
  pulseRgb: '255,68,68',
};

const DEFAULT_RIGHT_PALETTE: ClashPalette = {
  bgStart: '#0a1a0a',
  bgEnd: '#0a2d0a',
  accent: '#00FF88',
  subAccent: '#88FFBB',
  pulseRgb: '0,255,136',
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeNumber = (
  value: unknown,
  fallback: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
) => {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

const normalizeFrame = (value: unknown, fallback: number, min = 0) =>
  Math.round(normalizeNumber(value, fallback, min));

const normalizeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const normalizeText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const normalizeSeriesPoints = (series: ChartSeries | undefined, fallback: ChartSeries): ChartSeries['points'] => {
  const points = series?.points;

  if (!Array.isArray(points) || points.length < 2) {
    return fallback.points;
  }

  return points.map((point, index) => ({
    x: normalizeNumber(point?.x, fallback.points[index]?.x ?? fallback.points[fallback.points.length - 1].x, 0, 100),
    y: normalizeNumber(point?.y, fallback.points[index]?.y ?? fallback.points[fallback.points.length - 1].y, 0, 100),
  }));
};

const normalizeSeries = (series: ChartSeries | undefined, fallback: ChartSeries): ChartSeries => ({
  label: normalizeText(series?.label, fallback.label),
  color: normalizeColor(series?.color, fallback.color),
  points: normalizeSeriesPoints(series, fallback),
});

const buildDefaultTechSeries = (content: TechAnalysisContent): TechSeriesTuple => [
  {
    label: content.legend[0]?.label ?? 'OpenClaw O(n²)',
    color: content.legend[0]?.color ?? '#FF4444',
    points: [
      { x: 0, y: 10 },
      { x: 30, y: 35 },
      { x: 60, y: 65 },
      { x: 85, y: 90 },
      { x: 100, y: 100 },
    ],
  },
  {
    label: content.legend[1]?.label ?? 'Hermes O(n)',
    color: content.legend[1]?.color ?? '#00FF88',
    points: [
      { x: 0, y: 90 },
      { x: 30, y: 70 },
      { x: 60, y: 45 },
      { x: 85, y: 25 },
      { x: 100, y: 15 },
    ],
  },
];

const normalizeHighlightRanges = (
  ranges: NonNullable<SocialProofPostContent['template']>['highlightRanges'],
): SocialHighlightTuple => {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return [DEFAULT_HIGHLIGHT_RANGE];
  }

  const normalized = ranges.map((range) => {
    const start = normalizeFrame(range?.start, DEFAULT_HIGHLIGHT_RANGE.start, 0);
    const end = Math.max(start, normalizeFrame(range?.end, DEFAULT_HIGHLIGHT_RANGE.end, start));
    return {
      start,
      end,
      color: normalizeColor(range?.color, DEFAULT_HIGHLIGHT_RANGE.color),
    };
  });

  return normalized as SocialHighlightTuple;
};

const normalizePalette = (palette: ClashPalette | undefined, fallback: ClashPalette): ClashPalette => ({
  bgStart: normalizeColor(palette?.bgStart, fallback.bgStart),
  bgEnd: normalizeColor(palette?.bgEnd, fallback.bgEnd),
  accent: normalizeColor(palette?.accent, fallback.accent),
  subAccent: normalizeColor(palette?.subAccent, fallback.subAccent),
  pulseRgb: normalizeColor(palette?.pulseRgb, fallback.pulseRgb),
});

export const normalizeTechAnalysisContent = (
  content: TechAnalysisContent,
): NormalizedTechAnalysisContent => {
  const rawBeats = content.template?.beats;
  const summaryStart = normalizeFrame(rawBeats?.summaryStart, TECH_DEFAULT_BEATS.summaryStart, 0);
  const formulaStart = Math.max(summaryStart + 1, normalizeFrame(rawBeats?.formulaStart, TECH_DEFAULT_BEATS.formulaStart, 1));
  const chartStart = Math.max(formulaStart + 1, normalizeFrame(rawBeats?.chartStart, TECH_DEFAULT_BEATS.chartStart, 2));
  const conclusionStart = Math.max(
    chartStart + 1,
    normalizeFrame(rawBeats?.conclusionStart, TECH_DEFAULT_BEATS.conclusionStart, 3),
  );
  const defaultSeries = buildDefaultTechSeries(content);
  const rawSeries = Array.isArray(content.template?.series) ? content.template?.series : [];
  const normalizedSeries = [
    normalizeSeries(rawSeries[0], defaultSeries[0]),
    normalizeSeries(rawSeries[1], defaultSeries[1]),
    ...rawSeries.slice(2).map((series, index) => normalizeSeries(series, defaultSeries[index % defaultSeries.length])),
  ] as TechSeriesTuple;

  return {
    ...content,
    template: {
      particleColor: normalizeColor(content.template?.particleColor, '#00d4ff'),
      chartTop: normalizeText(content.template?.chartTop, '15%'),
      conclusionLeft: normalizeNumber(content.template?.conclusionLeft, 60, 0, 900),
      conclusionBottom: normalizeNumber(content.template?.conclusionBottom, 160, 0, 900),
      beats: {
        summaryStart,
        problemStagger: normalizeFrame(rawBeats?.problemStagger, TECH_DEFAULT_BEATS.problemStagger, 1),
        formulaStart,
        chartStart,
        conclusionStart,
      },
      series: normalizedSeries,
    },
  };
};

export const normalizeSocialProofPostContent = (
  content: SocialProofPostContent,
): NormalizedSocialProofPostContent => {
  const rawBeats = content.template?.beats;

  return {
    ...content,
    template: {
      accentColor: normalizeColor(content.template?.accentColor, '#FF4500'),
      postWidth: normalizeNumber(content.template?.postWidth, 680, 420, 920),
      cardOffsetY: normalizeNumber(content.template?.cardOffsetY, -40, -320, 320),
      tagsBottom: normalizeNumber(content.template?.tagsBottom, 160, 0, 480),
      sourceTop: normalizeNumber(content.template?.sourceTop, 100, 0, 480),
      sourceRight: normalizeNumber(content.template?.sourceRight, 80, 0, 320),
      footnoteBottom: normalizeNumber(content.template?.footnoteBottom, 80, 0, 240),
      beats: {
        cardIntroDuration: normalizeFrame(rawBeats?.cardIntroDuration, SOCIAL_DEFAULT_BEATS.cardIntroDuration, 1),
        quoteStart: normalizeFrame(rawBeats?.quoteStart, SOCIAL_DEFAULT_BEATS.quoteStart, 0),
        quoteRevealDuration: normalizeFrame(rawBeats?.quoteRevealDuration, SOCIAL_DEFAULT_BEATS.quoteRevealDuration, 1),
        tagsStart: normalizeFrame(rawBeats?.tagsStart, SOCIAL_DEFAULT_BEATS.tagsStart, 0),
        tagsRevealDuration: normalizeFrame(rawBeats?.tagsRevealDuration, SOCIAL_DEFAULT_BEATS.tagsRevealDuration, 1),
        sourceStart: normalizeFrame(rawBeats?.sourceStart, SOCIAL_DEFAULT_BEATS.sourceStart, 0),
        sourceRevealDuration: normalizeFrame(rawBeats?.sourceRevealDuration, SOCIAL_DEFAULT_BEATS.sourceRevealDuration, 1),
      },
      highlightRanges: normalizeHighlightRanges(content.template?.highlightRanges),
    },
  };
};

export const normalizePhilosophyClashContent = (
  content: PhilosophyClashContent,
): NormalizedPhilosophyClashContent => {
  const rawBeats = content.template?.beats;
  const centerAccentColor = normalizeColor(content.template?.centerAccentColor, '#FFD700');
  const rightStart = normalizeFrame(rawBeats?.rightStart, PHILOSOPHY_DEFAULT_BEATS.rightStart, 1);
  const clashStart = Math.max(
    rightStart + 1,
    normalizeFrame(rawBeats?.clashStart, PHILOSOPHY_DEFAULT_BEATS.clashStart, 2),
  );

  return {
    ...content,
    template: {
      splitRatio: normalizeNumber(content.template?.splitRatio, 0.5, 0.32, 0.68),
      dividerColor: normalizeColor(content.template?.dividerColor, centerAccentColor),
      centerAccentColor,
      centerSecondaryColor: normalizeColor(content.template?.centerSecondaryColor, '#FF8800'),
      beats: {
        leftIntroDuration: normalizeFrame(rawBeats?.leftIntroDuration, PHILOSOPHY_DEFAULT_BEATS.leftIntroDuration, 1),
        rightStart,
        rightIntroDuration: normalizeFrame(rawBeats?.rightIntroDuration, PHILOSOPHY_DEFAULT_BEATS.rightIntroDuration, 1),
        clashStart,
        clashIntroDuration: normalizeFrame(rawBeats?.clashIntroDuration, PHILOSOPHY_DEFAULT_BEATS.clashIntroDuration, 1),
      },
      leftPalette: normalizePalette(content.template?.leftPalette, DEFAULT_LEFT_PALETTE),
      rightPalette: normalizePalette(content.template?.rightPalette, DEFAULT_RIGHT_PALETTE),
    },
  };
};

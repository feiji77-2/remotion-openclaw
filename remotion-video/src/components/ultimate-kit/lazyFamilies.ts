import { lazy } from 'react';

// Lazy-loaded family components for code splitting
// Each family is loaded on demand, reducing initial bundle size
// Components use named exports, so the import is re-mapped to { default } for React.lazy

export const LazyHeroPanel = lazy(() =>
  import('./families/UltimateHeroPanel').then((m) => ({default: m.UltimateHeroPanel})),
);
export const LazyFeatureCardRail = lazy(() =>
  import('./families/UltimateFeatureCardRail').then((m) => ({default: m.UltimateFeatureCardRail})),
);
export const LazyFocusDiagram = lazy(() =>
  import('./families/UltimateFocusDiagram').then((m) => ({default: m.UltimateFocusDiagram})),
);
export const LazyNumberStrip = lazy(() =>
  import('./families/UltimateNumberStrip').then((m) => ({default: m.UltimateNumberStrip})),
);
export const LazyStepFlow = lazy(() =>
  import('./families/UltimateStepFlow').then((m) => ({default: m.UltimateStepFlow})),
);
export const LazyTimeline = lazy(() =>
  import('./families/UltimateTimeline').then((m) => ({default: m.UltimateTimeline})),
);
export const LazyCompareBoard = lazy(() =>
  import('./families/UltimateCompareBoard').then((m) => ({default: m.UltimateCompareBoard})),
);
export const LazyTerminalPanel = lazy(() =>
  import('./families/UltimateTerminalPanel').then((m) => ({default: m.UltimateTerminalPanel})),
);
export const LazyEvidenceWall = lazy(() =>
  import('./families/UltimateEvidenceWall').then((m) => ({default: m.UltimateEvidenceWall})),
);
export const LazyArchitectureMap = lazy(() =>
  import('./families/UltimateArchitectureMap').then((m) => ({default: m.UltimateArchitectureMap})),
);
export const LazyTagMatrix = lazy(() =>
  import('./families/UltimateTagMatrix').then((m) => ({default: m.UltimateTagMatrix})),
);
export const LazyCodePanel = lazy(() =>
  import('./families/UltimateCodePanel').then((m) => ({default: m.UltimateCodePanel})),
);
export const LazyMetricBars = lazy(() =>
  import('./families/UltimateMetricBars').then((m) => ({default: m.UltimateMetricBars})),
);
export const LazyDataStream = lazy(() =>
  import('./families/UltimateDataStream').then((m) => ({default: m.UltimateDataStream})),
);
export const LazyBenchmarkChart = lazy(() =>
  import('./families/UltimateBenchmarkChart').then((m) => ({default: m.UltimateBenchmarkChart})),
);
export const LazyQuoteHighlight = lazy(() =>
  import('./families/UltimateQuoteHighlight').then((m) => ({default: m.UltimateQuoteHighlight})),
);
export const LazyGlossaryTerm = lazy(() =>
  import('./families/UltimateGlossaryTerm').then((m) => ({default: m.UltimateGlossaryTerm})),
);
export const LazyCtaPanel = lazy(() =>
  import('./families/UltimateCtaPanel').then((m) => ({default: m.UltimateCtaPanel})),
);
export const LazyMinimalHero = lazy(() =>
  import('./families/MinimalHero').then((m) => ({default: m.MinimalHero})),
);
export const LazyMinimalStepFlow = lazy(() =>
  import('./families/MinimalStepFlow').then((m) => ({default: m.MinimalStepFlow})),
);
export const LazyMinimalTagMatrix = lazy(() =>
  import('./families/MinimalTagMatrix').then((m) => ({default: m.MinimalTagMatrix})),
);
export const LazyMinimalNumberStrip = lazy(() =>
  import('./families/MinimalNumberStrip').then((m) => ({default: m.MinimalNumberStrip})),
);
export const LazyMinimalTimeline = lazy(() =>
  import('./families/MinimalTimeline').then((m) => ({default: m.MinimalTimeline})),
);
export const LazyMinimalCompareBoard = lazy(() =>
  import('./families/MinimalCompareBoard').then((m) => ({default: m.MinimalCompareBoard})),
);

// ── Spoken (口播驱动模式) ────────────────
export const LazySpokenTitle = lazy(() =>
  import('./families/SpokenTitle').then((m) => ({default: m.SpokenTitle})),
);
export const LazySpokenMetric = lazy(() =>
  import('./families/SpokenMetric').then((m) => ({default: m.SpokenMetric})),
);
export const LazySpokenProcess = lazy(() =>
  import('./families/SpokenProcess').then((m) => ({default: m.SpokenProcess})),
);
export const LazySpokenRanking = lazy(() =>
  import('./families/SpokenRanking').then((m) => ({default: m.SpokenRanking})),
);
export const LazySpokenCompare = lazy(() =>
  import('./families/SpokenCompare').then((m) => ({default: m.SpokenCompare})),
);
export const LazySpokenTags = lazy(() =>
  import('./families/SpokenTags').then((m) => ({default: m.SpokenTags})),
);
export const LazySpokenCode = lazy(() =>
  import('./families/SpokenCode').then((m) => ({default: m.SpokenCode})),
);
export const LazySpokenTakeaway = lazy(() =>
  import('./families/SpokenTitle').then((m) => ({default: m.SpokenTitle})),
);

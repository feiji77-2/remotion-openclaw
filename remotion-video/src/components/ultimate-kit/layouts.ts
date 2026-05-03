import type {ResolvedUltimateSceneConfig} from './project';

export const sceneMediaLayout: Partial<Record<ResolvedUltimateSceneConfig['family'], {
  top: number;
  right?: number;
  left?: number;
  width: number;
  height: number;
  opacity?: number;
  tiltDeg?: number;
  mode?: 'frame' | 'ambient';
}>> = {
  hero: {top: 248, right: 64, width: 520, height: 292, opacity: 0.28, tiltDeg: -2, mode: 'ambient'},
  focus: {top: 214, right: 94, width: 600, height: 338, opacity: 0.68, tiltDeg: -3},
  'feature-rail': {top: 198, right: 86, width: 520, height: 292, opacity: 0.22, tiltDeg: -2, mode: 'ambient'},
  timeline: {top: 178, left: 150, width: 1620, height: 520, opacity: 0.18, tiltDeg: 0, mode: 'ambient'},
  'compare-board': {top: 236, left: 138, width: 1644, height: 500, opacity: 0.16, tiltDeg: 0, mode: 'ambient'},
  metrics: {top: 300, right: 102, width: 704, height: 412, opacity: 0.88, tiltDeg: -2, mode: 'frame'},
  'evidence-wall': {top: 164, left: 122, width: 1676, height: 760, opacity: 0.14, tiltDeg: 0, mode: 'ambient'},
  'architecture-map': {top: 186, left: 160, width: 1600, height: 680, opacity: 0.14, tiltDeg: 0, mode: 'ambient'},
  'number-strip': {top: 198, left: 116, width: 1688, height: 560, opacity: 0.28, tiltDeg: 0, mode: 'ambient'},
  code: {top: 188, left: 778, width: 980, height: 608, opacity: 0.24, tiltDeg: -2, mode: 'ambient'},
  'data-stream': {top: 236, left: 210, width: 1500, height: 560, opacity: 0.16, tiltDeg: 0, mode: 'ambient'},
  'memory-graph': {top: 196, left: 160, width: 1600, height: 660, opacity: 0.14, tiltDeg: 0, mode: 'ambient'},
  'pipeline-flow': {top: 268, left: 140, width: 1640, height: 520, opacity: 0.16, tiltDeg: 0, mode: 'ambient'},
  'benchmark-chart': {top: 230, left: 180, width: 1560, height: 620, opacity: 0.16, tiltDeg: 0, mode: 'ambient'},
  'quote-highlight': {top: 180, left: 280, width: 1360, height: 640, opacity: 0.14, tiltDeg: 0, mode: 'ambient'},
  'glossary-term': {top: 214, left: 180, width: 1560, height: 620, opacity: 0.16, tiltDeg: 0, mode: 'ambient'},
  cta: {top: 174, left: 148, width: 1624, height: 540, opacity: 0.24, tiltDeg: 0, mode: 'ambient'},
};

export const sceneIconOrbitLayout: Partial<Record<ResolvedUltimateSceneConfig['family'], Array<{
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  badgeSize: number;
  size: number;
  rotate: number;
  delay: number;
  opacity?: number;
}>>> = {
  hero: [
    {top: 148, left: 124, badgeSize: 78, size: 30, rotate: -8, delay: 0, opacity: 0.9},
    {top: 178, right: 146, badgeSize: 84, size: 34, rotate: 7, delay: 6, opacity: 0.88},
    {bottom: 182, right: 254, badgeSize: 68, size: 26, rotate: -6, delay: 10, opacity: 0.84},
  ],
  focus: [
    {top: 214, right: 128, badgeSize: 76, size: 30, rotate: 8, delay: 0, opacity: 0.86},
    {bottom: 170, left: 116, badgeSize: 70, size: 26, rotate: -9, delay: 7, opacity: 0.82},
    {bottom: 228, right: 104, badgeSize: 60, size: 24, rotate: 5, delay: 12, opacity: 0.78},
  ],
  'number-strip': [
    {top: 238, right: 116, badgeSize: 72, size: 28, rotate: 8, delay: 0, opacity: 0.84},
    {bottom: 182, left: 120, badgeSize: 68, size: 24, rotate: -8, delay: 7, opacity: 0.82},
    {bottom: 212, right: 116, badgeSize: 62, size: 22, rotate: 5, delay: 13, opacity: 0.78},
  ],
  timeline: [
    {top: 206, left: 152, badgeSize: 70, size: 28, rotate: -8, delay: 0, opacity: 0.84},
    {top: 176, right: 164, badgeSize: 72, size: 28, rotate: 7, delay: 6, opacity: 0.84},
    {bottom: 168, right: 248, badgeSize: 60, size: 22, rotate: -5, delay: 12, opacity: 0.74},
  ],
  'compare-board': [
    {top: 230, left: 132, badgeSize: 74, size: 28, rotate: -8, delay: 0, opacity: 0.84},
    {top: 242, right: 132, badgeSize: 74, size: 28, rotate: 8, delay: 6, opacity: 0.84},
    {bottom: 170, left: 926, badgeSize: 58, size: 21, rotate: -3, delay: 12, opacity: 0.72},
  ],
  metrics: [
    {top: 236, right: 124, badgeSize: 76, size: 30, rotate: 7, delay: 0, opacity: 0.88},
    {bottom: 176, right: 152, badgeSize: 68, size: 26, rotate: -8, delay: 7, opacity: 0.82},
    {bottom: 208, left: 112, badgeSize: 62, size: 22, rotate: 6, delay: 12, opacity: 0.76},
  ],
  'evidence-wall': [
    {top: 192, left: 120, badgeSize: 74, size: 28, rotate: -8, delay: 0, opacity: 0.82},
    {top: 206, right: 138, badgeSize: 70, size: 26, rotate: 6, delay: 7, opacity: 0.8},
    {bottom: 134, left: 962, badgeSize: 58, size: 21, rotate: -4, delay: 12, opacity: 0.7},
  ],
  'architecture-map': [
    {top: 230, left: 148, badgeSize: 70, size: 28, rotate: -8, delay: 0, opacity: 0.82},
    {top: 152, right: 764, badgeSize: 74, size: 28, rotate: 4, delay: 6, opacity: 0.82},
    {bottom: 162, right: 160, badgeSize: 62, size: 22, rotate: 7, delay: 12, opacity: 0.72},
  ],
  code: [
    {top: 230, right: 124, badgeSize: 78, size: 31, rotate: 7, delay: 0, opacity: 0.88},
    {bottom: 182, right: 164, badgeSize: 66, size: 25, rotate: -7, delay: 7, opacity: 0.82},
    {bottom: 214, left: 126, badgeSize: 60, size: 22, rotate: 5, delay: 11, opacity: 0.76},
  ],
  'data-stream': [
    {top: 220, left: 142, badgeSize: 70, size: 28, rotate: -6, delay: 0, opacity: 0.82},
    {top: 220, right: 152, badgeSize: 70, size: 28, rotate: 6, delay: 6, opacity: 0.82},
    {bottom: 162, right: 262, badgeSize: 58, size: 22, rotate: -4, delay: 11, opacity: 0.74},
  ],
  'memory-graph': [
    {top: 210, left: 144, badgeSize: 72, size: 28, rotate: -7, delay: 0, opacity: 0.82},
    {top: 170, right: 144, badgeSize: 72, size: 28, rotate: 6, delay: 6, opacity: 0.82},
    {bottom: 156, left: 920, badgeSize: 60, size: 22, rotate: -2, delay: 12, opacity: 0.74},
  ],
  'pipeline-flow': [
    {top: 246, left: 132, badgeSize: 70, size: 28, rotate: -6, delay: 0, opacity: 0.82},
    {top: 246, right: 132, badgeSize: 70, size: 28, rotate: 6, delay: 6, opacity: 0.82},
    {bottom: 166, left: 926, badgeSize: 58, size: 22, rotate: -2, delay: 12, opacity: 0.72},
  ],
  'benchmark-chart': [
    {top: 230, left: 140, badgeSize: 70, size: 28, rotate: -6, delay: 0, opacity: 0.82},
    {top: 214, right: 140, badgeSize: 70, size: 28, rotate: 6, delay: 6, opacity: 0.82},
    {bottom: 170, right: 240, badgeSize: 58, size: 22, rotate: -3, delay: 12, opacity: 0.72},
  ],
  'quote-highlight': [
    {top: 216, left: 160, badgeSize: 66, size: 26, rotate: -5, delay: 0, opacity: 0.8},
    {top: 216, right: 160, badgeSize: 66, size: 26, rotate: 5, delay: 6, opacity: 0.8},
  ],
  'glossary-term': [
    {top: 220, left: 142, badgeSize: 70, size: 28, rotate: -6, delay: 0, opacity: 0.82},
    {top: 220, right: 142, badgeSize: 70, size: 28, rotate: 6, delay: 6, opacity: 0.82},
  ],
  cta: [
    {top: 202, left: 166, badgeSize: 72, size: 28, rotate: -8, delay: 0, opacity: 0.86},
    {top: 202, right: 166, badgeSize: 72, size: 28, rotate: 8, delay: 7, opacity: 0.86},
    {bottom: 170, left: 376, badgeSize: 60, size: 22, rotate: -4, delay: 12, opacity: 0.76},
  ],
};

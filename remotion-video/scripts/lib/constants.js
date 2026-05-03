// Shared constants for the Ultimate template system
// TODO: consolidate with constants.js in scripts/lib/ once adapter is fully migrated

const ULTIMATE_TEMPLATE = 'ultimate';
const ULTIMATE_VISUAL_SYSTEMS = new Set(['ultimate', 'ultimate-1080p', 'ultimate-kit', 'ultimate-scene']);
const ULTIMATE_DEFAULT_FPS = 30;
const ULTIMATE_DEFAULT_WIDTH = 1920;
const ULTIMATE_DEFAULT_HEIGHT = 1080;
const ULTIMATE_SCENE_FAMILIES = new Set([
  'hero',
  'feature-rail',
  'focus',
  'number-strip',
  'step-flow',
  'timeline',
  'compare-board',
  'terminal',
  'evidence-wall',
  'architecture-map',
  'tag-matrix',
  'code',
  'metrics',
  'data-stream',
  'memory-graph',
  'pipeline-flow',
  'benchmark-chart',
  'quote-highlight',
  'glossary-term',
  'cta',
]);
const ACCENT_ROTATION = ['cyan', 'green', 'yellow', 'orange', 'purple', 'red'];
const PLACEHOLDER_TEXT_RE = /^(?:数据点|关键词|补充|标签|summary|scene|item|slot|point)\s*[0-9a-zA-Z一二三四五六七八九十]*$/i;
const SUPPORT_MARKER_RE = /^(?:不是|而是|所以|因此|评论|下期)|第一次|全行业|解决|跑分|更稳|同一档|开源发布|最看重哪个|值不值/u;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Scene family layer mapping for rhythm-based family selection
// NOTE: registry.ts has the TypeScript source of truth — keep this JS version in sync
const RHYTHM_LAYER_MAP = new Map([
  ['hero', 'context'],
  ['cta', 'closing'],
  ['feature-rail', 'emphasis'],
  ['number-strip', 'emphasis'],
  ['architecture-map', 'structure'],
  ['memory-graph', 'structure'],
  ['pipeline-flow', 'structure'],
  ['timeline', 'structure'],
  ['step-flow', 'structure'],
  ['data-stream', 'emphasis'],
  ['compare-board', 'emphasis'],
  ['metrics', 'emphasis'],
  ['benchmark-chart', 'emphasis'],
  ['focus', 'context'],
  ['quote-highlight', 'context'],
  ['glossary-term', 'context'],
  ['evidence-wall', 'proof'],
  ['terminal', 'proof'],
  ['code', 'proof'],
  ['tag-matrix', 'structure'],
]);

// Diversity tracking for family selection
const SCENE_FAMILY_LIST = Array.from(ULTIMATE_SCENE_FAMILIES);
const DIVERSITY_EXCLUDED_FAMILIES = new Set(['hero', 'cta']);
const FAMILY_DIVERSITY_BITS = new Map(
  SCENE_FAMILY_LIST
    .filter((family) => !DIVERSITY_EXCLUDED_FAMILIES.has(family))
    .map((family, index) => [family, 1 << index]),
);

const SCENE_CYCLE = [
  'focus',
  'feature-rail',
  'architecture-map',
  'tag-matrix',
  'metrics',
  'timeline',
  'data-stream',
  'benchmark-chart',
  'memory-graph',
  'pipeline-flow',
  'glossary-term',
  'quote-highlight',
  'evidence-wall',
];

module.exports = {
  ULTIMATE_TEMPLATE,
  ULTIMATE_VISUAL_SYSTEMS,
  ULTIMATE_DEFAULT_FPS,
  ULTIMATE_DEFAULT_WIDTH,
  ULTIMATE_DEFAULT_HEIGHT,
  ULTIMATE_SCENE_FAMILIES,
  ACCENT_ROTATION,
  PLACEHOLDER_TEXT_RE,
  SUPPORT_MARKER_RE,
  MONTH_NAMES,
  RHYTHM_LAYER_MAP,
  SCENE_FAMILY_LIST,
  DIVERSITY_EXCLUDED_FAMILIES,
  FAMILY_DIVERSITY_BITS,
  SCENE_CYCLE,
};
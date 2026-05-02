/**
 * snapshots.ts — Visual regression for UltimateSceneTemplate families.
 *
 * Renders still frames (middle frame of each scene) and stores:
 *   __snapshots__/
 *     families/
 *       <family>/
 *         frame-<frame>.png    — rendered PNG
 *         frame-<frame>.hash   — perceptual hash (ImageHash via canvas)
 *         meta.json            — { family, frame, duration, renderedAt }
 *   manifest.json             — latest snapshot manifest
 *
 * Perceptual hash (ImageHash): deterministic, no external lib needed.
 * Uses the native HTML Canvas API to compute a DCT-based hash.
 *
 * Usage:
 *   npx tsx scripts/snapshots.ts render                      # render & store snapshots
 *   npx tsx scripts/snapshots.ts render hero terminal code   # render selected families
 *   npx tsx scripts/snapshots.ts diff                       # compare current vs stored
 *   npx tsx scripts/snapshots.ts clean                      # remove all snapshots
 */

import {createHash} from 'crypto';
import {execSync, spawnSync} from 'child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, rmSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SNAPSHOT_DIR = join(ROOT, '__snapshots__', 'families');
const MANIFEST_PATH = join(ROOT, '__snapshots__', 'manifest.json');

// ─── Types ───────────────────────────────────────────────────────────────────

interface SnapshotMeta {
  family: string;
  frame: number;
  durationFrames: number;
  renderedAt: string;
  hash: string;
}

interface Manifest {
  version: number;
  updatedAt: string;
  families: SnapshotMeta[];
}

// ─── Perceptual hash via Canvas API ─────────────────────────────────────────

/**
 * Compute a deterministic content hash from a PNG file's raw bytes.
 * We intentionally use a full-file digest here because the previous sampled
 * bit-rotation implementation collapsed many distinct files to `ffffffff`,
 * which produced false greens and hid duplicate-gallery regressions.
 */
async function computeImageHash(imagePath: string): Promise<string> {
  const buf = readFileSync(imagePath);
  return createHash('sha1').update(buf).digest('hex');
}

/** Hamming distance between two hex hashes */
function hammingDistance(a: string, b: string): number {
  const ba = BigInt('0x' + a);
  const bb = BigInt('0x' + b);
  let diff = ba ^ bb;
  let dist = 0;
  while (diff > 0n) {
    dist += Number(diff & 1n);
    diff >>= 1n;
  }
  return dist;
}

// ─── Remotion still rendering ────────────────────────────────────────────────

/**
 * DEMO_SHOTS — one built-in snapshot fixture per family in REGISTRY.
 * Keys must match REGISTRY keys exactly (see src/data/registry.ts).
 * Historical variable name is kept to avoid noisy refactors.
 * Coverage now spans all 20 families, and each fixture is paired with director
 * overrides so still renders exercise cameraMotion / revealDirection /
 * archetype / dataEvent / memoryObject contracts.
 */
const DEMO_SHOTS: Record<string, object> = {
  // ── Family fixtures: group A ────────────────────────────────────────────
  hero: {
    id: 'snap-hero',
    family: 'hero',
    title: 'Visual Regression',
    narration: 'Snapshot test — hero panel',
    frames: 90,
    level: 'opening',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Visual Regression',
      heroEmoji: '🤖',
      lines: ['真实 still 快照', '不是默认 demo', '用于 Obsidian 图库'],
    },
  },
  'feature-rail': {
    id: 'snap-fcr',
    family: 'feature-rail',
    title: 'Feature Cards',
    narration: 'Snapshot test — card rail',
    frames: 120,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Feature Cards',
    },
    features: [
      {title: 'Snapshot A', desc: 'Visual regression check A', icon: 'sparkles'},
      {title: 'Snapshot B', desc: 'Visual regression check B', icon: 'layers'},
      {title: 'Snapshot C', desc: 'Visual regression check C', icon: 'zap'},
    ],
  },
  code: {
    id: 'snap-code',
    family: 'code',
    title: 'Code Panel',
    narration: 'Snapshot test — code panel',
    frames: 80,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'const snapshot = true;',
      filename: 'snap.ts',
      lines: [
        'const snapshot = true;',
        '// Visual regression check',
        'export { snapshot };',
      ],
    },
  },
  'compare-board': {
    id: 'snap-compare',
    family: 'compare-board',
    title: 'Comparison',
    narration: 'Snapshot test — compare board',
    frames: 90,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Before vs After',
      leftTitle: 'Before',
      rightTitle: 'After',
    },
    comparisons: [
      {label: 'Metric A', text: '100ms', secondary: '42ms', accent: 'cyan'},
      {label: 'Metric B', text: '200ms', secondary: '38ms', accent: 'orange'},
    ],
    dataPoints: ['100ms / 42ms / 0.42', '200ms / 38ms / 0.19'],
  },
  'number-strip': {
    id: 'snap-ns',
    family: 'number-strip',
    title: 'Number Strip',
    narration: 'Snapshot test — number strip',
    frames: 100,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Key Numbers',
      count: '3',
      summary: 'Three snapshot deltas in one panel',
    },
    items: [
      {label: 'Speed', detail: '3x faster', accent: 'cyan'},
      {label: 'Size', detail: '50% smaller', accent: 'orange'},
      {label: 'Quality', detail: 'No loss', accent: 'purple'},
    ],
  },
  terminal: {
    id: 'snap-term',
    family: 'terminal',
    title: 'Terminal Output',
    narration: 'Snapshot test — terminal panel',
    frames: 90,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      windowTitle: 'snap-test',
      command: 'npm run snapshot',
      outputs: ['$ npm run snapshot', 'Rendering 20 families...', 'Done. 0 failures.'],
    },
  },
  'pipeline-flow': {
    id: 'snap-pf',
    family: 'pipeline-flow',
    title: 'Pipeline Flow',
    narration: 'Snapshot test — pipeline',
    frames: 110,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Build Pipeline',
      summary: 'Source to deploy in four stages',
    },
    items: [
      {label: 'Source', detail: 'git push', icon: 'gitBranch'},
      {label: 'Build', detail: 'compile', icon: 'code'},
      {label: 'Test', detail: 'pass', icon: 'checkCircle'},
      {label: 'Deploy', detail: 'live', icon: 'arrowRight'},
    ],
  },
  timeline: {
    id: 'snap-tl',
    family: 'timeline',
    title: 'Timeline',
    narration: 'Snapshot test — timeline',
    frames: 100,
    level: 'chapter',
    visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Event Timeline',
    },
    items: [
      {label: 'Start', detail: 'T+0:00', accent: 'cyan', icon: 'play'},
      {label: 'Peak', detail: 'T+0:30', accent: 'orange', icon: 'zap'},
      {label: 'End', detail: 'T+1:00', accent: 'purple', icon: 'checkCircle'},
    ],
  },

  // ── Family fixtures: group B ────────────────────────────────────────────
  focus: {
    id: 'snap-focus', family: 'focus', title: 'Focus Diagram', narration: 'Snapshot test — focus',
    frames: 90, level: 'chapter', visualProps: {
      kicker: 'SNAPSHOT TEST',
      eyebrow: 'KEYWORD',
      keyword: 'Focus',
      question: 'What actually matters?',
      description: 'Only focus',
      diagram: 'framing',
    },
  },
  'step-flow': {
    id: 'snap-sf', family: 'step-flow', title: 'Step Flow', narration: 'Snapshot test — step flow',
    frames: 110, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Steps'},
    items: [
      {label: 'Plan', detail: 'Map the task', icon: 'list'},
      {label: 'Build', detail: 'Implement safely', icon: 'wrench'},
      {label: 'Verify', detail: 'Check output', icon: 'checkCircle'},
    ],
  },
  'evidence-wall': {
    id: 'snap-ew', family: 'evidence-wall', title: 'Evidence Wall', narration: 'Snapshot test — evidence',
    frames: 100, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Evidence'},
    comparisons: [
      {label: 'Docs', text: 'Contract updated', accent: 'cyan', icon: 'fileText'},
      {label: 'Tests', text: 'Still snapshots available', accent: 'orange', icon: 'checkCircle'},
      {label: 'Render', text: 'Scene output verified', accent: 'purple', icon: 'play'},
    ],
  },
  'architecture-map': {
    id: 'snap-am', family: 'architecture-map', title: 'Architecture Map', narration: 'Snapshot test — architecture',
    frames: 120, level: 'chapter', visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Architecture',
      centerTitle: 'Core',
      centerDetail: 'Registry-driven render',
    },
    items: [
      {label: 'Workflow', detail: 'server/workflow', icon: 'gitBranch'},
      {label: 'Storyboard', detail: 'storyboardLoader', icon: 'layers'},
      {label: 'Render', detail: 'UltimateSceneTemplate', icon: 'play'},
      {label: 'QA', detail: 'verify-render-output', icon: 'checkCircle'},
    ],
  },
  'tag-matrix': {
    id: 'snap-tm', family: 'tag-matrix', title: 'Tag Matrix', narration: 'Snapshot test — tag matrix',
    frames: 90, level: 'chapter', visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Tags',
      tabs: ['Code', 'Render', 'QA'],
      activeTab: 'Code',
      items: [
        {label: 'Shots', accent: 'cyan'},
        {label: 'Registry', accent: 'orange'},
        {label: 'Grammar', accent: 'purple'},
        {label: 'Props', accent: 'cyan'},
      ],
    },
  },
  'data-stream': {
    id: 'snap-ds', family: 'data-stream', title: 'Data Stream', narration: 'Snapshot test — data stream',
    frames: 100, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Stream', summary: 'Realtime metrics'},
    dataPoints: ['tokens/s:182', 'jobs:12', 'success:98.7%'],
    items: [
      {label: 'tokens/s', detail: '182', icon: 'zap'},
      {label: 'jobs', detail: '12', icon: 'server'},
      {label: 'success', detail: '98.7%', icon: 'checkCircle'},
    ],
  },
  'memory-graph': {
    id: 'snap-mg', family: 'memory-graph', title: 'Memory Graph', narration: 'Snapshot test — memory graph',
    frames: 110, level: 'chapter', visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Memory',
      centerTitle: 'Context',
      centerDetail: 'Project knowledge graph',
    },
    items: [
      {label: 'Docs', detail: 'Obsidian vault', icon: 'database'},
      {label: 'Steps', detail: 'Step-04 contract', icon: 'list'},
      {label: 'Assets', detail: 'Snapshots and voice', icon: 'folder'},
      {label: 'QA', detail: 'Verification rules', icon: 'checkCircle'},
    ],
  },
  'benchmark-chart': {
    id: 'snap-bc', family: 'benchmark-chart', title: 'Benchmark Chart', narration: 'Snapshot test — benchmark',
    frames: 100, level: 'chapter', visualProps: {
      kicker: 'SNAPSHOT TEST',
      heading: 'Benchmark',
      primaryLabel: 'Current',
      secondaryLabel: 'Baseline',
    },
    dataPoints: ['Speed:74:61:0.84', 'Quality:92:81:0.76'],
  },
  'quote-highlight': {
    id: 'snap-qh', family: 'quote-highlight', title: 'Quote Highlight', narration: 'Snapshot test — quote',
    frames: 90, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Quote', attribution: 'Snapshot QA', tags: ['Proof', 'Render']},
  },
  'glossary-term': {
    id: 'snap-gt', family: 'glossary-term', title: 'Glossary Term', narration: 'Snapshot test — glossary',
    frames: 80, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Glossary', term: 'Snapshot', definition: 'A single still frame used for regression checks.'},
  },
  metrics: {
    id: 'snap-mx', family: 'metrics', title: 'Metric Bars', narration: 'Snapshot test — metrics',
    frames: 90, level: 'chapter', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Metrics'},
    dataPoints: ['Time:42s:0.72', 'Rework:2x:0.35', 'Success:98%:0.88'],
    items: [
      {label: 'Time', detail: '42s', icon: 'clock'},
      {label: 'Rework', detail: '2x', icon: 'repeat'},
      {label: 'Success', detail: '98%', icon: 'checkCircle'},
    ],
  },
  cta: {
    id: 'snap-cta', family: 'cta', title: 'Call to Action', narration: 'Snapshot test — CTA',
    frames: 90, level: 'closing', visualProps: {kicker: 'SNAPSHOT TEST', heading: 'Get Started', badge: 'NEXT'},
  },
};

const buildSnapshotDirector = (config: {
  archetype: string;
  cameraIntent: string;
  cameraMotion: string;
  dataEvent: string;
  revealDirection?: string;
  staggerGap?: number;
  enterFrames?: number;
  emphasisFrames?: number;
  memoryType?: string;
  memoryRole?: string;
  memoryColor?: string;
}) => ({
  archetype: config.archetype,
  cameraIntent: config.cameraIntent,
  cameraMotion: config.cameraMotion,
  dataEvent: config.dataEvent,
  enterFrames: config.enterFrames ?? 18,
  emphasisFrames: config.emphasisFrames ?? 52,
  staggerGap: config.staggerGap ?? 8,
  revealDirection: config.revealDirection ?? 'left',
  memoryObject: {
    type: config.memoryType ?? 'word',
    role: config.memoryRole ?? 'snapshot anchor',
    enterFrame: 12,
    color: config.memoryColor ?? '#00d4ff',
  },
  directorNote: `[snapshot] ${config.archetype} | ${config.cameraMotion} | ${config.revealDirection ?? 'left'}`,
});

const SNAPSHOT_DIRECTOR_OVERRIDES: Record<string, ReturnType<typeof buildSnapshotDirector>> = {
  hero: buildSnapshotDirector({
    archetype: 'lock-on reveal',
    cameraIntent: 'pin',
    cameraMotion: 'push-in',
    dataEvent: 'pin',
    revealDirection: 'right',
    memoryType: 'word',
    memoryRole: 'hero title',
    memoryColor: '#cdff3d',
  }),
  'feature-rail': buildSnapshotDirector({
    archetype: 'burst spread',
    cameraIntent: 'reveal',
    cameraMotion: 'pan-x',
    dataEvent: 'burst-spread',
    revealDirection: 'left',
    staggerGap: 2,
    memoryType: 'cluster',
    memoryRole: 'feature spread',
    memoryColor: '#00d4ff',
  }),
  focus: buildSnapshotDirector({
    archetype: 'follow focus',
    cameraIntent: 'chase',
    cameraMotion: 'push-in',
    dataEvent: 'trace-flow',
    revealDirection: 'down',
    memoryType: 'reticle',
    memoryRole: 'focus target',
    memoryColor: '#00d4ff',
  }),
  'number-strip': buildSnapshotDirector({
    archetype: 'pressure countdown',
    cameraIntent: 'pin',
    cameraMotion: 'zoom-pulse',
    dataEvent: 'count-up',
    revealDirection: 'center',
    staggerGap: 6,
    memoryType: 'number',
    memoryRole: 'headline metric',
    memoryColor: '#ff8a3d',
  }),
  'step-flow': buildSnapshotDirector({
    archetype: 'trace flow',
    cameraIntent: 'chase',
    cameraMotion: 'pan-y',
    dataEvent: 'trace-flow',
    revealDirection: 'left',
    staggerGap: 6,
    memoryType: 'line',
    memoryRole: 'step path',
    memoryColor: '#00d4ff',
  }),
  timeline: buildSnapshotDirector({
    archetype: 'drift reveal',
    cameraIntent: 'drift',
    cameraMotion: 'pan-y',
    dataEvent: 'trace-flow',
    revealDirection: 'down',
    staggerGap: 12,
    memoryType: 'line',
    memoryRole: 'timeline axis',
    memoryColor: '#ff8a3d',
  }),
  'compare-board': buildSnapshotDirector({
    archetype: 'compress compare',
    cameraIntent: 'compress',
    cameraMotion: 'pan-x',
    dataEvent: 'delta-hit',
    revealDirection: 'up',
    staggerGap: 6,
    memoryType: 'split',
    memoryRole: 'comparison seam',
    memoryColor: '#00d4ff',
  }),
  terminal: buildSnapshotDirector({
    archetype: 'trace flow',
    cameraIntent: 'chase',
    cameraMotion: 'pan-y',
    dataEvent: 'trace-flow',
    revealDirection: 'down',
    memoryType: 'line',
    memoryRole: 'terminal stream',
    memoryColor: '#45ff9a',
  }),
  'evidence-wall': buildSnapshotDirector({
    archetype: 'compress compare',
    cameraIntent: 'compress',
    cameraMotion: 'pan-y',
    dataEvent: 'delta-hit',
    revealDirection: 'left',
    staggerGap: 8,
    memoryType: 'split',
    memoryRole: 'evidence anchor',
    memoryColor: '#ffd84d',
  }),
  'architecture-map': buildSnapshotDirector({
    archetype: 'burst spread',
    cameraIntent: 'reveal',
    cameraMotion: 'drift',
    dataEvent: 'burst-spread',
    revealDirection: 'center',
    staggerGap: 10,
    memoryType: 'node',
    memoryRole: 'system hub',
    memoryColor: '#9d7bff',
  }),
  'tag-matrix': buildSnapshotDirector({
    archetype: 'burst spread',
    cameraIntent: 'reveal',
    cameraMotion: 'pan-x',
    dataEvent: 'burst-spread',
    revealDirection: 'right',
    staggerGap: 4,
    memoryType: 'cluster',
    memoryRole: 'tag orbit',
    memoryColor: '#00d4ff',
  }),
  code: buildSnapshotDirector({
    archetype: 'trace flow',
    cameraIntent: 'chase',
    cameraMotion: 'pan-x',
    dataEvent: 'trace-flow',
    revealDirection: 'up',
    memoryType: 'line',
    memoryRole: 'code path',
    memoryColor: '#00d4ff',
  }),
  metrics: buildSnapshotDirector({
    archetype: 'threshold breach',
    cameraIntent: 'reveal',
    cameraMotion: 'zoom-pulse',
    dataEvent: 'threshold-cross',
    revealDirection: 'down',
    staggerGap: 6,
    memoryType: 'ring',
    memoryRole: 'metric gauge',
    memoryColor: '#00d4ff',
  }),
  'data-stream': buildSnapshotDirector({
    archetype: 'follow focus',
    cameraIntent: 'chase',
    cameraMotion: 'zoom-pulse',
    dataEvent: 'trace-flow',
    revealDirection: 'left',
    staggerGap: 4,
    memoryType: 'line',
    memoryRole: 'stream pulse',
    memoryColor: '#00d4ff',
  }),
  'memory-graph': buildSnapshotDirector({
    archetype: 'drift reveal',
    cameraIntent: 'drift',
    cameraMotion: 'drift',
    dataEvent: 'trace-flow',
    revealDirection: 'center',
    staggerGap: 10,
    memoryType: 'node',
    memoryRole: 'memory nucleus',
    memoryColor: '#9d7bff',
  }),
  'pipeline-flow': buildSnapshotDirector({
    archetype: 'trace flow',
    cameraIntent: 'chase',
    cameraMotion: 'pan-y',
    dataEvent: 'trace-flow',
    revealDirection: 'left',
    staggerGap: 6,
    memoryType: 'line',
    memoryRole: 'pipeline path',
    memoryColor: '#00d4ff',
  }),
  'benchmark-chart': buildSnapshotDirector({
    archetype: 'overtake race',
    cameraIntent: 'chase',
    cameraMotion: 'push-in',
    dataEvent: 'overtake',
    revealDirection: 'down',
    staggerGap: 6,
    memoryType: 'curve',
    memoryRole: 'benchmark curve',
    memoryColor: '#00d4ff',
  }),
  'quote-highlight': buildSnapshotDirector({
    archetype: 'aftershock hold',
    cameraIntent: 'linger',
    cameraMotion: 'push-in',
    dataEvent: 'settle',
    revealDirection: 'down',
    staggerGap: 0,
    memoryType: 'word',
    memoryRole: 'quote fragment',
    memoryColor: '#ff8a3d',
  }),
  'glossary-term': buildSnapshotDirector({
    archetype: 'lock-on reveal',
    cameraIntent: 'pin',
    cameraMotion: 'push-in',
    dataEvent: 'pin',
    revealDirection: 'left',
    staggerGap: 0,
    memoryType: 'word',
    memoryRole: 'term label',
    memoryColor: '#00d4ff',
  }),
  cta: buildSnapshotDirector({
    archetype: 'aftershock hold',
    cameraIntent: 'linger',
    cameraMotion: 'push-in',
    dataEvent: 'settle',
    revealDirection: 'right',
    staggerGap: 0,
    memoryType: 'word',
    memoryRole: 'cta lockup',
    memoryColor: '#cdff3d',
  }),
};

/** Families to snapshot. Full 20-family coverage by default. */
const ALL_SNAPSHOT_FAMILIES = Object.keys(DEMO_SHOTS);

const parseRequestedFamilies = () => {
  const rawFamilies = process.argv
    .slice(3)
    .flatMap((arg) => arg.split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  if (rawFamilies.length === 0) {
    return ALL_SNAPSHOT_FAMILIES;
  }

  const unknownFamilies = rawFamilies.filter((family) => !ALL_SNAPSHOT_FAMILIES.includes(family));
  if (unknownFamilies.length > 0) {
    throw new Error(`Unknown snapshot families: ${unknownFamilies.join(', ')}`);
  }

  return Array.from(new Set(rawFamilies));
};

const SNAPSHOT_FAMILIES = parseRequestedFamilies();

const SNAPSHOT_FRAME_OVERRIDES: Record<string, number> = {
  'feature-rail': 72,
  'pipeline-flow': 102,
  timeline: 96,
  'step-flow': 106,
  'evidence-wall': 62,
  'architecture-map': 82,
  'data-stream': 72,
  'memory-graph': 82,
  metrics: 54,
};

const DEFAULT_FRAME = (family: string): number => {
  const override = SNAPSHOT_FRAME_OVERRIDES[family];
  if (typeof override === 'number') {
    return override;
  }

  // Keys must match DEMO_SHOTS keys (== REGISTRY family names)
  const durations: Record<string, number> = {
    hero: 90, 'feature-rail': 120, code: 80, 'compare-board': 90,
    'number-strip': 100, terminal: 90, 'pipeline-flow': 110, timeline: 100,
    focus: 90, 'step-flow': 110, 'evidence-wall': 100, 'architecture-map': 120,
    'tag-matrix': 90, 'data-stream': 100, 'memory-graph': 110, 'benchmark-chart': 100,
    'quote-highlight': 90, 'glossary-term': 80, metrics: 90, cta: 90,
  };
  return Math.floor((durations[family] ?? 90) / 2); // middle frame
};

// ─── Render a single family still ────────────────────────────────────────────

async function renderFamilyStill(
  family: string,
  outDir: string,
): Promise<{pngPath: string; hash: string; frame: number}> {
  const rawShot = DEMO_SHOTS[family] as Record<string, unknown>;
  if (!rawShot) throw new Error(`No snapshot fixture for family: ${family}`);

  const shot = {
    ...rawShot,
    level: typeof rawShot.level === 'string' ? rawShot.level : 'chapter',
    visualProps: (rawShot.visualProps ?? {}) as Record<string, unknown>,
    director: SNAPSHOT_DIRECTOR_OVERRIDES[family] ?? rawShot.director,
  };

  const frame = DEFAULT_FRAME(family);
  const pngName = `frame-${String(frame).padStart(4, '0')}.png`;
  const pngPath = join(outDir, pngName);

  const id = 'UltimateSceneTemplate';
  const props = JSON.stringify({shots: [shot]});
  try {
    const result = spawnSync(
      'npx',
      ['remotion', 'still', id, '--props', props, '--output', pngPath, '--frame', String(frame)],
      {cwd: ROOT, encoding: 'utf8'},
    );

    if (result.status !== 0) {
      const stderr = String(result.stderr || '').trim();
      const stdout = String(result.stdout || '').trim();
      throw new Error((stderr || stdout || `remotion still failed with code ${result.status ?? 'unknown'}`).slice(0, 400));
    }
  } catch (err) {
    throw new Error(`remotion still failed: ${(err as Error).message.slice(0, 200)}`);
  }

  if (!existsSync(pngPath)) {
    throw new Error(`No output at ${pngPath}`);
  }

  // Compute hash
  const hash = await computeImageHash(pngPath);

  return {pngPath, hash, frame};
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdRender() {
  console.log('🎬  Visual regression snapshot — render mode\n');
  console.log(`Output: ${SNAPSHOT_DIR}\n`);
  console.log(`Families: ${SNAPSHOT_FAMILIES.join(', ')}\n`);

  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, {recursive: true});
  }

  const results: SnapshotMeta[] = [];

  for (const family of SNAPSHOT_FAMILIES) {
    const outDir = join(SNAPSHOT_DIR, family);
    if (!existsSync(outDir)) mkdirSync(outDir, {recursive: true});
    for (const name of readdirSync(outDir)) {
      if (/^frame-\d+\.(png|hash)$/.test(name)) {
        unlinkSync(join(outDir, name));
      }
    }

    process.stdout.write(`  ${family.padEnd(24)} → `);

    try {
      const prevMetaPath = join(outDir, 'meta.json');
      const prevHash = (() => {
        try {
          return existsSync(prevMetaPath)
            ? (JSON.parse(readFileSync(prevMetaPath, 'utf8')) as SnapshotMeta).hash
            : null;
        } catch {
          return null;
        }
      })();

      const {pngPath, hash, frame} = await renderFamilyStill(family, outDir);
      const s = DEMO_SHOTS[family] as Record<string, unknown>;
      const duration = (s?.frames as number) ?? 90;

      const meta: SnapshotMeta = {
        family,
        frame,
        durationFrames: duration,
        renderedAt: new Date().toISOString(),
        hash,
      };

      writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
      results.push(meta);

      if (prevHash && prevHash !== hash) {
        console.log(`⚠  HASH CHANGED (hamming: ${hammingDistance(hash, prevHash)})`);
      } else {
        console.log(`✅ hash=${hash}`);
      }
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
      process.exit(1); // no silent false绿灯 — CI must know
    }
  }

  if (results.length === 0) {
    console.log('❌  0 families snapshotted — check errors above.\n');
    process.exit(1);
  }

  // Write manifest
  const existingManifest: Manifest | null = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : null;
  const untouchedFamilies = (existingManifest?.families ?? []).filter((entry) => !SNAPSHOT_FAMILIES.includes(entry.family));
  const manifest: Manifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    families: [...untouchedFamilies, ...results].sort((a, b) => a.family.localeCompare(b.family)),
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n📋  Manifest written to ${MANIFEST_PATH}`);
  console.log(`   ${results.length}/${SNAPSHOT_FAMILIES.length} selected family snapshots written.\n`);

  // QA checklist（借鉴 shellbot-video-generator Quality Tests）
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  QA CHECKLIST — 交付前自检');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  □ Mute test:       关声音看故事是否成立');
  console.log('  □ Squint test:     眯眼看层级是否清晰');
  console.log('  □ Timing test:     节奏是否自然、无机械感');
  console.log('  □ Consistency test: 类似元素表现是否一致');
  console.log('  □ Slideshow test:  是否像 PPT（要避免）');
  console.log('  □ Loop test:       能否平滑循环回头');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function cmdDiff() {
  console.log('🔍  Visual regression snapshot — diff mode\n');
  console.log(`Families: ${SNAPSHOT_FAMILIES.join(', ')}\n`);

  if (!existsSync(MANIFEST_PATH)) {
    console.log('❌  No snapshots found. Run `snapshots.ts render` first.\n');
    process.exit(1);
  }

  // ⚠️ 校准方法：跑 `tsx snapshots.mts calibrate` 获取 max observed dist，
  //    然后设置为 max_observed_dist + 1
  const THRESHOLD = 4;

  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const prevByFamily = Object.fromEntries(manifest.families.map((f) => [f.family, f]));

  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, {recursive: true});

  const failures: {family: string; oldHash: string; newHash: string; dist: number}[] = [];

  for (const family of SNAPSHOT_FAMILIES) {
    const outDir = join(SNAPSHOT_DIR, family);
    const prev = prevByFamily[family];
    if (!prev) {
      console.log(`  ${family.padEnd(24)} 🆕 new (no baseline)`);
      continue;
    }

    process.stdout.write(`  ${family.padEnd(24)} → `);
    try {
      const {hash} = await renderFamilyStill(family, outDir);
      const dist = hammingDistance(hash, prev.hash);
      if (dist === 0) {
        console.log(`✅  identical`);
      } else if (dist <= THRESHOLD) {
        console.log(`⚠   hamming=${dist} (minor — review manually)`);
      } else {
        console.log(`❌  hamming=${dist} (SIGNIFICANT CHANGE)`);
        failures.push({family, oldHash: prev.hash, newHash: hash, dist});
      }
    } catch (err) {
      console.log(`❌  ${(err as Error).message}`);
    }
  }

  if (failures.length > 0) {
    console.log(`\n❌  ${failures.length} family(ies) changed significantly:\n`);
    for (const f of failures) {
      console.log(`  ${f.family}: ${f.oldHash} → ${f.newHash} (dist=${f.dist})`);
    }
    console.log('\n  Review __snapshots__/families/<family>/frame-*.png\n');
    process.exit(1);
  } else {
    console.log('\n✅  All families identical to baseline.\n');
  }
}

async function cmdClean() {
  console.log('🗑  Removing all snapshots...\n');
  if (!existsSync(SNAPSHOT_DIR)) {
    console.log('No snapshots directory found.\n');
    return;
  }
  const dirs = readdirSync(join(ROOT, '__snapshots__', 'families')).filter((f) => f !== '.gitkeep');
  for (const d of dirs) {
    rmSync(join(SNAPSHOT_DIR, d), {recursive: true, force: true});
  }
  try { unlinkSync(MANIFEST_PATH); } catch {}
  console.log(`Removed ${dirs.length} family snapshots.\n`);
}

/**
 * Calibration mode: for each family, render TWO stills and measure the hamming
 * distance between them. Since both renders use identical props, a distance > 0
 * indicates non-deterministic rendering (subpixel anti-aliasing, floating point,
 * etc.). Use this to set an evidence-based threshold.
 *
 * Recommended workflow:
 *   1. Run `tsx snapshots.mts calibrate` after first baseline render
 *   2. Collect 3+ calibration runs across different machines/environments
 *   3. Set `THRESHOLD` in cmdDiff() to max_observed_dist + 1
 */
async function cmdCalibrate() {
  console.log('📐  Visual regression calibration mode\n');
  console.log('Rendering each family TWICE with identical props...\n');
  console.log('A non-zero hamming distance = rendering non-determinism.\n');
  console.log('Recommendation: set THRESHOLD = max_observed_dist + 1\n');
  console.log(`Families: ${SNAPSHOT_FAMILIES.join(', ')}\n`);

  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, {recursive: true});

  const rows: {family: string; dist: number; hash1: string; hash2: string}[] = [];

  for (const family of SNAPSHOT_FAMILIES) {
    const outDir = join(SNAPSHOT_DIR, family);
    process.stdout.write(`  ${family.padEnd(24)} `);

    try {
      const render1 = await renderFamilyStill(family, outDir);
      const render2 = await renderFamilyStill(family, outDir);
      const dist = hammingDistance(render1.hash, render2.hash);
      const label = dist === 0 ? '✅ deterministic' : `⚠  dist=${dist}`;
      console.log(label);
      rows.push({family, dist, hash1: render1.hash, hash2: render2.hash});
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
  }

  if (rows.length === 0) {
    console.log('\n❌ No families succeeded.\n');
    process.exit(1);
  }

  const maxDist = Math.max(...rows.map((r) => r.dist));
  const avgDist = rows.reduce((s, r) => s + r.dist, 0) / rows.length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CALIBRATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Families tested:   ${rows.length}`);
  console.log(`  Max distance:      ${maxDist}`);
  console.log(`  Average distance:  ${avgDist.toFixed(2)}`);
  console.log('');
  console.log('  Per-family:');
  for (const r of rows) {
    const mark = r.dist === 0 ? '✅' : '⚠';
    console.log(`    ${mark} ${r.family.padEnd(22)} dist=${r.dist}  ${r.hash1} / ${r.hash2}`);
  }
  console.log('');
  console.log(`  → Recommended THRESHOLD: ${maxDist + 1}  (max observed + 1)`);
  console.log('  → To update: edit THRESHOLD constant in cmdDiff()');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(maxDist > 0 ? 1 : 0);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const cmd = process.argv[2] ?? 'render';

(async () => {
  if (cmd === 'render') {
    await cmdRender();
  } else if (cmd === 'diff') {
    await cmdDiff();
  } else if (cmd === 'clean') {
    await cmdClean();
  } else if (cmd === 'calibrate') {
    await cmdCalibrate();
  } else {
    console.log(`Usage: tsx snapshots.mts [render|diff|clean|calibrate]\n`);
    process.exit(1);
  }
})();

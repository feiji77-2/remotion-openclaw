import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {afterEach, describe, expect, it} from 'vitest';
import {
  aggregateImageMetrics,
  buildVisualMetricsReport,
  decodePngBuffer,
  measureImageFile,
  measureProject,
} from '../visual-metrics.mjs';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');
const tempRoots = [];

const chunk = (type, data = Buffer.alloc(0)) => {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, data, Buffer.alloc(4)]);
};

const testPng = (width, height, pixels) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = pixels[sourceOffset];
      sourceOffset += 1;
      Buffer.from(pixel).copy(raw, rowOffset + 1 + x * 4);
    }
  }

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND'),
  ]);
};

afterEach(() => {
  tempRoots.splice(0).forEach((root) => rmSync(root, {recursive: true, force: true}));
});

describe('visual metrics', () => {
  it('computes black ratio, color count, edge proxy, and brightness for a deterministic PNG', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'visual-metrics-'));
    tempRoots.push(root);
    const imagePath = path.join(root, 'threshold.png');
    writeFileSync(imagePath, testPng(2, 2, [
      [0, 0, 0, 255],
      [24, 29, 44, 255],
      [25, 29, 44, 255],
      [255, 255, 255, 255],
    ]));

    const decoded = decodePngBuffer(testPng(1, 1, [[10, 20, 30, 255]]));
    expect(decoded).toMatchObject({width: 1, height: 1, decoder: 'png'});

    const metrics = measureImageFile(imagePath);
    expect(metrics).toMatchObject({
      width: 2,
      height: 2,
      pixels: 4,
      blackPixels: 2,
      blackPixelRatio: 0.5,
      sampledColorCount: 4,
      sampledColorGrid: {width: 2, height: 2},
      decoder: 'png',
    });
    expect(metrics.edgeDensity).toBeGreaterThan(90);
    expect(metrics.brightnessMean).toBeGreaterThan(75);
    expect(metrics.brightnessMean).toBeLessThan(90);
  });

  it('aggregates brightness swing across input frames', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'visual-metrics-'));
    tempRoots.push(root);
    const blackPath = path.join(root, 'black.png');
    const whitePath = path.join(root, 'white.png');
    writeFileSync(blackPath, testPng(2, 2, Array.from({length: 4}, () => [0, 0, 0, 255])));
    writeFileSync(whitePath, testPng(2, 2, Array.from({length: 4}, () => [255, 255, 255, 255])));

    const metrics = [measureImageFile(blackPath), measureImageFile(whitePath)];
    expect(aggregateImageMetrics(metrics)).toMatchObject({
      count: 2,
      blackPixelRatio: {min: 0, max: 1, mean: 0.5},
      sampledColorCount: {min: 1, max: 1, mean: 1},
      brightness: {minFrameMean: 0, maxFrameMean: 255, swing: 255},
    });
  });

  it('reports layout signatures and template usage from project JSON data', () => {
    const project = {
      projectId: 'metrics-project',
      title: 'Metrics Project',
      visualSystem: {variant: 'cinematic-tech', pacing: 'balanced', platform: 'portrait'},
      scenes: [
        {id: 's1', family: 'skill-showcase', payload: {layoutSignature: 'portrait:hero-track-v2:tag-matrix'}},
        {id: 's2', family: 'skill-showcase', payload: {layoutSignature: 'portrait:hero-track-v2:tag-matrix'}},
        {id: 's3', family: 'skill-showcase', payload: {visualMode: 'quote'}},
      ],
      visualPlan: {
        entries: [
          {
            id: 'e1',
            sceneId: 's1',
            componentId: 'browser-demo',
            resolution: 'matched',
            shot: {kind: 'browser-demo'},
            director: {
              scenePrimitive: 'editor-canvas-demo',
              layoutSignature: 'portrait:hero-track-v2:browser-demo',
              motionPreset: 'focus-lock',
              transitionPreset: 'ambient-fade',
              density: 'medium',
            },
          },
          {
            id: 'e2',
            sceneId: 's2',
            componentId: 'browser-demo',
            resolution: 'matched',
            shot: {kind: 'browser-demo'},
            director: {
              scenePrimitive: 'editor-canvas-demo',
              layoutSignature: 'portrait:hero-track-v2:browser-demo',
              motionPreset: 'stage-breathe',
              transitionPreset: 'focus-handoff',
              density: 'high',
            },
          },
          {
            id: 'e3',
            sceneId: 's3',
            componentId: 'quote-callout',
            resolution: 'fallback',
            shot: {kind: 'quote-callout'},
            director: {
              scenePrimitive: 'quote-close',
              layoutSignature: 'portrait:hero-track-v2:quote-callout',
              motionPreset: 'quote-snap',
              transitionPreset: 'stage-slide',
              density: 'low',
            },
          },
        ],
      },
    };

    const metrics = measureProject(project);
    expect(metrics.visualSystem).toEqual(project.visualSystem);
    expect(metrics.layoutSignatures).toMatchObject({
      uniqueCount: 2,
      maxRun: 2,
      usage: [
        {id: 'portrait:hero-track-v2:tag-matrix', count: 2},
        {id: 'visual:quote', count: 1},
      ],
    });
    expect(metrics.templateUsage).toMatchObject({
      source: 'visualPlan.entries',
      totalEntries: 3,
      uniqueCount: 2,
      maxRun: 2,
      unresolvedEntries: ['e3'],
      genericExplainerCount: 0,
    });
    expect(metrics.templateUsage.usage[0]).toEqual({id: 'browser-demo', count: 2});
    expect(metrics.directorGrammar).toMatchObject({
      source: 'visualPlan.entries',
      totalEntries: 3,
      scenePrimitives: {
        uniqueCount: 2,
        maxRun: 2,
        usage: [
          {id: 'editor-canvas-demo', count: 2},
          {id: 'quote-close', count: 1},
        ],
      },
      motionPresets: {
        uniqueCount: 3,
        maxRun: 1,
      },
      transitionPresets: {
        uniqueCount: 3,
        maxRun: 1,
      },
    });
    expect(metrics.directorGrammar.motionPresets.usage).toEqual([
      {id: 'focus-lock', count: 1},
      {id: 'quote-snap', count: 1},
      {id: 'stage-breathe', count: 1},
    ]);
    expect(metrics.directorGrammar.transitionPresets.usage).toEqual([
      {id: 'ambient-fade', count: 1},
      {id: 'focus-handoff', count: 1},
      {id: 'stage-slide', count: 1},
    ]);
  });

  it('falls back to hero track state directors when visualPlan is absent', () => {
    const fallbackMetrics = measureProject({
      projectId: 'hero-state-project',
      visualSystem: {variant: 'editorial-lightcut', pacing: 'explainer', platform: 'portrait'},
      scenes: [{
        id: 's1',
        family: 'skill-showcase',
        payload: {
          heroTrack: {
            states: [{
              visualPlanEntryId: 'state-1',
              componentId: 'terminal-execution',
              resolution: 'matched',
              director: {
                scenePrimitive: 'code-or-terminal-evidence',
                layoutSignature: 'portrait:hero-track-v2:terminal-execution',
                motionPreset: 'path-draw',
                transitionPreset: 'focus-handoff',
                density: 'medium',
              },
            }],
          },
        },
      }],
    });

    expect(fallbackMetrics.visualSystem).toEqual({
      variant: 'editorial-lightcut',
      pacing: 'explainer',
      platform: 'portrait',
    });
    expect(fallbackMetrics.templateUsage).toMatchObject({
      source: 'payload.heroTrack.states',
      totalEntries: 1,
      usage: [{id: 'terminal-execution', count: 1}],
    });
    expect(fallbackMetrics.directorGrammar).toMatchObject({
      source: 'payload.heroTrack.states',
      totalEntries: 1,
      scenePrimitives: {usage: [{id: 'code-or-terminal-evidence', count: 1}]},
      motionPresets: {usage: [{id: 'path-draw', count: 1}]},
      transitionPresets: {usage: [{id: 'focus-handoff', count: 1}]},
    });
  });

  it('prints a JSON report from the CLI', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'visual-metrics-'));
    tempRoots.push(root);
    const imagePath = path.join(root, 'frame.png');
    const projectPath = path.join(root, 'project.json');
    writeFileSync(imagePath, testPng(1, 1, [[255, 255, 255, 255]]));
    writeFileSync(projectPath, JSON.stringify({
      projectId: 'cli-project',
      title: 'CLI Project',
      visualSystem: {variant: 'product-console', pacing: 'fast', platform: 'portrait'},
      scenes: [{id: 's1', family: 'skill-showcase', payload: {layoutSignature: 'portrait:hero-track-v2:metric-strip'}}],
      visualPlan: {
        entries: [{
          id: 'e1',
          sceneId: 's1',
          componentId: 'metric-highlight',
          resolution: 'matched',
          director: {
            scenePrimitive: 'metric-spike',
            layoutSignature: 'portrait:hero-track-v2:metric-strip',
            motionPreset: 'number-roll',
            transitionPreset: 'focus-handoff',
            density: 'high',
          },
        }],
      },
    }));

    const result = spawnSync(process.execPath, [
      path.join(PROJECT_ROOT, 'scripts/visual-metrics.mjs'),
      '--project',
      projectPath,
      '--image',
      imagePath,
    ], {cwd: PROJECT_ROOT, encoding: 'utf8'});

    expect(result.status, result.stderr || result.stdout).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      ok: true,
      schemaVersion: 1,
      images: {count: 1},
      project: {
        projectId: 'cli-project',
        visualSystem: {variant: 'product-console', pacing: 'fast', platform: 'portrait'},
        layoutSignatures: {uniqueCount: 1},
        templateUsage: {uniqueCount: 1},
        directorGrammar: {
          source: 'visualPlan.entries',
          totalEntries: 1,
          scenePrimitives: {uniqueCount: 1},
          motionPresets: {uniqueCount: 1},
          transitionPresets: {uniqueCount: 1},
        },
      },
    });
  });

  it('builds an empty-image project report without treating missing images as success evidence', () => {
    const report = buildVisualMetricsReport({
      project: {
        projectId: 'project-only',
        scenes: [],
        visualPlan: {entries: []},
      },
    });

    expect(report.images).toMatchObject({
      count: 0,
      aggregate: {
        count: 0,
        blackPixelRatio: null,
        edgeDensity: null,
        sampledColorCount: null,
        brightness: null,
      },
    });
    expect(report.project.projectId).toBe('project-only');
  });
});

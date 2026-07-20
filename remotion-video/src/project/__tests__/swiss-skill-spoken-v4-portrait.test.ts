import {describe, expect, it} from 'vitest';
import landscapeFixture from '../../../examples/swiss-skill-spoken-v3.json';
import fixture from '../../../examples/swiss-skill-spoken-v4-portrait.json';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';

describe('swiss skill spoken v4 portrait', () => {
  it('compiles a 9:16 cinematic timeline with 22 mapped shots', () => {
    const project = VideoProjectSchema.parse(structuredClone(fixture));
    const compiled = compileProject(project);

    expect(compiled).toMatchObject({
      projectId: 'swiss-skill-spoken-v4-portrait',
      width: 1080,
      height: 1920,
      durationInFrames: 1803,
      orientation: 'portrait',
      qualityMode: 'cinematic',
      captionStyle: 'editorial',
    });
    expect(compiled.audioTracks).toEqual([
      expect.objectContaining({kind: 'voice', volume: 1}),
    ]);

    const signatures = compiled.scenes.map((scene) => String(scene.payload.layoutSignature));
    expect(signatures).toHaveLength(6);
    expect(signatures.every((signature) => signature.startsWith('portrait:cinematic-v4:'))).toBe(true);
    expect(new Set(signatures).size).toBe(6);

    const beats = compiled.scenes.flatMap((scene) => scene.payload.beats as Array<{
      startFrame: number;
      endFrame: number;
      captionStartIndex: number;
      captionEndIndex: number;
      shotPreset: string;
      heroPreset: string;
    }>);
    expect(beats).toHaveLength(22);
    expect(compiled.scenes.every((scene) => scene.payload.heroStyle === 'tech-explainer')).toBe(true);
    expect(new Set(beats.map((beat) => beat.shotPreset))).toEqual(new Set([
      'kinetic-type',
      'split-wipe',
      'particle-field',
      'orbital-map',
      'ui-scan',
      'material-carousel',
      'focus-lock',
      'pipeline-flow',
      'token-assembly',
      'surface-morph',
      'system-convergence',
    ]));
    expect(new Set(beats.map((beat) => beat.heroPreset))).toEqual(new Set([
      'browser-demo',
      'terminal-run',
      'code-diff',
      'config-inspector',
      'ui-audit',
      'workflow-trace',
      'test-report',
      'asset-gallery',
      'system-map',
      'before-after',
    ]));
    expect(beats.every((beat, index) => (
      beat.endFrame > beat.startFrame
      && beat.captionStartIndex === index
      && beat.captionEndIndex === index
      && (index === 0 || beat.shotPreset !== beats[index - 1]?.shotPreset)
    ))).toBe(true);
  });

  it('keeps the existing v3 project on the landscape renderer', () => {
    const project = VideoProjectSchema.parse(structuredClone(landscapeFixture));
    const compiled = compileProject(project);
    expect(compiled).toMatchObject({
      projectId: 'swiss-skill-spoken-v3',
      width: 1920,
      height: 1080,
      orientation: 'landscape',
    });
    const beats = compiled.scenes.flatMap((scene) => scene.payload.beats as Array<{shotPreset?: string}>);
    expect(beats.every((beat) => beat.shotPreset === undefined)).toBe(true);
    expect(compiled.scenes.every((scene) => scene.payload.heroStyle === undefined)).toBe(true);
  });
});

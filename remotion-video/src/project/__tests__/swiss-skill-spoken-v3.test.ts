import {describe, expect, it} from 'vitest';
import fixture from '../../../examples/swiss-skill-spoken-v3.json';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';

describe('swiss skill spoken v3', () => {
  it('compiles a landscape, caption-bound semantic timeline', () => {
    const project = VideoProjectSchema.parse(structuredClone(fixture));
    const compiled = compileProject(project);

    expect(compiled).toMatchObject({
      projectId: 'swiss-skill-spoken-v3',
      width: 1920,
      height: 1080,
      durationInFrames: 1803,
      orientation: 'landscape',
      captionStyle: 'editorial',
    });
    expect(compiled.audioTracks).toEqual([
      expect.objectContaining({kind: 'voice', volume: 1}),
    ]);
    expect(compiled.scenes.map((scene) => scene.payload.variant)).toEqual([
      'intro',
      'impeccable',
      'frontend-design',
      'ux-pro',
      'cloud-design',
      'outro',
    ]);

    const beats = compiled.scenes.flatMap((scene) => scene.payload.beats as Array<{
      startFrame: number;
      endFrame: number;
      captionStartIndex: number;
      captionEndIndex: number;
      action: string;
    }>);
    expect(beats).toHaveLength(22);
    expect(new Set(beats.map((beat) => beat.action))).toEqual(new Set([
      'compare',
      'burst',
      'stack',
      'counter',
      'stamp',
      'focus',
    ]));
    expect(compiled.scenes.every((scene) => {
      const sceneBeats = scene.payload.beats as Array<{startFrame: number; endFrame: number}>;
      return sceneBeats[0].startFrame === 0
        && sceneBeats[sceneBeats.length - 1]?.endFrame === scene.durationInFrames;
    })).toBe(true);
    expect(beats.every((beat) => (
      Number.isInteger(beat.captionStartIndex)
      && Number.isInteger(beat.captionEndIndex)
      && beat.endFrame > beat.startFrame
    ))).toBe(true);
  });
});

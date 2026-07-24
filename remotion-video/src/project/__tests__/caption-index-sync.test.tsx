import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import type {HeroTrack} from '../../components/ultimate-kit/families/skill-showcase/types';
import {
  resolveHeroStateByCaptionIndex,
  validateHeroCaptionCoverage,
} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const trackFor = (ranges: Array<[number, number]>): HeroTrack => ({
  kind: 'overview-matrix',
  captionStartIndex: ranges[0]?.[0] ?? 0,
  captionEndIndex: ranges[ranges.length - 1]?.[1] ?? 0,
  states: ranges.map(([captionStartIndex, captionEndIndex], index) => ({
    startFrame: index * 30,
    endFrame: (index + 1) * 30,
    captionStartIndex,
    captionEndIndex,
    label: `state-${index}`,
    detail: `detail-${index}`,
  })),
});

describe('captionIndex three-layer sync', () => {
  it('resolves the Hero state by the same captionIndex that drives beat and subtitle', () => {
    const track = trackFor([[0, 1], [2, 2], [3, 5]]);
    expect(resolveHeroStateByCaptionIndex(track, 0)?.label).toBe('state-0');
    expect(resolveHeroStateByCaptionIndex(track, 2)?.label).toBe('state-1');
    expect(resolveHeroStateByCaptionIndex(track, 4)?.label).toBe('state-2');
    expect(resolveHeroStateByCaptionIndex(track, 9)).toBeNull();
  });

  it('accepts a track covering every caption index in the scene range', () => {
    expect(validateHeroCaptionCoverage(trackFor([[0, 2], [3, 5]]))).toBe(-1);
  });

  it('rejects a track with a caption index gap instead of silently truncating', () => {
    expect(validateHeroCaptionCoverage(trackFor([[0, 1], [4, 5]]))).toBe(2);
  });

  it('keeps the semantic beat layer enabled for hero-track-v2 scenes', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'components/ultimate-kit/families/skill-showcase/PortraitCinematicSkillShowcase.tsx'),
      'utf8',
    );

    expect(source).toContain('data-semantic-layer={heroStyle === "hero-track-v2" ? "hero-track-v2" : "cinematic"}');
    expect(source).not.toContain('heroStyle === "hero-track-v2" ? null : beats.map');
  });
});

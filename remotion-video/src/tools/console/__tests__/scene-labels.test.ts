import {describe, expect, it} from 'vitest';
import {sceneTitle} from '../scene-labels';

describe('creator-facing scene labels', () => {
  it('prefers title, then label, then the scene id', () => {
    expect(sceneTitle({id: 'scene-1', payload: {title: '开场'}})).toBe('开场');
    expect(sceneTitle({id: 'scene-2', payload: {label: '核心观点'}})).toBe('核心观点');
    expect(sceneTitle({id: 'scene-3', payload: {heroStyle: 'cinematic'}})).toBe('scene-3');
  });

  it('ignores implementation-only renderer fields', () => {
    expect(sceneTitle({id: 'scene-4', payload: {heroStyle: 'hero-track-v2', variant: 'cinematic'}})).toBe('scene-4');
  });
});

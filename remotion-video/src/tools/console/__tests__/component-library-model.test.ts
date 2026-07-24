import {describe, expect, it} from 'vitest';
import {
  COMPONENT_CATEGORIES,
  LOCAL_SCENE_COMPONENTS,
  resolveLocalSceneComponent,
  type ComponentCategory,
} from '../component-library-model';

describe('component library model', () => {
  it('derives every library item from a production descriptor (29 templates)', () => {
    expect(LOCAL_SCENE_COMPONENTS).toHaveLength(29);
    expect(LOCAL_SCENE_COMPONENTS.every((item) => item.compositionId && item.label && item.category)).toBe(true);
    expect(LOCAL_SCENE_COMPONENTS.every((item) => COMPONENT_CATEGORIES.includes(item.category as ComponentCategory))).toBe(true);
  });

  it('exposes composition template DTO fields', () => {
    const component = LOCAL_SCENE_COMPONENTS[0];
    expect(component).toMatchObject({
      compositionId: expect.any(String),
      label: expect.any(String),
      productionReady: true,
    });
    expect(component).not.toHaveProperty('source');
    expect(component).not.toHaveProperty('previewKind');
    expect(component).not.toHaveProperty('renderer');
    expect(component).not.toHaveProperty('id');
    expect(component).not.toHaveProperty('tags');
  });

  it('resolves catalog compositionIds to their item', () => {
    const component = LOCAL_SCENE_COMPONENTS[0];
    expect(resolveLocalSceneComponent(component.compositionId)).toEqual(component);
    expect(resolveLocalSceneComponent('missing')).toBeNull();
  });

  it('has exactly 29 production-ready composition templates', () => {
    expect(LOCAL_SCENE_COMPONENTS.filter((item) => item.productionReady)).toHaveLength(29);
  });

  it('has no duplicate compositionIds', () => {
    const ids = LOCAL_SCENE_COMPONENTS.map((item) => item.compositionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not include generic-explainer', () => {
    expect(LOCAL_SCENE_COMPONENTS.find((item) => item.compositionId === 'generic-explainer')).toBeUndefined();
  });
});

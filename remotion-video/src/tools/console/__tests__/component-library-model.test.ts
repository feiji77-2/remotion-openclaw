import {describe, expect, it} from 'vitest';
import {
  componentPreviewLabel,
  dedupeComponentLibrary,
  isComponentPlayable,
  LOCAL_SCENE_COMPONENTS,
  type ComponentLibraryItem,
} from '../component-library-model';

const component = (overrides: Partial<ComponentLibraryItem>): ComponentLibraryItem => ({
  id: 'component-1',
  sourceId: 'component-1',
  source: 'project',
  label: '判断看板',
  description: '展示判断标准和下一步动作。',
  category: '推荐',
  orientation: 'portrait',
  size: '1080x1920',
  duration: null,
  tags: ['判断', '标准'],
  formats: ['remotion'],
  previewUrl: null,
  previewKind: 'remotion',
  status: 'ready',
  productionReady: true,
  compatibleIntents: ['concept-explanation'],
  compatibleShotKinds: ['concept-explainer'],
  requiredData: ['shot.evidence'],
  motionCapability: ['type-reveal'],
  styleCapability: ['editorial-type'],
  renderer: {componentId: 'concept-explainer', rendererId: 'concept-explainer'},
  schema: [],
  ...overrides,
});

describe('component library model', () => {
  it('labels actual renderers and preview-only candidates explicitly', () => {
    expect(componentPreviewLabel(component({}))).toBe('生产渲染器');
    expect(componentPreviewLabel(component({source: 'hyperframes', productionReady: false, renderer: null, previewUrl: '/preview.mp4', previewKind: 'video'}))).toBe('候选样片');
    expect(componentPreviewLabel(component({source: 'hyperframes', productionReady: false, renderer: null, previewUrl: null, previewKind: 'mock'}))).toBe('候选素材');
  });

  it('never treats a preview video as a production renderer', () => {
    expect(isComponentPlayable(component({source: 'hyperframes', productionReady: false, renderer: null, previewUrl: '/preview.mp4'}))).toBe(false);
    expect(isComponentPlayable(component({}))).toBe(true);
  });

  it('keeps the production renderer when duplicate candidate labels arrive', () => {
    const result = dedupeComponentLibrary([
      component({id: 'hf:video', source: 'hyperframes', productionReady: false, renderer: null, label: 'Concept Explainer', previewUrl: '/parallax.mp4', previewKind: 'video'}),
      component({id: 'concept-explainer', label: 'Concept Explainer'}),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('concept-explainer');
  });

  it('derives every local library item from a production descriptor', () => {
    expect(LOCAL_SCENE_COMPONENTS).toHaveLength(12);
    expect(LOCAL_SCENE_COMPONENTS.every((item) => item.productionReady && item.renderer && item.previewKind === 'remotion')).toBe(true);
    expect(LOCAL_SCENE_COMPONENTS.every((item) => item.source === 'project' && item.renderer?.componentId === item.id)).toBe(true);
  });
});

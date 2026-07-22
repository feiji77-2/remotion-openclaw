import {describe, expect, it} from 'vitest';
import {componentPreviewLabel, dedupeComponentLibrary, type ComponentLibraryItem} from '../component-library-model';

const component = (overrides: Partial<ComponentLibraryItem>): ComponentLibraryItem => ({
  id: 'component-1',
  sourceId: 'component-1',
  source: 'project',
  label: '判断看板',
  description: '展示判断标准和下一步动作。',
  category: '推荐',
  orientation: 'portrait',
  size: '1080×1920',
  duration: null,
  tags: ['判断', '标准'],
  formats: ['remotion'],
  previewUrl: null,
  previewKind: 'mock',
  status: 'ready',
  renderer: {componentId: 'hero-title', variant: 'generic', visualMode: 'hero', heroStyle: 'hero-track-v2'},
  schema: [],
  ...overrides,
});

describe('component library model', () => {
  it('uses explicit preview labels instead of implying failed playback', () => {
    expect(componentPreviewLabel(component({previewUrl: '/preview.mp4', previewKind: 'video'}))).toBe('视频样片');
    expect(componentPreviewLabel(component({source: 'project', previewUrl: null}))).toBe('结构预览');
    expect(componentPreviewLabel(component({source: 'hyperframes', previewUrl: null}))).toBe('结构草图');
  });

  it('keeps the best playable representative when duplicate labels arrive', () => {
    const result = dedupeComponentLibrary([
      component({id: 'hf:plain', source: 'hyperframes', orientation: 'landscape', label: 'Remotion Parallax Layer', previewUrl: null, tags: []}),
      component({id: 'hf:video', source: 'hyperframes', orientation: 'landscape', label: 'Parallax Layer', previewUrl: '/parallax.mp4', previewKind: 'video', tags: ['motion']}),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('hf:video');
  });
});

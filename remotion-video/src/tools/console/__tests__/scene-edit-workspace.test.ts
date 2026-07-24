import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {DEFAULT_VIDEO_PROJECT} from '../../../compositions/v2/defaultProject';
import {SceneEditWorkspace} from '../SceneEditWorkspace';

describe('SceneEditWorkspace Visual Plan inspector', () => {
  it('does not let sceneEditor component metadata masquerade as a production plan', () => {
    const project = structuredClone(DEFAULT_VIDEO_PROJECT);
    project.scenes[0].payload.sceneEditor = {
      componentId: 'hf:metric-pulse',
      source: 'hyperframes',
      sourceComponentId: 'metric-pulse',
      rendererComponentId: 'data-proof',
      componentLabel: 'Metric Pulse',
      componentCategory: '数据',
      orientation: 'landscape',
      blocks: ['background', 'component', 'caption'],
      updatedAt: '2026-07-23T00:00:00.000Z',
    };
    const html = renderToStaticMarkup(React.createElement(SceneEditWorkspace, {
      project,
      selectedScene: 0,
      sceneStills: null,
      fps: project.render.fps,
      writable: true,
      saving: false,
      busy: false,
      runnerOnline: true,
      onSaveScene: () => true,
      onRenderSceneStills: () => undefined,
    }));

    expect(html).not.toContain('Metric Pulse');
    expect(html).toContain('当前项目没有 Visual Plan');
    expect(html).not.toContain('保存修改');
  });
});

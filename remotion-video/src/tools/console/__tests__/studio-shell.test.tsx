import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {StudioShell} from '../StudioShell';

describe('StudioShell interaction lock', () => {
  it('locks the production surface and keeps a visible render progress meter', () => {
    const html = renderToStaticMarkup(React.createElement(StudioShell, {
      header: React.createElement('button', null, 'header action'),
      stepper: React.createElement('button', null, 'step action'),
      preview: React.createElement('div', null, 'preview'),
      workspace: React.createElement('button', null, 'workspace action'),
      timeline: React.createElement('button', null, 'timeline action'),
      drawer: React.createElement('button', null, 'task log'),
      interactionLock: {
        label: '正在渲染分镜关键帧',
        detail: '完成后自动恢复编辑',
        progress: 38,
      },
    }));

    expect(html).toContain('aria-busy="true"');
    expect(html.match(/inert=""/g)).toHaveLength(3);
    expect(html).toContain('关键帧渲染进度 38%');
    expect(html).toContain('width:38%');
    expect(html).toContain('task log');
  });
});

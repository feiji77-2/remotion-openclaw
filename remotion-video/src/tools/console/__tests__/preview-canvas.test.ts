import {describe, expect, it} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DEFAULT_VIDEO_PROJECT} from '../../../compositions/v2/defaultProject';
import {canShowFinalVideo, PreviewCanvas} from '../PreviewCanvas';
import type {ProjectState, RunnerJob} from '../types';

const projectState = (overrides: Partial<ProjectState> = {}): ProjectState => ({
  projectId: 'demo',
  fingerprints: {
    contentHash: 'content-hash',
    assetHash: 'asset-hash',
    projectHash: 'project-hash',
    rendererHash: 'renderer-hash',
  },
  stages: {
    project: {status: 'current'},
    preview: {status: 'current'},
    sceneStills: {status: 'current'},
    render: {status: 'current', path: 'out/demo.mp4'},
    verify: {status: 'current'},
  },
  deliveryReady: true,
  updatedAt: '2026-07-23T10:00:00.000Z',
  activeJob: null,
  ...overrides,
});

const runningRenderJob: RunnerJob = {
  id: 'render-1',
  commandId: 'render-verify',
  workflowId: 'render-verify',
  label: '生成最终视频',
  project: {id: 'demo', title: 'Demo', productionPath: 'projects/demo', projectJsonPath: 'projects/demo/project.json', outputVideoPath: 'out/demo.mp4'},
  projectId: 'demo',
  command: 'npm run project:render',
  status: 'running',
  currentStep: 'render',
  steps: [{id: 'render', label: 'Render MP4', kind: 'process', command: ['npm', 'run', 'project:render'], status: 'running', startedAt: '2026-07-23T10:00:00.000Z', finishedAt: null, exitCode: null, error: null}],
  logs: ['Rendered 20/100'],
  diagnostics: [],
  exitCode: null,
  error: null,
  retryOf: null,
  artifact: {kind: 'video', path: 'out/demo.mp4'},
  startedAt: '2026-07-23T10:00:00.000Z',
  finishedAt: null,
  updatedAt: '2026-07-23T10:00:00.000Z',
};

describe('final video preview gate', () => {
  it('never exposes a video while the current render is running', () => {
    expect(canShowFinalVideo(projectState(), '/api/artifacts/demo.mp4', true)).toBe(false);
  });

  it('requires a verified delivery artifact before exposing the player', () => {
    expect(canShowFinalVideo(projectState({deliveryReady: false}), '/api/artifacts/demo.mp4', false)).toBe(false);
    expect(canShowFinalVideo(projectState({stages: {...projectState().stages, verify: {status: 'missing'}}}), '/api/artifacts/demo.mp4', false)).toBe(false);
    expect(canShowFinalVideo(projectState(), null, false)).toBe(false);
    expect(canShowFinalVideo(projectState(), '/api/artifacts/demo.mp4', false)).toBe(true);
  });

  it('renders progress instead of any video element while rendering', () => {
    const html = renderToStaticMarkup(React.createElement(PreviewCanvas, {
      project: DEFAULT_VIDEO_PROJECT,
      state: projectState({activeJob: runningRenderJob}),
      selectedScene: 0,
      projectTitle: 'Demo',
      videoUrl: '/api/artifacts/old-demo.mp4',
      activeJob: runningRenderJob,
    }));

    expect(html).not.toContain('<video');
    expect(html).toContain('当前只显示后端渲染进度');
    expect(html).toContain('aria-label="渲染进度');
  });

  it('renders the MP4 player only after delivery verification succeeds', () => {
    const html = renderToStaticMarkup(React.createElement(PreviewCanvas, {
      project: DEFAULT_VIDEO_PROJECT,
      state: projectState(),
      selectedScene: 0,
      projectTitle: 'Demo',
      videoUrl: '/api/artifacts/demo.mp4',
      activeJob: null,
    }));

    expect(html).toContain('<video');
    expect(html).toContain('/api/artifacts/demo.mp4');
  });
});

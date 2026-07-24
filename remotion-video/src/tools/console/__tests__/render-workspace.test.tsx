import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import type {JobStep, RunnerJob} from '../types';
import {RenderWorkspace, RunProgressTrace, runnerJobHeadline, runnerJobProgressPercent, runnerStepErrorCopy, sceneStillsProgressPercent} from '../RenderWorkspace';

const step = (id: string, label: string, status: JobStep['status'], error: string | null = null): JobStep => ({
  id,
  label,
  kind: id === 'save-inputs' ? 'save-inputs' : 'process',
  command: id === 'save-inputs' ? null : [id],
  status,
  startedAt: status === 'pending' ? null : '2026-07-23T10:00:00.000Z',
  finishedAt: status === 'done' || status === 'failed' ? '2026-07-23T10:01:00.000Z' : null,
  exitCode: status === 'done' ? 0 : status === 'failed' ? 1 : null,
  error,
});

const job = (overrides: Partial<RunnerJob>): RunnerJob => ({
  id: 'job-1',
  commandId: 'render-verify',
  workflowId: 'render-verify',
  label: '生成最终视频',
  command: 'npm run project:render -- projects/demo/project.json --out out/demo.mp4',
  status: 'running',
  project: {
    id: 'demo',
    title: 'Demo',
    productionPath: 'projects/demo',
    projectJsonPath: 'projects/demo/project.json',
    outputVideoPath: 'out/demo.mp4',
  },
  projectId: 'demo',
  currentStep: 'render',
  steps: [
    step('render', 'Render MP4', 'running'),
    step('verify', 'Verify MP4', 'pending'),
  ],
  logs: [],
  diagnostics: [],
  exitCode: null,
  error: null,
  retryOf: null,
  artifact: {kind: 'video', path: 'out/demo.mp4'},
  startedAt: '2026-07-23T10:00:00.000Z',
  finishedAt: null,
  updatedAt: '2026-07-23T10:00:00.000Z',
  ...overrides,
});

describe('render workspace runner progress', () => {
  it('turns Remotion render and encode logs into user-visible progress', () => {
    expect(runnerJobProgressPercent(job({logs: ['Rendered 250/1000, time remaining: 30s']}))).toBe(22);
    expect(runnerJobProgressPercent(job({logs: ['Rendered 1000/1000', 'Encoded 500/1000']}))).toBe(78);
    expect(runnerJobProgressPercent(job({status: 'done', currentStep: null, steps: [
      step('render', 'Render MP4', 'done'),
      step('verify', 'Verify MP4', 'done'),
    ]}))).toBe(100);
  });

  it('keeps execution progress without duplicating the developer command log', () => {
    const html = renderToStaticMarkup(React.createElement(RunProgressTrace, {
      job: job({logs: ['Rendered 1/2', 'Encoded 2/2']}),
      title: '生成最终视频',
    }));

    expect(html).toContain('渲染并编码 MP4');
    expect(html).not.toContain('代码同步');
    expect(html).not.toContain('runner-trace__terminal');
    expect(html).not.toContain('npm run project:render');
  });

  it('tracks the whole scene-stills job instead of each individual Rendered 1/1', () => {
    const sceneJob = job({
      commandId: 'project-scene-stills',
      logs: ['Rendered 1/1', 'Rendered 1/1'],
    });
    expect(sceneStillsProgressPercent(sceneJob, 8)).toBe(25);
    expect(sceneStillsProgressPercent(job({
      commandId: 'project-scene-stills',
      logs: ['[scene-stills] progress 3/8'],
    }), 8)).toBe(38);
  });

  it('localizes backend step failures for voice jobs without hiding partial audio success', () => {
    const failedCheck = job({
      commandId: 'build-check',
      label: '合成语音并生成分镜',
      status: 'failed',
      currentStep: 'check',
      steps: [
        step('save-inputs', 'Save Inputs', 'done'),
        step('build', 'Build Project', 'done'),
        step('tts', 'Synthesize Voiceover', 'done'),
        step('align-captions', 'Align Captions', 'done'),
        step('rebuild', 'Rebuild Project', 'done'),
        step('check', 'Check Project', 'failed', 'Step check failed'),
      ],
    });

    expect(runnerJobHeadline(failedCheck, '语音合成生产')).toBe('配音已生成，分镜合同检查失败');
    expect(runnerStepErrorCopy(failedCheck.steps[5])).toBe('检查分镜数据失败');
  });

  it('keeps a rerender action available after a deliverable already exists', () => {
    const html = renderToStaticMarkup(React.createElement(RenderWorkspace, {
      mode: 'render',
      state: {
        projectId: 'project-1',
        fingerprints: {
          contentHash: 'content-hash',
          assetHash: 'asset-hash',
          projectHash: 'project-hash',
          rendererHash: 'renderer-hash',
        },
        stages: {
          project: {status: 'current'},
          preview: {status: 'missing'},
          sceneStills: {status: 'current'},
          render: {status: 'current'},
          verify: {status: 'current'},
        },
        deliveryReady: true,
        updatedAt: null,
        activeJob: null,
      },
      videoUrl: '/video.mp4',
      downloadUrl: '/api/video-library/job-1/download',
      runnerOnline: true,
      activeJob: null,
      onRun: () => undefined,
      totalFrames: 300,
      fps: 30,
      sceneCount: 3,
    }));

    expect(html).toContain('重新生成最终视频');
    expect(html).toContain('/api/video-library/job-1/download');
    expect(html).not.toContain('href="/video.mp4"');
  });

  it('exposes delivery evidence links only in the deliver workspace', () => {
    const state = {
      projectId: 'project-1',
      fingerprints: {
        contentHash: 'content-hash',
        assetHash: 'asset-hash',
        projectHash: 'project-hash',
        rendererHash: 'renderer-hash',
      },
      stages: {
        project: {status: 'current' as const},
        preview: {status: 'missing' as const},
        sceneStills: {status: 'current' as const},
        render: {status: 'current' as const},
        verify: {status: 'current' as const, result: {ok: true}},
      },
      deliveryReady: true,
      updatedAt: null,
      activeJob: null,
    };
    const props = {
      state,
      videoUrl: '/video.mp4',
      downloadUrl: '/api/video-library/job-1/download',
      evidenceLinks: [
        {key: 'verify-json', label: 'Verify JSON', detail: '成片验收结果', url: '/api/artifact?path=out%2Fdemo-verify.json'},
        {key: 'component-report', label: 'Component Report', detail: '组件使用分布', url: '/api/artifact?path=out%2Fdemo-component-report.json'},
        {key: 'qa-contact-sheet', label: 'QA Contact Sheet', detail: '交付质检拼图', url: '/api/artifact?path=out%2Fdemo-qa%2Fcontact-sheet.jpg'},
      ],
      runnerOnline: true,
      activeJob: null,
      onRun: () => undefined,
      totalFrames: 300,
      fps: 30,
      sceneCount: 3,
    };

    const renderHtml = renderToStaticMarkup(React.createElement(RenderWorkspace, {...props, mode: 'render'}));
    const deliverHtml = renderToStaticMarkup(React.createElement(RenderWorkspace, {...props, mode: 'deliver'}));

    expect(renderHtml).not.toContain('交付证据');
    expect(renderHtml).not.toContain('/api/artifact?path=out%2Fdemo-component-report.json');
    expect(deliverHtml).toContain('交付证据');
    expect(deliverHtml).toContain('Verify JSON');
    expect(deliverHtml).toContain('/api/artifact?path=out%2Fdemo-component-report.json');
    expect(deliverHtml).toContain('QA Contact Sheet');
  });
});

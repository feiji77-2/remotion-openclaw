import {describe, expect, it} from 'vitest';
import type {RunnerJob} from '../types';
import {latestRunnerLogLines, runnerJobProgressPercent} from '../RenderWorkspace';

const job = (overrides: Partial<RunnerJob>): RunnerJob => ({
  id: 'job-1',
  commandId: 'render-verify',
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
  currentStep: 'render',
  steps: [
    {id: 'render', label: 'Render MP4', status: 'running', error: null},
    {id: 'verify', label: 'Verify MP4', status: 'pending', error: null},
  ],
  logs: [],
  diagnostics: [],
  exitCode: null,
  error: null,
  ...overrides,
});

describe('render workspace runner progress', () => {
  it('turns Remotion render and encode logs into user-visible progress', () => {
    expect(runnerJobProgressPercent(job({logs: ['Rendered 250/1000, time remaining: 30s']}))).toBe(22);
    expect(runnerJobProgressPercent(job({logs: ['Rendered 1000/1000', 'Encoded 500/1000']}))).toBe(78);
    expect(runnerJobProgressPercent(job({status: 'done', currentStep: null, steps: [
      {id: 'render', label: 'Render MP4', status: 'done', error: null},
      {id: 'verify', label: 'Verify MP4', status: 'done', error: null},
    ]}))).toBe(100);
  });

  it('keeps latest runner output readable and trims noisy whitespace', () => {
    expect(latestRunnerLogLines(job({logs: ['  $ npm run project:render  ', 'Rendered   1/2', 'Encoded 2/2']}), 2)).toEqual([
      'Rendered 1/2',
      'Encoded 2/2',
    ]);
  });
});

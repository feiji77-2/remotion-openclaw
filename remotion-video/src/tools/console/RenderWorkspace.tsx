import React from 'react';
import type {ProjectState, RunnerJob} from './types';

interface RenderWorkspaceProps {
  mode: 'render' | 'deliver';
  state: ProjectState | null;
  videoUrl: string | null;
  downloadUrl?: string | null;
  runnerOnline: boolean;
  activeJob: RunnerJob | null;
  blockingJob?: RunnerJob | null;
  starting?: boolean;
  recentJob?: RunnerJob | null;
  onRun: (commandId: 'render-verify') => void;
  totalFrames: number;
  fps: number;
  sceneCount: number;
}

const statusCopy = (
  state: ProjectState | null,
  mode: RenderWorkspaceProps['mode'],
  activeJob: RunnerJob | null,
  blockingJob: RunnerJob | null,
) => {
  if (!state) return '正在读取产物状态';
  if (activeJob) return `正在执行 ${activeJob.label}`;
  if (blockingJob) return `当前正在执行 ${blockingJob.label}，成片渲染会在这个任务结束后可用。`;
  if (mode === 'deliver') return state.deliveryReady ? '成片已通过检查，可以下载。' : '只有最终视频生成并通过检查后，才会开放下载。';
  if (state.stages.project.status !== 'current') return '生成最终视频会先更新分镜结构，再编码 MP4。';
  if (state.stages.render.status === 'current' && state.stages.verify.status === 'current') return '成片已生成并通过检查。';
  if (state.stages.render.status === 'stale') return '当前成片已过期，请重新生成最终视频。';
  if (state.stages.render.status === 'current') return '成片已生成，等待检查通过后开放下载。';
  return '生成最终 MP4，完成后会自动检查文件状态。';
};

const progressLabel = (job: RunnerJob | null, fallback: string) => {
  if (!job) return fallback;
  if (job.commandId === 'project-scene-stills') return '正在逐个渲染分镜画面';
  if (job.commandId === 'render-verify') {
    if (job.currentStep === 'render') return '正在生成最终视频';
    if (job.currentStep === 'verify') return '正在确认成片状态';
  }
  if (job.commandId === 'build-check' || job.commandId === 'build-check-audio') {
    if (job.currentStep === 'build') return '正在更新分镜';
    if (job.currentStep === 'tts') return '正在合成口播配音';
    if (job.currentStep === 'align-captions') return '正在按语音对齐字幕';
    if (job.currentStep === 'rebuild') return '正在重建语音时间线';
    if (job.currentStep === 'check') return '正在检查分镜';
  }
  return fallback;
};

const stepLabels: Record<string, string> = {
  'save-inputs': '保存输入合同',
  build: '生成 Remotion 项目',
  tts: '合成配音',
  'align-captions': '对齐字幕时间',
  rebuild: '重建语音时间线',
  check: '检查分镜数据',
  'scene-stills': '渲染分镜画面',
  render: '渲染并编码 MP4',
  verify: '验收视频文件',
  'persist-state': '写入项目状态',
};

const statusLabels: Record<RunnerJob['status'] | 'pending', string> = {
  pending: '等待',
  running: '运行中',
  done: '完成',
  failed: '失败',
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const cleanLogLine = (line: string) => line
  .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const latestRatio = (logs: string[], label: 'Rendered' | 'Encoded') => {
  for (const rawLine of [...logs].reverse()) {
    const match = cleanLogLine(rawLine).match(new RegExp(`${label}\\s+(\\d+)\\/(\\d+)`, 'i'));
    if (!match) continue;
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0) return Math.max(0, Math.min(1, current / total));
  }
  return null;
};

const latestSceneStillsRatio = (logs: string[]) => {
  for (const rawLine of [...logs].reverse()) {
    const match = cleanLogLine(rawLine).match(/\[scene-stills\]\s+progress\s+(\d+)\/(\d+)/i);
    if (!match) continue;
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0) return Math.max(0, Math.min(1, current / total));
  }
  return null;
};

export const sceneStillsProgressPercent = (job: RunnerJob | null, sceneCount = 0) => {
  if (!job) return 2;
  if (job.status === 'done') return 100;
  const explicit = latestSceneStillsRatio(job.logs);
  if (explicit !== null) return clampPercent(Math.min(.99, explicit) * 100);
  if (sceneCount > 0) {
    const completed = job.logs.map(cleanLogLine).filter((line) => /^Rendered\s+1\/1(?:\s|$)/i.test(line)).length;
    return clampPercent(Math.max(.04, Math.min(.99, completed / sceneCount)) * 100);
  }
  const rendered = latestRatio(job.logs, 'Rendered');
  return rendered === null ? 4 : clampPercent(8 + rendered * 86);
};

export const runnerJobProgressPercent = (job: RunnerJob | null) => {
  if (!job) return 0;
  if (job.status === 'done') return 100;
  const completedSteps = job.steps.filter((step) => step.status === 'done').length;
  if (job.commandId === 'render-verify') {
    if (job.currentStep === 'verify' || job.steps.some((step) => step.id === 'render' && step.status === 'done')) return job.status === 'failed' ? 94 : 96;
    const encoded = latestRatio(job.logs, 'Encoded');
    if (encoded !== null) return clampPercent(62 + encoded * 31);
    const rendered = latestRatio(job.logs, 'Rendered');
    if (rendered !== null) return clampPercent(8 + rendered * 54);
  }
  if (job.commandId === 'project-scene-stills') {
    return sceneStillsProgressPercent(job);
  }
  return clampPercent(((completedSteps + (job.status === 'running' ? 0.22 : 0)) / Math.max(job.steps.length, 1)) * 100);
};

const clockTime = (value: string | null | undefined) => {
  if (!value) return '等待同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '等待同步';
  return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
};

const durationCopy = (start: string | null | undefined, end: string | null | undefined, running: boolean) => {
  if (!start) return running ? '刚开始' : '';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return '';
  const seconds = Math.max(1, Math.round((endTime - startTime) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const latestSyncTime = (job: RunnerJob) => {
  const latestStep = [...job.steps].reverse().find((step) => step.finishedAt || step.startedAt);
  return job.updatedAt || job.finishedAt || latestStep?.finishedAt || latestStep?.startedAt || job.startedAt || null;
};

const stepLabel = (id: string, fallback: string) => stepLabels[id] || fallback;

const failedStepFor = (job: RunnerJob) => job.steps.find((step) => step.status === 'failed') || null;

export const runnerStepErrorCopy = (step: RunnerJob['steps'][number]) => {
  if (!step.error) return '';
  const label = stepLabel(step.id, step.label);
  if (/^Step\s+[\w-]+\s+failed$/i.test(step.error)) return `${label}失败`;
  return step.error;
};

export const runnerJobHeadline = (job: RunnerJob, fallback: string) => {
  if (job.status !== 'failed') {
    const currentStep = job.steps.find((step) => step.id === job.currentStep) || job.steps.find((step) => step.status === 'running') || null;
    return progressLabel(job, currentStep ? stepLabel(currentStep.id, currentStep.label) : fallback);
  }
  const failedStep = failedStepFor(job);
  if ((job.commandId === 'build-check' || job.commandId === 'build-check-audio') && failedStep?.id === 'check') {
    const audioReady = job.commandId === 'build-check-audio' || job.steps.some((step) => step.id === 'tts' && step.status === 'done');
    return audioReady ? '配音已生成，分镜合同检查失败' : '分镜合同检查失败';
  }
  return failedStep ? `${stepLabel(failedStep.id, failedStep.label)}失败` : `${fallback}失败`;
};

export const RunProgressTrace: React.FC<{job: RunnerJob; title: string}> = ({job, title}) => {
  const progress = runnerJobProgressPercent(job);
  const currentStep = job.steps.find((step) => step.id === job.currentStep) || job.steps.find((step) => step.status === 'running') || null;
  const currentLabel = runnerJobHeadline(job, currentStep ? stepLabel(currentStep.id, currentStep.label) : title);

  return <section className={`runner-trace is-${job.status}`} aria-live="polite" aria-label={`${title}执行进度`}>
    <div className="runner-trace__top">
      <div><strong>{job.status === 'done' ? '最近一次执行' : title}</strong><span>{currentLabel}</span></div>
      <em className={`runner-trace__badge is-${job.status}`}>{statusLabels[job.status]}</em>
    </div>
    <div className="runner-trace__meter" aria-label={`当前进度 ${progress}%`}><i style={{width: `${Math.max(6, progress)}%`}} /></div>
    <div className="runner-trace__meta"><span>{progress}%</span><span>最新同步 {clockTime(latestSyncTime(job))}</span><span>{job.logs.length} 条输出</span></div>
    <div className="runner-trace__steps">
      {job.steps.map((step) => {
        const isCurrent = step.id === job.currentStep || step.status === 'running';
        return <div className={`runner-trace__step is-${step.status}${isCurrent ? ' is-current' : ''}`} key={step.id}>
          <i />
          <span><strong>{stepLabel(step.id, step.label)}</strong>{step.error && <small>{runnerStepErrorCopy(step)}</small>}</span>
          <em>{statusLabels[step.status]}{step.status !== 'pending' ? ` · ${durationCopy(step.startedAt, step.finishedAt, step.status === 'running')}` : ''}</em>
        </div>;
      })}
    </div>
  </section>;
};

const stageStatusForMode = (
  state: ProjectState | null,
  mode: RenderWorkspaceProps['mode'],
  activeJob: RunnerJob | null,
  blockingJob: RunnerJob | null,
) => {
  if (!state) return {className: 'is-stale', label: '读取中'};
  if (activeJob) return {className: 'is-running', label: '生成中'};
  if (blockingJob) return {className: 'is-stale', label: '等待任务'};
  if (mode === 'render') {
    if (state.stages.project.status !== 'current') return {className: 'is-stale', label: '会先更新'};
    if (state.stages.render.status === 'current') return {className: 'is-current', label: '已生成'};
    if (state.stages.render.status === 'stale') return {className: 'is-stale', label: '需更新'};
    return {className: 'is-stale', label: '未生成'};
  }
  if (state.deliveryReady) return {className: 'is-ready', label: '可交付'};
  if (state.stages.verify.status === 'stale') return {className: 'is-stale', label: '需更新'};
  return {className: 'is-stale', label: '未交付'};
};

export const RenderWorkspace: React.FC<RenderWorkspaceProps> = ({
  mode,
  state,
  videoUrl,
  downloadUrl = null,
  runnerOnline,
  activeJob,
  blockingJob = null,
  starting = false,
  recentJob = null,
  onRun,
  totalFrames,
  fps,
  sceneCount,
}) => {
  const rendering = Boolean(activeJob) || starting;
  const blocked = Boolean(blockingJob);
  const canStartRender = runnerOnline && !rendering && !blocked && sceneCount > 0;
  const duration = Math.round(totalFrames / fps);
  const deliveryReady = Boolean(state?.deliveryReady);
  const showRenderAction = mode === 'render' || !deliveryReady;
  const stageStatus = stageStatusForMode(state, mode, activeJob, blockingJob);
  const traceJob = activeJob?.commandId === 'render-verify' ? activeJob : recentJob?.commandId === 'render-verify' ? recentJob : null;
  return <div className="workspace-panel">
    <div className="workspace-heading"><div><span className="workspace-kicker">{mode === 'render' ? '05 / 成片渲染' : '06 / 交付状态'}</span><h1>{mode === 'render' ? '渲染' : '交付'}</h1></div><span className={`state-chip ${stageStatus.className}`}>{stageStatus.label}</span></div>
    <p className="workspace-copy">{statusCopy(state, mode, activeJob, blockingJob)}</p>
    <dl className="production-spec"><div><dt>画幅</dt><dd>1080 x 1920</dd></div><div><dt>帧率</dt><dd>{fps} FPS</dd></div><div><dt>时长</dt><dd>{duration} 秒</dd></div><div><dt>场景</dt><dd>{sceneCount}</dd></div></dl>
    <>
      {showRenderAction && <button className="primary-action" type="button" disabled={!canStartRender} onClick={() => onRun('render-verify')}>{rendering ? <><i className="action-spinner" aria-hidden="true" />正在生成成片</> : blocked ? '等待当前任务完成' : deliveryReady ? '重新生成最终视频' : '生成最终视频'}</button>}
      {traceJob && <RunProgressTrace job={traceJob} title="生成最终视频" />}
      {deliveryReady && downloadUrl && <a className="download-action" href={downloadUrl}>下载 MP4</a>}
      {mode === 'deliver' && state?.stages.verify.result && <div className="verify-result">已生成，可下载</div>}
    </>
  </div>;
};

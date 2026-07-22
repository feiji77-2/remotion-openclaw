import React from 'react';
import type {ProjectState, RunnerJob} from './types';

interface RenderWorkspaceProps {
  mode: 'render' | 'deliver';
  state: ProjectState | null;
  videoUrl: string | null;
  runnerOnline: boolean;
  activeJob: RunnerJob | null;
  recentJob?: RunnerJob | null;
  onRun: (commandId: 'render-verify') => void;
  totalFrames: number;
  fps: number;
  sceneCount: number;
}

const statusCopy = (state: ProjectState | null, mode: RenderWorkspaceProps['mode']) => {
  if (!state) return '正在读取产物状态';
  if (state.activeJob) return `正在执行 ${state.activeJob.label}`;
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
  if (job.commandId === 'build-check') {
    if (job.currentStep === 'build') return '正在更新分镜';
    if (job.currentStep === 'check') return '正在检查分镜';
  }
  return fallback;
};

const stepLabels: Record<string, string> = {
  'save-inputs': '保存输入合同',
  build: '生成 Remotion 项目',
  check: '检查项目合同',
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
    const rendered = latestRatio(job.logs, 'Rendered');
    if (rendered !== null) return clampPercent(8 + rendered * 86);
  }
  return clampPercent(((completedSteps + (job.status === 'running' ? 0.22 : 0)) / Math.max(job.steps.length, 1)) * 100);
};

export const latestRunnerLogLines = (job: RunnerJob | null, limit = 10) => {
  if (!job) return [];
  return job.logs
    .map(cleanLogLine)
    .filter(Boolean)
    .slice(-limit);
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

const RunProgressTrace: React.FC<{job: RunnerJob; title: string}> = ({job, title}) => {
  const progress = runnerJobProgressPercent(job);
  const currentStep = job.steps.find((step) => step.id === job.currentStep) || job.steps.find((step) => step.status === 'running') || null;
  const logs = latestRunnerLogLines(job, 9);
  const commandLines = job.command.split(' && ').filter(Boolean);
  const currentLabel = progressLabel(job, currentStep ? stepLabel(currentStep.id, currentStep.label) : title);

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
          <span><strong>{stepLabel(step.id, step.label)}</strong>{step.error && <small>{step.error}</small>}</span>
          <em>{statusLabels[step.status]}{step.status !== 'pending' ? ` · ${durationCopy(step.startedAt, step.finishedAt, step.status === 'running')}` : ''}</em>
        </div>;
      })}
    </div>
    <div className="runner-trace__terminal">
      <header><strong>代码同步</strong><span>{job.id}</span></header>
      <code className="runner-trace__code">
        {commandLines.map((line, index) => <span className="runner-trace__line is-command" key={`command-${index}`}>{index > 0 ? '&& ' : '$ '}{line}</span>)}
        {logs.length ? logs.map((line, index) => <span className="runner-trace__line" key={`${line}-${index}`}>{line}</span>) : <span className="runner-trace__line">等待 Runner 返回第一条输出...</span>}
      </code>
    </div>
  </section>;
};

const stageStatusForMode = (state: ProjectState | null, mode: RenderWorkspaceProps['mode']) => {
  if (!state) return {className: 'is-stale', label: '读取中'};
  if (state.activeJob) return {className: 'is-running', label: '进行中'};
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
  runnerOnline,
  activeJob,
  recentJob = null,
  onRun,
  totalFrames,
  fps,
  sceneCount,
}) => {
  const busy = Boolean(activeJob);
  const canStartRender = runnerOnline && !busy && sceneCount > 0;
  const duration = Math.round(totalFrames / fps);
  const deliveryReady = Boolean(state?.deliveryReady);
  const stageStatus = stageStatusForMode(state, mode);
  const traceJob = activeJob?.commandId === 'render-verify' ? activeJob : recentJob?.commandId === 'render-verify' ? recentJob : null;
  return <div className="workspace-panel">
    <div className="workspace-heading"><div><span className="workspace-kicker">{mode === 'render' ? '04 / 成片渲染' : '05 / 交付状态'}</span><h1>{mode === 'render' ? '渲染' : '交付'}</h1></div><span className={`state-chip ${stageStatus.className}`}>{stageStatus.label}</span></div>
    <p className="workspace-copy">{statusCopy(state, mode)}</p>
    <dl className="production-spec"><div><dt>画幅</dt><dd>1080 x 1920</dd></div><div><dt>帧率</dt><dd>{fps} FPS</dd></div><div><dt>时长</dt><dd>{duration} 秒</dd></div><div><dt>场景</dt><dd>{sceneCount}</dd></div></dl>
    <>
      {!deliveryReady && <button className="primary-action" type="button" disabled={!canStartRender} onClick={() => onRun('render-verify')}>{busy ? <><i className="action-spinner" aria-hidden="true" />正在生成成片</> : '生成最终视频'}</button>}
      {traceJob && <RunProgressTrace job={traceJob} title="生成最终视频" />}
      {deliveryReady && videoUrl && <a className="download-action" href={videoUrl} download>下载 MP4</a>}
      {mode === 'deliver' && state?.stages.verify.result && <div className="verify-result">已生成，可下载</div>}
    </>
  </div>;
};

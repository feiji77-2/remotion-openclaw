import React, {useEffect, useRef, useState} from 'react';
import type {ActivityEvent, RunnerJob} from './types';

interface DeveloperDrawerProps { jobs: RunnerJob[]; activity: ActivityEvent[]; onRetry: (job: RunnerJob) => void; }

export const formatJobTimestamp = (value: string | null | undefined) => {
  if (!value) return '等待同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '等待同步';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-');
};

export const formatJobDuration = (startedAt: string | null | undefined, endedAt: string | null | undefined, now = Date.now()) => {
  if (!startedAt) return '等待计时';
  const started = new Date(startedAt).getTime();
  const ended = endedAt ? new Date(endedAt).getTime() : now;
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) return '等待计时';
  const totalSeconds = Math.floor((ended - started) / 1000);
  if (totalSeconds < 1) return '不到1秒';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours ? `${hours}小时` : '', minutes ? `${minutes}分` : '', `${seconds}秒`].filter(Boolean).join('');
};

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({jobs, onRetry}) => {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && drawerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open || !jobs.some((job) => job.status === 'running')) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [jobs, open]);

  return <aside className={`developer-drawer ${open ? 'is-open' : ''}`} ref={drawerRef}>
    <button className="developer-drawer__toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} title="开发者任务日志">{open ? '关闭日志' : '任务日志'}</button>
    {open && <div className="developer-drawer__body">
      <section><h2>任务</h2>{jobs.length ? jobs.slice(0, 4).map((job) => <article className="job-log" key={job.id}>
        <div><strong>{job.label}</strong><span className={`job-status is-${job.status}`}>{job.status === 'done' ? '完成' : job.status === 'failed' ? '失败' : '运行中'}</span></div>
        <div className="job-log__time">
          <time dateTime={job.startedAt || undefined}>开始 {formatJobTimestamp(job.startedAt)}</time>
          <span>
            <time dateTime={(job.finishedAt || job.updatedAt) || undefined}>{job.status === 'running' ? '最后同步' : job.status === 'failed' ? '失败' : '完成'} {formatJobTimestamp(job.status === 'running' ? job.updatedAt : job.finishedAt || job.updatedAt)}</time>
            <em>用时 {formatJobDuration(job.startedAt, job.status === 'running' ? null : job.finishedAt || job.updatedAt, now)}</em>
          </span>
        </div>
        <p>{job.diagnostics[0]?.message || job.error || job.logs.slice(-1)[0] || '等待任务输出'}</p>
        {job.status === 'failed' && (() => {
          const retrying = jobs.some((candidate) => candidate.status === 'running' && candidate.projectId === job.projectId);
          return <button type="button" disabled={retrying} onClick={() => onRetry(job)}>{retrying ? '重试中' : '重试'}</button>;
        })()}
      </article>) : <p className="empty-line">暂无任务</p>}</section>
    </div>}
  </aside>;
};

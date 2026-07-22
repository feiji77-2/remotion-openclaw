import React, {useState} from 'react';
import type {ActivityEvent, RunnerJob} from './types';

interface DeveloperDrawerProps { jobs: RunnerJob[]; activity: ActivityEvent[]; onRetry: (job: RunnerJob) => void; }

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({jobs, activity, onRetry}) => {
  const [open, setOpen] = useState(false);
  return <aside className={`developer-drawer ${open ? 'is-open' : ''}`}>
    <button className="developer-drawer__toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} title="开发者任务日志">{open ? '关闭日志' : '任务日志'}</button>
    {open && <div className="developer-drawer__body">
      <section><h2>活动</h2>{activity.length ? activity.slice(0, 6).map((event) => <p className={`activity-line is-${event.tone}`} key={event.id}><time>{event.time}</time>{event.text}</p>) : <p className="empty-line">暂无活动</p>}</section>
      <section><h2>任务</h2>{jobs.length ? jobs.slice(0, 4).map((job) => <article className="job-log" key={job.id}>
        <div><strong>{job.label}</strong><span className={`job-status is-${job.status}`}>{job.status === 'done' ? '完成' : job.status === 'failed' ? '失败' : '运行中'}</span></div>
        <p>{job.diagnostics[0]?.message || job.error || job.logs.slice(-1)[0] || '等待任务输出'}</p>
        {job.status === 'failed' && <button type="button" onClick={() => onRetry(job)}>重试</button>}
      </article>) : <p className="empty-line">暂无任务</p>}</section>
    </div>}
  </aside>;
};

// src/tools/console/DeveloperDrawer.tsx
// R1: 开发者抽屉 — 日志/JSON/命令，默认收起
import React, {useState} from 'react';
import {theme} from './theme';
import type {RunnerJob, ActivityEvent} from './types';

interface DeveloperDrawerProps {
  jobs: Record<string, RunnerJob>;
  activity: ActivityEvent[];
}

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({jobs, activity}) => {
  const [open, setOpen] = useState(false);
  const recentJobs = Object.values(jobs).slice(-3).reverse();
  const recentActivity = activity.slice(0, 6);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 80, right: 12, zIndex: 100,
          width: 28, height: 28, borderRadius: '50%',
          border: `1px solid ${theme.border.subtle}`,
          background: theme.bg.elevated, color: theme.text.muted,
          fontSize: 11, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
        title="开发者面板"
      >
        {'{ }'}
      </button>

      {/* Drawer panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 0, left: 65, right: 360, height: 240, zIndex: 99,
          borderTop: `1px solid ${theme.border.subtle}`,
          background: `${theme.bg.base}f8`, backdropFilter: 'blur(12px)',
          display: 'flex', fontSize: 9,
        }}>
          {/* Activity log */}
          <div style={{flex: 1, borderRight: `1px solid ${theme.border.subtle}`, overflow: 'auto', padding: 8}}>
            <div style={{fontWeight: 700, color: theme.text.secondary, marginBottom: 6, fontSize: 8}}>活动日志</div>
            {recentActivity.map((a) => (
              <div key={a.id} style={{
                color: a.tone === 'danger' ? theme.accent.red
                  : a.tone === 'success' ? theme.accent.green
                  : a.tone === 'warning' ? theme.accent.amber
                  : theme.text.muted,
                marginBottom: 3, fontFamily: 'monospace', fontSize: 8,
              }}>
                <span style={{opacity: 0.5, marginRight: 6}}>{a.time}</span>
                {a.text}
              </div>
            ))}
          </div>

          {/* Job log */}
          <div style={{flex: 1, overflow: 'auto', padding: 8}}>
            <div style={{fontWeight: 700, color: theme.text.secondary, marginBottom: 6, fontSize: 8}}>任务历史</div>
            {recentJobs.length === 0 ? (
              <span style={{color: theme.text.muted, fontSize: 8}}>暂无任务</span>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} style={{marginBottom: 6, padding: 4, borderRadius: 4, background: theme.bg.surface}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 2}}>
                    <span style={{fontWeight: 600, color: theme.text.primary, fontSize: 8}}>{job.label}</span>
                    <span style={{
                      fontSize: 7, fontWeight: 700,
                      color: job.status === 'done' ? theme.accent.green
                        : job.status === 'failed' ? theme.accent.red
                        : theme.accent.amber,
                    }}>
                      {job.status === 'done' ? '完成' : job.status === 'failed' ? '失败' : '运行中'}
                    </span>
                  </div>
                  {job.logs.slice(-2).map((line, i) => (
                    <div key={i} style={{fontFamily: 'monospace', fontSize: 7, color: theme.text.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {line}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

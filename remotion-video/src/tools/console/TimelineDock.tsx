// src/tools/console/TimelineDock.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {SceneTimeline, RunnerJob, ActivityEvent} from './types';
import {TimelineRuler} from './TimelineRuler';
import {ActTrack} from './ActTrack';
import {CueDetail} from './CueDetail';
import {CueLayerRow} from './CueLayerRow';

interface TimelineDockProps {
  totalFrames: number;
  fps: number;
  timeline: SceneTimeline[];
  project: VideoProject;
  visibleJob: RunnerJob | null;
  logOpen: boolean;
  activity: ActivityEvent[];
  onRunCommand: (cmd: string, label: string) => void;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({
  totalFrames, fps, timeline, visibleJob, logOpen, activity,
}) => {
  const [selectedScene, setSelectedScene] = useState<SceneTimeline | null>(null);

  // Group timeline scenes by "acts" (using 3 arbitrary act groupings based on position)
  const acts = [
    {
      id: '1', name: '开场', energy: 'explosive' as const, color: '#ef4444',
      scenes: timeline.filter((_, i) => i < 3), totalFrames,
    },
    {
      id: '2', name: '展开', energy: 'high' as const, color: '#f97316',
      scenes: timeline.filter((_, i) => i >= 3 && i < 6), totalFrames,
    },
    {
      id: '3', name: '收束', energy: 'moderate' as const, color: '#eab308',
      scenes: timeline.filter((_, i) => i >= 6), totalFrames,
    },
  ].filter((act) => act.scenes.length > 0);

  return (
    <div style={{
      borderTop: `1px solid ${theme.border.subtle}`,
      background: theme.bg.deep, flexShrink: 0,
    }}>
      {/* Timeline header */}
      <div style={{
        padding: '5px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: theme.bg.elevated,
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{fontWeight: 600, fontSize: 10, color: theme.text.primary, display: 'flex', alignItems: 'center', gap: 4}}>
            <span>⏱</span> 分镜时间线
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>{totalFrames} 帧 · {(totalFrames / fps).toFixed(1)}s @{fps}fps</span>
          <span style={{fontSize: 7, color: '#ef4444'}}>⬤ 爆发</span>
          <span style={{fontSize: 7, color: '#f97316'}}>⬤ 高能</span>
          <span style={{fontSize: 7, color: '#eab308'}}>⬤ 温和</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <div style={{background: theme.bg.surface, padding: '2px 6px', borderRadius: 3, fontSize: 8, color: theme.text.muted, cursor: 'pointer', border: `1px solid ${theme.border.subtle}`}}>
            🔍 +
          </div>
          <div style={{background: theme.bg.surface, padding: '2px 6px', borderRadius: 3, fontSize: 8, color: theme.text.muted, cursor: 'pointer', border: `1px solid ${theme.border.subtle}`}}>
            −
          </div>
        </div>
      </div>

      {/* Timeline body */}
      <div style={{padding: '6px 14px 4px'}}>
        <TimelineRuler totalFrames={totalFrames} />
        {acts.map((act) => (
          <ActTrack key={act.id} act={act} />
        ))}
        {acts.length === 0 && (
          <div style={{padding: '20px 0', textAlign: 'center', color: theme.text.muted, fontSize: 9}}>
            暂无分镜数据，请先生成文案
          </div>
        )}
      </div>

      {/* Cue detail (shown when scene selected) */}
      <CueDetail selectedScene={selectedScene} />
      <CueLayerRow />

      {/* Job activity footer */}
      <div style={{
        borderTop: `1px solid ${theme.border.subtle}`, padding: '4px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: theme.bg.elevated, fontSize: 8, color: theme.text.muted,
      }}>
        <span>{activity[0]?.text ?? '就绪'}</span>
        <span>{visibleJob ? `任务: ${visibleJob.status}` : '无活跃任务'}</span>
      </div>

      {/* Log viewer */}
      {logOpen && visibleJob && (
        <pre style={{
          maxHeight: 120, overflow: 'auto', padding: '8px 14px',
          borderTop: `1px solid ${theme.border.subtle}`, background: theme.bg.deep,
          color: theme.text.secondary, fontSize: 9, fontFamily: theme.mono,
          lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0,
        }}>
          {visibleJob.logs.join('\n') || visibleJob.command}
        </pre>
      )}
    </div>
  );
};

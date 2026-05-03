import React from 'react';
import type {ActBlock} from '../../data/directorScore';
import {getTimelineCues, type TimelineCue} from '../data';
import {ActTrack} from './ActTrack';

interface TimelinePanelProps {
  acts: ActBlock[];
  totalFrames: number;
  fps: number;
  selectedCueId: string | null;
  onSelectCue: (cue: TimelineCue) => void;
  expandedShotId: string | null;
  onToggleShotCamera: (shotId: string | null) => void;
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
  background: '#fff',
};

const rulerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  height: 24,
  marginBottom: 8,
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
};

const tickStyle: React.CSSProperties = {
  position: 'absolute',
  fontSize: 10,
  color: '#9ca3af',
  fontFamily: 'monospace',
  transform: 'translateX(-50%)',
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  acts,
  totalFrames,
  fps,
  selectedCueId,
  onSelectCue,
}) => {
  // 每 30 帧一个刻度
  const tickInterval = Math.max(30, Math.ceil(totalFrames / 10 / 30) * 30);
  const ticks: number[] = [];
  for (let f = 0; f <= totalFrames; f += tickInterval) {
    ticks.push(f);
  }

  return (
    <div style={containerStyle}>
      {/* 时间标尺 */}
      <div style={rulerStyle}>
        {ticks.map((f) => (
          <span key={f} style={{...tickStyle, left: `${(f / totalFrames) * 100}%`}}>
            {f}f
          </span>
        ))}
      </div>

      {/* 幕列表 */}
      {acts.map((act) => (
        <ActTrack
          key={act.actId}
          act={act}
          totalFrames={totalFrames}
          selectedCueId={selectedCueId}
          onSelectCue={onSelectCue}
        />
      ))}

      {acts.length === 0 && (
        <div style={{textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14}}>
          无幕数据
        </div>
      )}
    </div>
  );
};

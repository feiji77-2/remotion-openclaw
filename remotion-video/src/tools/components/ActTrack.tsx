import React, {useState} from 'react';
import type {ActBlock} from '../../data/directorScore';
import {getCuesForAct, getEnergyColor, type TimelineCue} from '../data';
import {CueTrack} from './CueTrack';

interface ActTrackProps {
  act: ActBlock;
  totalFrames: number;
  selectedCueId: string | null;
  onSelectCue: (cue: TimelineCue) => void;
}

const actStyle = (color: string): React.CSSProperties => ({
  background: `${color}10`,
  borderRadius: 6,
  marginBottom: 8,
  border: `1px solid ${color}20`,
  overflow: 'hidden',
});

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  cursor: 'pointer',
  userSelect: 'none',
};

const headerLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const caretStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7280',
  transition: 'transform 0.15s',
};

const actLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#111827',
};

const frameBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  fontFamily: 'monospace',
  background: '#f3f4f6',
  padding: '2px 6px',
  borderRadius: 4,
};

const bodyStyle: React.CSSProperties = {
  padding: '4px 12px 8px 12px',
};

export const ActTrack: React.FC<ActTrackProps> = ({act, totalFrames, selectedCueId, onSelectCue}) => {
  const [expanded, setExpanded] = useState(true);
  const color = getEnergyColor(act.energy);
  const cues = getCuesForAct(act.actId);

  return (
    <div style={actStyle(color)}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <div style={headerLeft}>
          <span style={{...caretStyle, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'}}>▶</span>
          <span style={{display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color}} />
          <span style={actLabelStyle}>{act.actId} · {act.label}</span>
        </div>
        <span style={frameBadgeStyle}>
          {act.fromFrame}-{act.fromFrame + act.durationInFrames}帧
        </span>
      </div>
      {expanded && (
        <div style={bodyStyle}>
          {cues.length === 0 && (
            <div style={{fontSize: 12, color: '#9ca3af', padding: '8px 0', textAlign: 'center'}}>
              此幕无 cue 数据
            </div>
          )}
          {cues.map((cue) => (
            <CueTrack
              key={cue.elementId}
              cue={cue}
              totalFrames={totalFrames}
              selected={cue.elementId === selectedCueId}
              onClick={onSelectCue}
            />
          ))}
        </div>
      )}
    </div>
  );
};

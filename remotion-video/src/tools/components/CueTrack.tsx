import React from 'react';
import type {TimelineCue} from '../data';

interface CueTrackProps {
  cue: TimelineCue;
  /** 时间线总帧数（用于计算百分比宽度） */
  totalFrames: number;
  selected: boolean;
  onClick: (cue: TimelineCue) => void;
  onHover?: (cue: TimelineCue | null) => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 22,
  marginBottom: 2,
  cursor: 'pointer',
  borderRadius: 3,
  padding: '0 4px',
};

const labelStyle: React.CSSProperties = {
  width: 90,
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#374151',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const trackWrapStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  position: 'relative',
  background: '#f3f4f6',
  borderRadius: 2,
  overflow: 'hidden',
};

const barBase: React.CSSProperties = {
  position: 'absolute',
  height: '100%',
  borderRadius: 2,
  transition: 'opacity 0.15s',
};

export const CueTrack: React.FC<CueTrackProps> = ({cue, totalFrames, selected, onClick, onHover}) => {
  const pct = (frame: number) => (totalFrames > 0 ? (frame / totalFrames) * 100 : 0);

  return (
    <div
      style={{...rowStyle, background: selected ? '#eff6ff' : 'transparent'}}
      onClick={() => onClick(cue)}
      onMouseEnter={() => onHover?.(cue)}
      onMouseLeave={() => onHover?.(null)}
      title={`${cue.elementId}  ${cue.enterRange[0]}-${cue.enterRange[1]}帧`}
    >
      <span style={labelStyle}>{cue.elementId}</span>
      <div style={trackWrapStyle}>
        {/* 入场段 */}
        <div
          style={{
            ...barBase,
            left: `${pct(cue.enterRange[0])}%`,
            width: `${pct(cue.enterRange[1] - cue.enterRange[0])}%`,
            background: cue.color,
            opacity: 0.85,
          }}
        />
        {/* 退场段 */}
        {cue.exitRange && (
          <div
            style={{
              ...barBase,
              left: `${pct(cue.exitRange[0])}%`,
              width: `${pct(cue.exitRange[1] - cue.exitRange[0])}%`,
              background: '#9ca3af',
              opacity: 0.5,
            }}
          />
        )}
        {/* 循环动画指示器 */}
        {cue.hasLoop && (
          <div
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#f59e0b',
              transform: 'translateY(-50%)',
            }}
            title="loop animation"
          />
        )}
      </div>
    </div>
  );
};

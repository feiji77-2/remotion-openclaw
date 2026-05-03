import React from 'react';
import type {DirectorScore} from '../../data/directorScore';

interface TimelineFooterProps {
  score: DirectorScore;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#f3f4f6',
  borderTop: '1px solid #e5e7eb',
  fontSize: 12,
  color: '#6b7280',
  fontFamily: 'system-ui, sans-serif',
};

const markerStyle = (type: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  marginLeft: 12,
  fontSize: 11,
  color: type === 'transition' ? '#dc2626' : type === 'emphasis' ? '#d97706' : '#3b82f6',
});

export const TimelineFooter: React.FC<TimelineFooterProps> = ({score, zoom, onZoomChange}) => {
  // 收集所有标记（去重）
  const allMarkers = new Map<string, {label: string; type: string}>();
  for (const act of score.acts) {
    for (const shot of act.shots) {
      for (const m of shot.timelineMarkers ?? []) {
        if (!allMarkers.has(m.label)) {
          allMarkers.set(m.label, {label: m.label, type: m.type});
        }
      }
    }
  }

  return (
    <div style={footerStyle}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <span style={{cursor: 'pointer'}} onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}>🔍−</span>
        <div style={{width: 100, height: 4, background: '#e5e7eb', borderRadius: 2, position: 'relative'}}>
          <div style={{width: `${(zoom - 0.5) / 3.5 * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 2}} />
        </div>
        <span style={{cursor: 'pointer'}} onClick={() => onZoomChange(Math.min(4, zoom + 0.2))}>🔍+</span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{width: 80, height: 4, margin: 0}}
        />
      </div>
      <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2}}>
        {Array.from(allMarkers.values()).map((m) => (
          <span key={m.label} style={markerStyle(m.type)}>
            ◆ {m.label}
          </span>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import type {DirectorScore, EnergyLevel} from '../../data/directorScore';
import {getEnergyColor} from '../data';

interface PreviewHeaderProps {
  score: DirectorScore;
}

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  explosive: '爆发',
  high: '高能',
  moderate: '温和',
  calm: '平静',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  fontFamily: 'system-ui, sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111827',
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
};

const pillStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
  background: color,
  marginLeft: 4,
});

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({score}) => {
  const durationSec = (score.totalFrames / score.fps).toFixed(1);
  return (
    <div style={headerStyle}>
      <div>
        <span style={titleStyle}>DirectorScore Preview · {score.id}</span>
        <span style={{...metaStyle, marginLeft: 12}}>
          {score.totalFrames}帧 · {score.fps}fps · {durationSec}s
        </span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
        <span style={{fontSize: 12, color: '#6b7280', marginRight: 4}}>能量:</span>
        {score.acts.map((act) => (
          <span key={act.actId} style={pillStyle(getEnergyColor(act.energy))} title={act.label}>
            {ENERGY_LABELS[act.energy as EnergyLevel] ?? act.energy}
          </span>
        ))}
      </div>
    </div>
  );
};

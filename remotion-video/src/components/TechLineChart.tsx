import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

interface DataPoint { x: number; y: number; label?: string; }
interface TechLineChartProps {
  title?: string;
  lines: { label: string; points: DataPoint[]; color: string }[];
  xLabel: string;
  yLabel: string;
  bgColor?: string;
  startFrame?: number;
  durationFrames?: number;
}

export const TechLineChart: React.FC<TechLineChartProps> = ({
  title = '',
  lines,
  xLabel,
  yLabel,
  bgColor = '#0a0a1a',
  startFrame = 0,
  durationFrames = 300,
}) => {
  const frame = useCurrentFrame();
  const W = 900, H = 500, PAD = 80;
  const chartW = W - PAD * 2, chartH = H - PAD * 2;

  // Shot-relative frame (0 = start of this shot)
  const relFrame = Math.max(0, frame - startFrame);
  // Clamp at end of shot
  const clampedRel = Math.min(relFrame, durationFrames);

  // SVG path for a smooth curve through points
  const makePath = (pts: DataPoint[], progress: number): string => {
    const visible = pts.filter(p => p.x <= progress);
    if (visible.length < 2) return '';
    const path = visible.map((p, i) => {
      const px = PAD + (p.x / 1.0) * chartW;
      const py = PAD + chartH - (p.y / 1.0) * chartH;
      return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
    }).join(' ');
    return path;
  };

  // progress 0→1 over the full duration of the shot (not just first 2 seconds)
  const progress = interpolate(clampedRel, [0, durationFrames], [0, 1], { extrapolateRight: 'extend' });

  return (
    <AbsoluteFill style={{ background: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      {/* Grid */}
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line
              x1={PAD} y1={PAD + chartH * t}
              x2={PAD + chartW} y2={PAD + chartH * t}
              stroke="#00d4ff22" strokeWidth={1}
            />
          </g>
        ))}
        {/* X axis */}
        <line x1={PAD} y1={PAD + chartH} x2={PAD + chartW} y2={PAD + chartH} stroke="#00d4ff44" strokeWidth={2} />
        {/* Y axis */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + chartH} stroke="#00d4ff44" strokeWidth={2} />
        {/* Labels */}
        <text x={PAD + chartW / 2} y={H - 10} fill="#00d4ff" fontSize={20} textAnchor="middle" fontFamily="'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif">{xLabel}</text>
        <text x={20} y={PAD + chartH / 2} fill="#00d4ff" fontSize={20} textAnchor="middle" fontFamily="'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif" transform={`rotate(-90, 20, ${PAD + chartH / 2})`}>{yLabel}</text>
      </svg>

      {/* Curves */}
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {lines.map((line, li) => {
          const pts = line.points;
          const d = makePath(pts, progress);
          return d ? (
            <path key={li} d={d} fill="none" stroke={line.color} strokeWidth={4}
              style={{ filter: `drop-shadow(0 0 8px ${line.color})` }} />
          ) : null;
        })}
      </svg>

      {/* Labels */}
      <div style={{ position: 'absolute', top: 30, left: 0, right: 0, textAlign: 'center' }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: 'inline-block',
            margin: '0 20px',
            color: line.color,
            fontSize: 24,
            fontWeight: 700,
            textShadow: `0 0 10px ${line.color}`,
          }}>
            {line.label}
          </div>
        ))}
      </div>

      {/* Title */}
      {title && (
        <div style={{ position: 'absolute', bottom: 20, right: 30, color: '#ffffff88', fontSize: 20 }}>
          {title}
        </div>
      )}
    </AbsoluteFill>
  );
};

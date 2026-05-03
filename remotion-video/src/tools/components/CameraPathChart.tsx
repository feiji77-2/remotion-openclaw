import React from 'react';
import type {CameraPathCue} from '../../data/directorScore';

interface CameraPathChartProps {
  path: CameraPathCue[];
  shotId: string;
  totalFrames: number;
}

const CHART_HEIGHT = 80;
const CHART_WIDTH_PCT = 100;
const PADDING = {top: 8, bottom: 16, left: 8, right: 8};

const containerStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 8,
  padding: 8,
  background: '#f9fafb',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 4,
  fontFamily: 'monospace',
};

export const CameraPathChart: React.FC<CameraPathChartProps> = ({path, shotId, totalFrames}) => {
  if (!path.length) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{shotId} · 无摄像机路径</div>
      </div>
    );
  }

  const maxFrame = Math.max(...path.map((p) => p.atFrame), 1);
  const maxZoom = Math.max(...path.map((p) => p.zoom ?? 1), 1);
  const maxPan = Math.max(
    ...path.map((p) => Math.abs(p.panX ?? 0)),
    ...path.map((p) => Math.abs(p.panY ?? 0)),
    1
  );

  const toX = (frame: number) => (frame / maxFrame) * (CHART_WIDTH_PCT - PADDING.left - PADDING.right);
  const toY = (val: number, max: number) => CHART_HEIGHT - PADDING.bottom - ((val / max) * (CHART_HEIGHT - PADDING.top - PADDING.bottom));

  const makeLine = (getVal: (p: CameraPathCue) => number, max: number, color: string) => {
    const points = path.map((p) => `${toX(p.atFrame)},${toY(getVal(p), max)}`).join(' ');
    return <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />;
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{shotId} · 摄像机路径 (zoom/pan)</div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH_PCT} ${CHART_HEIGHT}`}
        style={{width: '100%', height: CHART_HEIGHT, fontFamily: 'monospace'}}
      >
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`g-${ratio}`}
            x1={PADDING.left}
            y1={toY(ratio, 1)}
            x2={CHART_WIDTH_PCT - PADDING.right}
            y2={toY(ratio, 1)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
        {/* zoom 曲线 */}
        {makeLine((p) => (p.zoom ?? 1) - 1, maxZoom - 1, '#3b82f6')}
        {/* panX 曲线 */}
        {makeLine((p) => Math.abs(p.panX ?? 0) / maxPan * maxPan, maxPan, '#10b981')}
        {/* panY 曲线 */}
        {makeLine((p) => Math.abs(p.panY ?? 0) / maxPan * maxPan, maxPan, '#f59e0b')}
        {/* 关键帧标记 */}
        {path.map((p, i) => (
          <circle key={i} cx={toX(p.atFrame)} cy={CHART_HEIGHT - PADDING.bottom} r={2} fill="#9ca3af" />
        ))}
      </svg>
      <div style={{display: 'flex', gap: 16, fontSize: 10, color: '#6b7280', marginTop: 2}}>
        <span><span style={{color: '#3b82f6'}}>━</span> zoom</span>
        <span><span style={{color: '#10b981'}}>━</span> panX</span>
        <span><span style={{color: '#f59e0b'}}>━</span> panY</span>
      </div>
    </div>
  );
};

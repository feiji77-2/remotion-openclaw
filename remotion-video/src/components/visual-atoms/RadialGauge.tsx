import React from 'react';

export interface RadialGaugeProps {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  valueLabel: string;
  subtitle?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  progress,
  color,
  size = 120,
  strokeWidth = 10,
  valueLabel,
  subtitle,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const orbitAngle = -90 + clamped * 360;
  const orbitX = center + Math.cos((orbitAngle * Math.PI) / 180) * radius;
  const orbitY = center + Math.sin((orbitAngle * Math.PI) / 180) * radius;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} style={{width: '100%', height: '100%', overflow: 'visible'}}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
          style={{filter: `drop-shadow(0 0 12px ${color}88)`}}
        />
        <circle
          cx={orbitX}
          cy={orbitY}
          r={Math.max(5, strokeWidth * 0.6)}
          fill="rgba(255,255,255,0.96)"
          style={{filter: `drop-shadow(0 0 10px ${color})`}}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: Math.max(14, strokeWidth + 6),
          borderRadius: '50%',
          background: 'rgba(8,10,18,0.92)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 3,
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: Math.max(20, size * 0.2), lineHeight: 1, fontWeight: 820, color}}>
          {valueLabel}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: Math.max(10, size * 0.09),
              letterSpacing: 1.3,
              color: 'rgba(255,255,255,0.46)',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
};


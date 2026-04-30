import React from 'react';
import {useCurrentFrame} from 'remotion';

export interface OrbitLabelItem {
  label: string;
  accent?: string;
  detail?: string;
}

export interface OrbitLabelsProps {
  centerLabel: string;
  centerValue?: string;
  items: OrbitLabelItem[];
  color?: string;
  radius?: number;
  subtitle?: string;
}

export const OrbitLabels: React.FC<OrbitLabelsProps> = ({
  centerLabel,
  centerValue,
  items,
  color = '#63ddff',
  radius = 220,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const visibleItems = items.slice(0, 6);
  const coreSize = Math.max(170, radius * 0.84);

  return (
    <div style={{position: 'relative', width: '100%', height: '100%', pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: radius * 2,
          height: radius * 2,
          transform: `translate(-50%, -50%) rotate(${frame * 0.18}deg)`,
          borderRadius: '50%',
          border: `1px solid ${color}30`,
          boxShadow: `0 0 36px ${color}16 inset`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: radius * 1.45,
          height: radius * 1.45,
          transform: `translate(-50%, -50%) rotate(${-frame * 0.12}deg)`,
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: coreSize,
          minHeight: coreSize * 0.72,
          transform: 'translate(-50%, -50%)',
          borderRadius: 36,
          background: `radial-gradient(circle at 50% 35%, ${color}22 0%, rgba(7,12,22,0.92) 68%)`,
          border: `1px solid ${color}44`,
          boxShadow: `0 0 42px ${color}20, inset 0 0 0 1px rgba(255,255,255,0.04)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '22px 26px',
          backdropFilter: 'blur(10px)',
        }}
      >
        {subtitle ? (
          <div
            style={{
              marginBottom: 8,
              color: 'rgba(229,236,255,0.68)',
              fontSize: 12,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            color: '#f7fbff',
            fontSize: centerValue ? 22 : 28,
            fontWeight: 700,
            letterSpacing: 0.4,
            lineHeight: 1.1,
          }}
        >
          {centerLabel}
        </div>
        {centerValue ? (
          <div
            style={{
              marginTop: 10,
              color,
              fontSize: 58,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
              textShadow: `0 0 24px ${color}44`,
            }}
          >
            {centerValue}
          </div>
        ) : null}
      </div>
      {visibleItems.map((item, index) => {
        const theta = ((Math.PI * 2) / Math.max(1, visibleItems.length)) * index - Math.PI / 2 + frame * 0.0035;
        const orbitRadius = radius + (index % 2 === 0 ? 0 : 46);
        const x = Math.cos(theta) * orbitRadius;
        const y = Math.sin(theta) * orbitRadius * 0.76;
        const itemColor = item.accent ?? color;
        return (
          <div
            key={`${item.label}-${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: itemColor,
                boxShadow: `0 0 16px ${itemColor}`,
              }}
            />
            <div
              style={{
                maxWidth: 180,
                padding: '12px 16px',
                borderRadius: 22,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(8, 12, 20, 0.7)',
                boxShadow: `0 0 20px ${itemColor}14`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#f7fbff',
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.12,
                }}
              >
                {item.label}
              </div>
              {item.detail ? (
                <div
                  style={{
                    marginTop: 4,
                    color: 'rgba(229,236,255,0.68)',
                    fontSize: 12,
                    lineHeight: 1.3,
                  }}
                >
                  {item.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

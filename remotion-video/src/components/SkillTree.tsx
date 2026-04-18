import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {POSTER_CENTER_Y} from '../render/layoutRhythm';

interface SkillNode {
  label: string;
  x: number;
  y: number;
}

interface SkillTreeProps {
  title?: string;
  mainNumber: string;
  mainLabel: string;
  subInfo?: string;
  nodes: SkillNode[];
  accentColor?: string;
  bgColor?: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveLabelPlacement = (
  x: number,
  y: number,
  index: number,
  centerX: number,
  centerY: number,
) => {
  const isCenterColumn = Math.abs(x - centerX) < 56;
  const isNearHeroCore = Math.abs(y - centerY) < 190;

  if (isCenterColumn) {
    const side = index % 2 === 0 ? 'right' : 'left';
    const isLowerNode = y > centerY + 18;
    return {
      alignLeft: side === 'left',
      labelOffsetX: isNearHeroCore ? (isLowerNode ? 156 : 126) : 104,
      labelOffsetY: -18,
    };
  }

  return {
    alignLeft: x < centerX,
    labelOffsetX: 18,
    labelOffsetY: -18,
  };
};

const resolveConnectorOrigin = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
) => {
  const isCenterColumn = Math.abs(x - centerX) < 56;
  const isUpperNode = y < centerY;

  if (isCenterColumn) {
    return {
      x1: centerX,
      y1: isUpperNode ? centerY - 168 : centerY + 126,
    };
  }

  return {
    x1: centerX + (x < centerX ? -84 : 84),
    y1: isUpperNode ? centerY - 104 : centerY + 94,
  };
};

const resolveConnectorSegment = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
) => {
  const isCenterColumn = Math.abs(x - centerX) < 56;
  const isUpperNode = y < centerY;

  if (isCenterColumn && isUpperNode) {
    return {
      x1: x,
      y1: y + 18,
      x2: x,
      y2: Math.min(centerY - 224, y + 110),
    };
  }

  const origin = resolveConnectorOrigin(x, y, centerX, centerY);
  return {
    x1: origin.x1,
    y1: origin.y1,
    x2: x,
    y2: y,
  };
};

export const SkillTree: React.FC<SkillTreeProps> = ({
  title = '自我进化',
  mainNumber,
  mainLabel,
  subInfo,
  nodes,
  accentColor = '#FFD700',
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();
  const centerX = 540;
  const centerY = POSTER_CENTER_Y;
  const heroProgress = clamp01((frame - 18) / 26);

  void title;

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 48%, ${toRgba(accentColor, 0.18)} 0%, transparent 28%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 76%, ${toRgba(accentColor, 0.08)} 0%, transparent 26%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: centerX,
          top: centerY,
          transform: `translate(-50%, -50%) scale(${interpolate(heroProgress, [0, 1], [0.9, 1])})`,
          opacity: interpolate(heroProgress, [0, 0.3, 1], [0, 0.6, 1]),
          textAlign: 'center',
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontSize: mainNumber.length > 6 ? 92 : 132,
            fontWeight: 900,
            color: accentColor,
            lineHeight: 0.92,
            letterSpacing: mainNumber.length > 6 ? -2.8 : -4.5,
            textShadow: `0 0 34px ${toRgba(accentColor, 0.58)}`,
          }}
        >
          {mainNumber}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 34,
            fontWeight: 700,
            color: '#f5f9ff',
            letterSpacing: -0.4,
          }}
        >
          {mainLabel}
        </div>
        {subInfo ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 20,
              color: toRgba(accentColor, 0.78),
              letterSpacing: 0.1,
            }}
          >
            {subInfo}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          left: centerX - 190,
          right: centerX - 190,
          top: centerY + 154,
          height: 1,
          background: `linear-gradient(90deg, ${toRgba(accentColor, 0)}, ${toRgba(accentColor, 0.42)}, ${toRgba(accentColor, 0)})`,
          opacity: heroProgress,
        }}
      />

      <svg
        width={1080}
        height={1920}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
        }}
      >
        {nodes.map((node, index) => {
          const nodeProgress = clamp01((frame - (34 + index * 10)) / 18);
          const x = 220 + node.x * 640;
          const y = 620 + node.y * 520;
          const lineOpacity = interpolate(nodeProgress, [0, 1], [0, 0.6]);
          const connector = resolveConnectorSegment(x, y, centerX, centerY);

          return (
            <g
              key={node.label}
              style={{
                opacity: nodeProgress,
                transform: `translateY(${interpolate(nodeProgress, [0, 1], [18, 0])}px)`,
              }}
            >
              <line
                x1={connector.x1}
                y1={connector.y1}
                x2={x}
                y2={y}
                stroke={toRgba(accentColor, lineOpacity)}
                strokeWidth={1.5}
              />
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={accentColor}
                opacity={0.9}
              />
              <circle
                cx={x}
                cy={y}
                r={18}
                fill={toRgba(accentColor, 0.12)}
              />
            </g>
          );
        })}
      </svg>

      {nodes.map((node, index) => {
        const nodeProgress = clamp01((frame - (34 + index * 10)) / 18);
        const x = 220 + node.x * 640;
        const y = 620 + node.y * 520;
        const placement = resolveLabelPlacement(x, y, index, centerX, centerY);
        const alignLeft = placement.alignLeft;
        const labelOffsetX = alignLeft ? -placement.labelOffsetX : placement.labelOffsetX;

        return (
          <div
            key={`${node.label}-label`}
            style={{
              position: 'absolute',
              left: x + labelOffsetX,
              top: y + placement.labelOffsetY,
              transform: `translate(${alignLeft ? '-100%' : '0'}, ${interpolate(nodeProgress, [0, 1], [12, 0])}px)`,
              opacity: nodeProgress,
              color: '#e8f3ff',
              fontSize: 22,
              fontWeight: 650,
              letterSpacing: -0.2,
              whiteSpace: 'nowrap',
            }}
          >
            {node.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

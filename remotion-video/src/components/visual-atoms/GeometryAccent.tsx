import React, {type CSSProperties} from 'react';

export type GeometryAccentVariant = 'slanted-panel' | 'ring' | 'hexagon-outline' | 'arc';

export interface GeometryAccentProps {
  variant: GeometryAccentVariant;
  color: string;
  opacity?: number;
  style?: CSSProperties;
}

export const GeometryAccent: React.FC<GeometryAccentProps> = ({
  variant,
  color,
  opacity = 0.18,
  style,
}) => {
  if (variant === 'ring') {
    return (
      <div
        style={{
          position: 'absolute',
          borderRadius: '50%',
          border: `1px solid ${color}22`,
          boxShadow: `0 0 40px ${color}12`,
          opacity,
          ...style,
        }}
      />
    );
  }

  if (variant === 'hexagon-outline') {
    return (
      <svg
        viewBox="0 0 200 180"
        style={{
          position: 'absolute',
          overflow: 'visible',
          opacity,
          ...style,
        }}
      >
        <polygon
          points="100,6 182,50 182,130 100,174 18,130 18,50"
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      </svg>
    );
  }

  if (variant === 'arc') {
    return (
      <svg
        viewBox="0 0 240 120"
        style={{
          position: 'absolute',
          overflow: 'visible',
          opacity,
          ...style,
        }}
      >
        <path
          d="M 12 94 Q 120 8 228 94"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        clipPath: 'polygon(0% 24%, 88% 0%, 100% 76%, 12% 100%)',
        background: `linear-gradient(135deg, ${color}, transparent 74%)`,
        opacity,
        ...style,
      }}
    />
  );
};


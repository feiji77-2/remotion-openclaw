import React from 'react';

export type FlowMarkerShape = 'circle' | 'diamond' | 'ring';

export interface PathDrawLinkProps {
  d: string;
  color: string;
  progress: number;
  frame?: number;
  marker?: {
    x: number;
    y: number;
    size?: number;
    shape?: FlowMarkerShape;
  } | null;
  baseColor?: string;
  guideOpacity?: number;
  baseStrokeWidth?: number;
  flowStrokeWidth?: number;
  drawStrokeWidth?: number;
  drawColor?: string;
  dashPattern?: string;
  flowSpeed?: number;
  drawOpacity?: number;
  flowOpacity?: number;
}

export const PathDrawLink: React.FC<PathDrawLinkProps> = ({
  d,
  color,
  progress,
  frame = 0,
  marker = null,
  baseColor = 'rgba(255,255,255,0.08)',
  guideOpacity = 1,
  baseStrokeWidth = 3,
  flowStrokeWidth = 4,
  drawStrokeWidth = 1.5,
  drawColor = 'rgba(255,255,255,0.92)',
  dashPattern = '10 12',
  flowSpeed = 1.8,
  drawOpacity = 0.88,
  flowOpacity = 0.72,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const markerSize = marker?.size ?? 6;
  const markerShape = marker?.shape ?? 'circle';

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={baseColor}
        strokeWidth={baseStrokeWidth}
        strokeLinecap="round"
        opacity={guideOpacity}
      />
      <path
        d={d}
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth={flowStrokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashPattern}
        strokeDashoffset={frame * flowSpeed * -1}
        opacity={Math.max(0.14, flowOpacity * clamped)}
        style={{filter: `drop-shadow(0 0 10px ${color}88)`}}
      />
      <path
        d={d}
        pathLength={100}
        fill="none"
        stroke={drawColor}
        strokeWidth={drawStrokeWidth}
        strokeLinecap="round"
        strokeDasharray="100"
        strokeDashoffset={100 - clamped * 100}
        opacity={drawOpacity}
      />
      {marker ? (
        markerShape === 'diamond' ? (
          <rect
            x={marker.x - markerSize}
            y={marker.y - markerSize}
            width={markerSize * 2}
            height={markerSize * 2}
            rx={Math.max(2, markerSize * 0.35)}
            fill={color}
            transform={`rotate(45 ${marker.x} ${marker.y})`}
            style={{filter: `drop-shadow(0 0 12px ${color})`}}
          />
        ) : markerShape === 'ring' ? (
          <circle
            cx={marker.x}
            cy={marker.y}
            r={markerSize}
            fill="rgba(8,10,18,0.92)"
            stroke={color}
            strokeWidth={Math.max(2, markerSize * 0.5)}
            style={{filter: `drop-shadow(0 0 10px ${color})`}}
          />
        ) : (
          <circle
            cx={marker.x}
            cy={marker.y}
            r={markerSize}
            fill={color}
            style={{filter: `drop-shadow(0 0 12px ${color})`}}
          />
        )
      ) : null}
    </>
  );
};

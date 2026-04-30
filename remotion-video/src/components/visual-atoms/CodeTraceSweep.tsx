import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export interface CodeTraceSweepProps {
  lines: string[];
  highlightLine?: number;
  color?: string;
  filename?: string;
  mode?: 'code' | 'terminal';
  focusToken?: string;
  delayFrames?: number;
}

export const CodeTraceSweep: React.FC<CodeTraceSweepProps> = ({
  lines,
  highlightLine = 1,
  color = '#63ddff',
  filename,
  mode = 'code',
  focusToken,
  delayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, frame - delayFrames);
  const reveal = spring({
    fps,
    frame: localFrame,
    config: {damping: 200, stiffness: 180, mass: 0.9},
  });
  const sweepY = interpolate(localFrame % 80, [0, 79], [20, 88], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const visibleLines = lines.slice(0, 6);
  const resolvedHighlight = Math.max(1, Math.min(highlightLine, visibleLines.length || 1));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 30,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: mode === 'terminal'
          ? 'linear-gradient(180deg, rgba(4, 12, 17, 0.95) 0%, rgba(4, 8, 14, 0.98) 100%)'
          : 'linear-gradient(180deg, rgba(8, 12, 20, 0.96) 0%, rgba(10, 16, 28, 0.98) 100%)',
        boxShadow: `0 0 34px ${color}16`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          height: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        {mode === 'terminal'
          ? ['#ff5f57', '#febc2e', '#28c840'].map((dot) => (
              <div key={dot} style={{width: 10, height: 10, borderRadius: '50%', background: dot}} />
            ))
          : null}
        <div
          style={{
            color: 'rgba(229,236,255,0.76)',
            fontSize: 14,
            letterSpacing: 0.3,
            fontWeight: 600,
            marginLeft: mode === 'terminal' ? 6 : 0,
          }}
        >
          {filename ?? (mode === 'terminal' ? 'trace://command-beam' : 'trace://code-evidence')}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${sweepY}%`,
          height: 28,
          transform: 'translateY(-50%)',
          background: `linear-gradient(180deg, ${color}00 0%, ${color}14 48%, ${color}00 100%)`,
          filter: 'blur(1px)',
          opacity: 0.86,
        }}
      />
      <div style={{padding: '24px 26px 22px', display: 'grid', gap: 10}}>
        {visibleLines.map((line, index) => {
          const isHighlighted = index + 1 === resolvedHighlight;
          const tokenHit = focusToken && line.includes(focusToken);
          return (
            <div
              key={`${line}-${index}`}
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '36px minmax(0, 1fr)',
                gap: 14,
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 18,
                background: isHighlighted ? `${color}16` : 'rgba(255,255,255,0.02)',
                border: isHighlighted ? `1px solid ${color}44` : '1px solid transparent',
                opacity: interpolate(reveal, [0, 1], [0.3, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                transform: `translateX(${interpolate(reveal, [0, 1], [14 - index * 2, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}px)`,
              }}
            >
              <div
                style={{
                  color: 'rgba(229,236,255,0.42)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'right',
                  fontFamily: 'JetBrains Mono, Menlo, monospace',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  color: tokenHit ? color : '#f7fbff',
                  fontSize: 17,
                  lineHeight: 1.35,
                  fontFamily: 'JetBrains Mono, Menlo, monospace',
                  textShadow: isHighlighted ? `0 0 20px ${color}35` : undefined,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {line}
              </div>
              {isHighlighted ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    borderRadius: 999,
                    background: color,
                    boxShadow: `0 0 16px ${color}`,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

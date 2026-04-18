import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface CodeBlockProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  highlightLines?: number[];
  accentColor?: string;
}

/**
 * 代码展示块
 * 带语法高亮风格 + 行号 + 逐行滑入
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'python',
  lineNumbers = true,
  highlightLines = [],
  accentColor = '#00BCD4',
}) => {
  const frame = useCurrentFrame();
  const lines = code.split('\n');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 80px',
      }}
    >
      {/* 语言标签 */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 80,
          padding: '6px 16px',
          background: '#1a1f2e',
          borderRadius: 6,
          fontSize: 18,
          color: accentColor,
          fontFamily: 'monospace',
          border: `1px solid ${accentColor}`,
        }}
      >
        {language}
      </div>

      <div
        style={{
          background: '#161b22',
          borderRadius: 12,
          padding: '32px 40px',
          maxWidth: 900,
          width: '100%',
          overflow: 'hidden',
          border: `1px solid rgba(255,255,255,0.1)`,
        }}
      >
        {lines.map((line, i) => {
          const lineFrame = Math.max(0, frame - i * 3);
          const opacity = interpolate(lineFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
          const translateX = spring({ fps: 30, frame: lineFrame, config: { damping: 150, stiffness: 120 } });
          const isHighlight = highlightLines.includes(i + 1);

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 24,
                fontFamily: 'monospace',
                fontSize: 22,
                lineHeight: 1.8,
                transform: `translateX(${(1 - translateX) * -20}px)`,
                opacity,
                background: isHighlight ? 'rgba(0,188,212,0.08)' : 'transparent',
                borderLeft: isHighlight ? `3px solid ${accentColor}` : '3px solid transparent',
                paddingLeft: isHighlight ? 8 : 0,
                marginLeft: -8,
              }}
            >
              {lineNumbers && (
                <span
                  style={{
                    color: 'rgba(255,255,255,0.2)',
                    minWidth: 32,
                    textAlign: 'right',
                    userSelect: 'none',
                  }}
                >
                  {i + 1}
                </span>
              )}
              <span style={{ color: isHighlight ? accentColor : '#E6EDF3' }}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

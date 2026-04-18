import React, { useState, useEffect } from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface TerminalShowProps {
  title?: string;
  code: string;
  outputLines?: string[];
  prompt?: string;
  accentColor?: string;
}

/**
 * 终端界面动画
 * 模拟代码逐字输出 + 输出结果显示
 */
export const TerminalShow: React.FC<TerminalShowProps> = ({
  title = 'terminal',
  code,
  outputLines = [],
  prompt = '>>>',
  accentColor = '#00BCD4',
}) => {
  const frame = useCurrentFrame();

  // 计算当前显示到第几个字符
  const charsToShow = Math.floor(frame * 3); // 速度控制
  const displayCode = code.slice(0, charsToShow);

  // 输出行逐步显示
  const outputFrame = Math.max(0, frame - code.length / 3 - 10);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0f1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
      }}
    >
      {/* 窗口头 */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          background: '#1a1f2e',
          borderRadius: '16px 16px 0 0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 0,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#28C840' }} />
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 20,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'monospace',
          }}
        >
          {title}
        </div>
      </div>

      {/* 终端内容 */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          background: '#0d1117',
          borderRadius: '0 0 16px 16px',
          padding: '40px',
          fontFamily: 'monospace',
          fontSize: 26,
          minHeight: 400,
        }}
      >
        {/* 命令行 */}
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ color: accentColor }}>{prompt}</span>
          <span style={{ color: '#E6EDF3' }}>{displayCode}</span>
          {/* 光标 */}
          {charsToShow < code.length && (
            <span
              style={{
                width: 3,
                height: 30,
                background: accentColor,
                display: 'inline-block',
                animation: 'blink 0.8s infinite',
              }}
            />
          )}
        </div>

        {/* 输出行 */}
        {outputLines.slice(0, Math.floor(outputFrame / 15)).map((line, i) => (
          <div
            key={i}
            style={{
              color: line.startsWith('>') ? '#7EE787' : '#E6EDF3',
              marginTop: 12,
              opacity: interpolate(outputFrame - i * 15, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* 底部数据 */}
      <div
        style={{
          marginTop: 40,
          fontSize: 22,
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
        }}
      >
        {outputLines.length > 0 ? `${outputLines.length} lines output` : '...'}
      </div>
    </div>
  );
};

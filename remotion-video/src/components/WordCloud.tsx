import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface WordCloudProps {
  words: { text: string; weight: number; color?: string }[];
  accentColor?: string;
  bgColor?: string;
}

/**
 * 词云展示 — 重新美化版
 * 居中布局 + 背景光晕 + 装饰框架 + 浮动动画
 */
export const WordCloud: React.FC<WordCloudProps> = ({
  words,
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();
  const glowPulse = (Math.sin(frame * 0.05) + 1) * 0.5;

  const maxWeight = Math.max(...words.map((w) => w.weight));
  const minWeight = Math.min(...words.map((w) => w.weight));

  // 字号映射
  const fontSizes = [22, 30, 40, 52, 68, 88, 120];

  // 颜色方案
  const colorMap = (norm: number) => {
    if (norm > 0.8) return accentColor;
    if (norm > 0.6) return '#00BCD4';
    if (norm > 0.4) return '#8B5CF6';
    if (norm > 0.2) return '#F59E0B';
    return 'rgba(255,255,255,0.65)';
  };

  // 居中排列：分行，每行尽量填满
  const lines: typeof words[] = [];
  const perRow = 4;
  for (let i = 0; i < words.length; i += perRow) {
    lines.push(words.slice(i, i + perRow));
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ===== 背景光晕 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          background: `radial-gradient(ellipse, ${accentColor}10 0%, transparent 65%)`,
          opacity: 0.7 + glowPulse * 0.3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          background: `radial-gradient(ellipse, ${accentColor}16 0%, transparent 65%)`,
          opacity: 0.5 + glowPulse * 0.2,
        }}
      />

      {/* ===== 顶部标签 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
          letterSpacing: 6,
          textTransform: 'uppercase',
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        KEYWORD CLOUD
      </div>

      {/* ===== 装饰边框 ===== */}
      {/* 顶部左角 */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 80,
          width: 60,
          height: 60,
          borderTop: `2px solid ${accentColor}40`,
          borderLeft: `2px solid ${accentColor}40`,
          borderRadius: '4px 0 0 0',
          opacity: 0.5,
        }}
      />
      {/* 顶部右角 */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          right: 80,
          width: 60,
          height: 60,
          borderTop: `2px solid ${accentColor}40`,
          borderRight: `2px solid ${accentColor}40`,
          borderRadius: '0 4px 0 0',
          opacity: 0.5,
        }}
      />
      {/* 底部左角 */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 80,
          width: 60,
          height: 60,
          borderBottom: `2px solid ${accentColor}40`,
          borderLeft: `2px solid ${accentColor}40`,
          borderRadius: '0 0 0 4px',
          opacity: 0.5,
        }}
      />
      {/* 底部右角 */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          right: 80,
          width: 60,
          height: 60,
          borderBottom: `2px solid ${accentColor}40`,
          borderRight: `2px solid ${accentColor}40`,
          borderRadius: '0 0 4px 0',
          opacity: 0.5,
        }}
      />

      {/* ===== 词云主体 ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            style={{
              display: 'flex',
              gap: 32,
              alignItems: 'center',
            }}
          >
            {line.map((word, wordIdx) => {
              const globalIdx = lineIdx * perRow + wordIdx;
              const norm =
                maxWeight === minWeight
                  ? 0.5
                  : (word.weight - minWeight) / (maxWeight - minWeight);
              const fontSize = fontSizes[Math.floor(norm * (fontSizes.length - 1))];
              const delay = globalIdx * 8;
              const itemFrame = Math.max(0, frame - delay);
              const scale = spring({
                fps: 30,
                frame: itemFrame,
                config: { damping: 140, stiffness: 90 },
              });
              const opacity = interpolate(itemFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
              const floatY = Math.sin((frame * 0.03) + globalIdx * 0.8) * 4;
              const color = word.color || colorMap(norm);
              const hasGlow = norm > 0.5;

              return (
                <div
                  key={wordIdx}
                  style={{
                    fontSize,
                    fontWeight: norm > 0.5 ? 800 : 500,
                    color,
                    transform: `translateY(${floatY}px) scale(${scale})`,
                    opacity,
                    textShadow: hasGlow
                      ? `0 0 20px ${color}66, 0 0 40px ${color}22`
                      : 'none',
                    whiteSpace: 'nowrap',
                    letterSpacing: norm > 0.6 ? -0.5 : 0,
                    padding: '6px 0',
                    transition: 'color 0.3s',
                  }}
                >
                  {word.text}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ===== 底部标签 ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: interpolate(frame, [40, 70], [0, 0.5], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ width: 60, height: 1, background: `${accentColor}40` }} />
        <div
          style={{
            color: `${accentColor}70`,
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          FULL COVERAGE
        </div>
        <div style={{ width: 60, height: 1, background: `${accentColor}40` }} />
      </div>

      {/* ===== 粒子 ===== */}
      {[
        { top: '12%', left: '8%', size: 3 },
        { top: '20%', right: '10%', size: 4 },
        { top: '75%', left: '6%', size: 3 },
        { top: '82%', right: '8%', size: 4 },
        { bottom: '18%', left: '15%', size: 3 },
        { bottom: '22%', right: '15%', size: 3 },
        { top: '40%', left: '4%', size: 2 },
        { top: '55%', right: '4%', size: 2 },
      ].map((p, i) => {
        const pFrame = Math.max(0, frame - i * 5);
        const pOpacity = interpolate(pFrame, [0, 15], [0, 0.4], { extrapolateRight: "clamp" });
        const pY = interpolate(pFrame, [0, 30], [-8, 8], { extrapolateRight: "clamp" });
        const colors = [accentColor, '#00BCD4', '#8B5CF6', '#F59E0B'];
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              right: p.right,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: color,
              opacity: pOpacity,
              transform: `translateY(${pY}px)`,
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};

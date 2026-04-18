import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface SceneGridProps {
  items: string[];
  cols?: number;
  rows?: number;
  bgColor?: string;
  cellBgColor?: string;
  accentColor?: string;
}

/**
 * 场景网格矩阵 — 重新美化版
 * 改为4列×6行，格子更大，字号更清晰
 */
export const SceneGrid: React.FC<SceneGridProps> = ({
  items,
  cols: colsProp,
  rows: rowsProp,
  bgColor = '#0D0D1A',
  cellBgColor = '#1a1a2e',
  accentColor = '#FF6B35',
}) => {
  const frame = useCurrentFrame();

  // 自动选择最优列数
  const autoCols = colsProp ?? (items.length > 16 ? 4 : items.length > 9 ? 4 : 3);
  const autoRows = rowsProp ?? Math.ceil(items.length / autoCols);

  const marginX = 120;
  const marginY = 100;
  const gapX = 20;
  const gapY = 20;

  const gridWidth = 1080 - marginX * 2;
  const gridHeight = 1920 - marginY * 2 - 80; // 留底部标签空间

  const cellW = (gridWidth - gapX * (autoCols - 1)) / autoCols;
  const cellH = Math.min(
    (gridHeight - gapY * (autoRows - 1)) / autoRows,
    cellW * 0.8
  );

  // 计算字号：格子越大字越大
  const fontSize = Math.max(13, Math.min(24, cellW / 5.5));
  const subFontSize = fontSize * 0.82;

  // 随机颜色数组，让格子更有层次感
  const cellPalette = [
    '#1a1a2e',
    '#1e1e38',
    '#1a2634',
    '#1e2a1e',
    '#2a1a2e',
  ];
  const borderPalette = [
    'rgba(255,107,53,0.25)',
    'rgba(0,188,212,0.2)',
    'rgba(139,92,246,0.2)',
    'rgba(16,185,129,0.2)',
    'rgba(245,158,11,0.2)',
  ];

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
        padding: `${marginY}px ${marginX}px`,
      }}
    >
      {/* 顶部标题 */}
      <div
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 28,
          fontWeight: 400,
        }}
      >
        ALL SCENES
      </div>

      {/* 网格主体 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${autoCols}, ${cellW}px)`,
          gridTemplateRows: `repeat(${autoRows}, ${cellH}px)`,
          gap: `${gapY}px ${gapX}px`,
        }}
      >
        {items.slice(0, autoCols * autoRows).map((item, i) => {
          const delay = Math.floor(i / autoCols) * 6 + (i % autoCols) * 2;
          const settleFrames = 20; // spring稳定所需帧数
          const allAppearFrame = delay + settleFrames;
          const itemFrame = Math.max(0, frame - delay);
          const scale = spring({
            fps: 30,
            frame: itemFrame,
            config: { damping: 180, stiffness: 90 },
          });
          const opacity = interpolate(itemFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

          // 入场结束后：缓慢抖动（每个格子相位不同，避免同步）
          const shakeFrame = Math.max(0, frame - allAppearFrame);
          const phaseOffset = i * 0.8; // 相位偏移，让每个格子抖得不一样
          const shakeX = Math.sin((shakeFrame * 0.06) + phaseOffset) * 3.5;
          const shakeY = Math.cos((shakeFrame * 0.08) + phaseOffset) * 2.5;
          const isWobbling = shakeFrame > 0 ? 1 : 0;
          const wobbleOpacity = isWobbling;

          const colorIdx = i % cellPalette.length;
          const borderIdx = i % borderPalette.length;

          // 文本过长则拆成两行
          const isLong = item.length > 6;
          const words = item.split(/(.{1,6})/g).filter(Boolean);

          return (
            <div
              key={i}
              style={{
                position: 'relative',
                width: cellW,
                height: cellH,
                background: cellPalette[colorIdx],
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${borderPalette[borderIdx]}`,
                transform: `translate(${shakeX}px, ${shakeY}px) scale(${scale})`,
                opacity,
                boxShadow: isWobbling
                  ? `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${borderPalette[borderIdx].replace('0.2', '0.4')}`
                  : `0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                padding: '8px 6px',
                gap: 4,
              }}
            >
              {isLong ? (
                // 长文本：两行显示
                words.slice(0, 2).map((word, wi) => (
                  <span
                    key={wi}
                    style={{
                      color: '#FFFFFF',
                      fontSize: fontSize,
                      fontWeight: 600,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      letterSpacing: 0.3,
                    }}
                  >
                    {word}
                  </span>
                ))
              ) : (
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: fontSize,
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    letterSpacing: 0.3,
                  }}
                >
                  {item}
                </span>
              )}

              {/* 左上角序号标签 */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 8,
                  fontSize: subFontSize * 0.7,
                  color: 'rgba(255,255,255,0.25)',
                  fontWeight: 400,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部总计标签 */}
      <div
        style={{
          marginTop: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 2,
            background: accentColor,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            padding: '10px 28px',
            background: 'rgba(255,107,53,0.1)',
            border: `1.5px solid ${accentColor}`,
            borderRadius: 50,
            color: accentColor,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          {items.length} SCENES
        </div>
        <div
          style={{
            width: 40,
            height: 2,
            background: accentColor,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
};

/**
 * 批量抽卡展示组件
 * 在指定帧区间内依次展示多张卡牌的翻转动画
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CardFlip } from './CardFlip';
import { drawMultipleCards, type Card } from '../../hooks/useCardDraw';

interface CardDrawGridProps {
  seed: number;
  cardCount?: number;
  startFrame?: number;   // 开始抽卡的帧
  cardInterval?: number; // 每张卡之间的间隔帧数
  centerX?: number;
  centerY?: number;
  cardSpacing?: number; // 卡牌之间的间距
}

export const CardDrawGrid: React.FC<CardDrawGridProps> = ({
  seed,
  cardCount = 3,
  startFrame = 30,
  cardInterval = 20,
  centerX = 960,
  centerY = 540,
  cardSpacing = 220,
}) => {
  const frame = useCurrentFrame();
  const cards: Card[] = drawMultipleCards(seed, cardCount);

  // 总展示时长（所有卡翻完后再延长一点）
  const totalDuration = startFrame + cardCount * cardInterval + 60;
  const isActive = frame >= startFrame && frame < startFrame + totalDuration;

  if (!isActive) return null;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at center, rgba(15,15,35,0.95), rgba(9,7,13,0.98))',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* 标题 */}
      {frame >= startFrame && frame < startFrame + 40 && (
        <div
          style={{
            position: 'absolute',
            top: 120,
            color: '#f59e0b',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: 4,
            opacity: interpolate(frame - startFrame, [0, 20], [0, 1]),
          }}
        >
          🎰 抽卡时刻
        </div>
      )}

      {/* 卡牌容器 */}
      <div
        style={{
          display: 'flex',
          gap: cardSpacing,
          alignItems: 'center',
        }}
      >
        {cards.map((card, idx) => (
          <CardFlip
            key={card.id + idx}
            card={card}
            delay={startFrame + idx * cardInterval}
            x={centerX - ((cardCount - 1) * cardSpacing) / 2 + idx * cardSpacing}
            y={centerY}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

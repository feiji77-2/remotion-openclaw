/**
 * 单张卡牌翻转展示组件
 * 配合 useCardDraw 的 drawCard / drawMultipleCards 使用
 */

import React from 'react';
import { interpolate, useCurrentFrame, spring } from 'remotion';
import type { Card } from '../../hooks/useCardDraw';
import { rarityColor } from '../../hooks/useCardDraw';

interface CardFlipProps {
  card: Card;
  delay?: number;      // 开始翻转的帧延迟
  duration?: number;   // 翻转动画持续帧数
  x?: number;          // 卡片中心 x 坐标（默认居中）
  y?: number;          // 卡片中心 y 坐标（默认居中）
}

export const CardFlip: React.FC<CardFlipProps> = ({
  card,
  delay = 0,
  duration = 30,
  x = 960,
  y = 540,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 缩放弹跳效果
  const scale = interpolate(progress, [0, 0.6, 0.8, 1], [0.5, 1.1, 0.95, 1]);
  // Y 轴翻转
  const rotateY = interpolate(progress, [0, 1], [90, 0]);
  // 轻微上浮
  const translateY = interpolate(progress, [0, 0.5, 1], [80, -10, 0]);

  const isRevealed = progress > 0;
  const cardColor = rarityColor[card.rarity] || '#9ca3af';

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 100,
        top: y - 140,
        width: 200,
        height: 280,
        transform: `scale(${scale}) rotateY(${rotateY}deg) translateY(${translateY}px)`,
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        borderRadius: 16,
        background: isRevealed
          ? `linear-gradient(135deg, ${cardColor}, ${cardColor}dd)`
          : 'linear-gradient(135deg, #374151, #1f2937)',
        boxShadow: isRevealed
          ? `0 8px 32px ${cardColor}66, 0 0 48px ${cardColor}33`
          : '0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: progress > 0 ? 1 : 0,
      }}
    >
      {/* 卡片 emoji */}
      <span style={{ fontSize: 64, opacity: isRevealed ? 1 : 0.3 }}>
        {card.emoji || '❓'}
      </span>

      {/* 卡片名称 */}
      <span
        style={{
          color: '#fff',
          fontSize: 22,
          fontWeight: 800,
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {isRevealed ? card.name : '???'}
      </span>

      {/* 稀有度标签 */}
      {isRevealed && (
        <span
          style={{
            color: cardColor,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.3)',
            padding: '2px 10px',
            borderRadius: 999,
          }}
        >
          {card.rarity}
        </span>
      )}

      {/* 卡背装饰（未翻时显示） */}
      {!isRevealed && (
        <div
          style={{
            position: 'absolute',
            inset: 12,
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 48, opacity: 0.2 }}>🦞</span>
        </div>
      )}
    </div>
  );
};

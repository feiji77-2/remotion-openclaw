/**
 * 确定性抽卡 Hook — 基于 Remotion random() 保证可复现性
 * 每次渲染相同 seed + drawIndex 都得到完全相同的结果
 */

import { random } from 'remotion';

export interface Card {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  color: string;
  emoji?: string;
}

export interface CardPool {
  cards: Card[];
  weights: number[];
}

// 默认卡池
const DEFAULT_POOL: CardPool = {
  cards: [
    { id: 'card-common-1', name: '普通卡', rarity: 'common', color: '#9ca3af', emoji: '⚪' },
    { id: 'card-common-2', name: '普通卡', rarity: 'common', color: '#9ca3af', emoji: '⚪' },
    { id: 'card-rare-1', name: '稀有卡', rarity: 'rare', color: '#3b82f6', emoji: '🔵' },
    { id: 'card-rare-2', name: '稀有卡', rarity: 'rare', color: '#3b82f6', emoji: '🔵' },
    { id: 'card-epic-1', name: '史诗卡', rarity: 'rare', color: '#8b5cf6', emoji: '🟣' },
    { id: 'card-legendary-1', name: '传说卡', rarity: 'legendary', color: '#f59e0b', emoji: '🟡' },
  ],
  weights: [30, 30, 20, 10, 8, 2], // 总和 = 100
};

/**
 * 从卡池抽取一张卡（确定性）
 * @param seed 全局种子
 * @param drawIndex 本次是第几次抽取
 * @param pool 卡池（默认使用 DEFAULT_POOL）
 */
export const drawCard = (
  seed: number,
  drawIndex: number,
  pool: CardPool = DEFAULT_POOL,
): Card => {
  const r = random(seed + drawIndex * 997); // 乘以质数避免模式重复
  const totalWeight = pool.weights.reduce((a, b) => a + b, 0);
  let threshold = r * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < pool.cards.length; i++) {
    cumulative += pool.weights[i];
    if (threshold < cumulative) {
      return pool.cards[i];
    }
  }
  return pool.cards[0];
};

/**
 * 批量抽卡（确定性）
 * @param seed 全局种子
 * @param count 抽取数量
 * @param pool 卡池
 */
export const drawMultipleCards = (
  seed: number,
  count: number,
  pool: CardPool = DEFAULT_POOL,
): Card[] => {
  return Array.from({ length: count }, (_, i) => drawCard(seed, i, pool));
};

/**
 * 模拟十连抽（保底机制：第10抽必出稀有）
 * @param seed 全局种子
 * @param pool 卡池
 */
export const drawTenPull = (
  seed: number,
  pool: CardPool = DEFAULT_POOL,
): Card[] => {
  const results: Card[] = [];
  for (let i = 0; i < 10; i++) {
    // 第10抽强制稀有以上
    if (i === 9) {
      const rarePool: CardPool = {
        cards: pool.cards.filter((c) => c.rarity !== 'common'),
        weights: pool.weights.filter((_, idx) => pool.cards[idx].rarity !== 'common'),
      };
      results.push(drawCard(seed, i * 997, rarePool));
    } else {
      results.push(drawCard(seed, i * 997, pool));
    }
  }
  return results;
};

/** 稀有度对应的抽中概率标签 */
export const rarityLabel: Record<Card['rarity'], string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
};

/** 稀有度颜色 */
export const rarityColor: Record<Card['rarity'], string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  legendary: '#f59e0b',
};

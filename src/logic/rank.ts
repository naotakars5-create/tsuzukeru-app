/**
 * ランク（称号）とポイントの計算。
 * ポイントは称号・進捗表示のみに使う（換金機能はない）。
 */

import { RankTier } from '@/types';

/** 達成1回あたりの獲得ポイント */
export const POINTS_PER_DONE = 10;

/** 連続達成ボーナス（7日連続ごとに加点） */
export const STREAK_BONUS_EVERY = 7;
export const STREAK_BONUS_POINTS = 20;

/** 炎系の成長ランク（③で選択） */
export const RANK_TIERS: RankTier[] = [
  { key: 'beginner', label: 'ビギナー', emoji: '🌱', minPoints: 0, color: '#84CC16' },
  { key: 'runner', label: 'ランナー', emoji: '🔥', minPoints: 60, color: '#F97316' },
  { key: 'master', label: 'マスター', emoji: '💪', minPoints: 180, color: '#EF4444' },
  { key: 'legend', label: 'レジェンド', emoji: '👑', minPoints: 360, color: '#EAB308' },
];

/** ポイントから現在ランクを求める */
export function rankForPoints(points: number): RankTier {
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (points >= tier.minPoints) current = tier;
  }
  return current;
}

/** 次のランク（最高ランクなら null） */
export function nextRankAfter(current: RankTier): RankTier | null {
  const idx = RANK_TIERS.findIndex((t) => t.key === current.key);
  return RANK_TIERS[idx + 1] ?? null;
}

/**
 * 達成回数と連続達成からポイントを計算。
 * points = 達成数 * 10 + (連続ボーナス)
 */
export function calcPoints(doneCount: number, bestStreak: number): number {
  const base = doneCount * POINTS_PER_DONE;
  const bonus = Math.floor(bestStreak / STREAK_BONUS_EVERY) * STREAK_BONUS_POINTS;
  return base + bonus;
}

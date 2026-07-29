/**
 * 実績バッジ（コレクション要素）。
 * 現在のスタッツから「解除条件を満たしているか」を判定する。
 * 集める楽しみで、1シーズンを超えた長期の継続動機をつくる。
 */

import { BadgeDef } from '@/types';

/** バッジ判定に使うスタッツ */
export interface BadgeContext {
  totalDone: number; // 通算達成（全シーズン）
  bestStreak: number; // 歴代最高連続
  currentStreak: number; // 現在の連続
  points: number; // 通算ポイント
  perfectWeeks: number; // これまでの完全達成した週の数
  seasonsCompleted: number; // 完走シーズン数
  perfectSeasons: number; // 完全達成で完走したシーズン数
  totalWaived: number; // 通算免除額（達成して課金ゼロで済んだ額）
}

interface BadgeDefWithTest extends BadgeDef {
  test: (c: BadgeContext) => boolean;
}

export const BADGES: BadgeDefWithTest[] = [
  {
    key: 'first_step',
    label: 'はじめの一歩',
    description: '初めて達成した',
    icon: 'footsteps',
    color: '#4ADE80',
    test: (c) => c.totalDone >= 1,
  },
  {
    key: 'streak_3',
    label: '三日坊主卒業',
    description: '3日連続で達成',
    icon: 'flame',
    color: '#FF9F43',
    test: (c) => c.bestStreak >= 3,
  },
  {
    key: 'streak_7',
    label: '一週間戦士',
    description: '7日連続で達成',
    icon: 'flame',
    color: '#FF9F43',
    test: (c) => c.bestStreak >= 7,
  },
  {
    key: 'streak_14',
    label: '二週間の壁',
    description: '14日連続で達成',
    icon: 'flame',
    color: '#FF6B6B',
    test: (c) => c.bestStreak >= 14,
  },
  {
    key: 'streak_30',
    label: '一ヶ月マスター',
    description: '30日連続で達成',
    icon: 'ribbon',
    color: '#FFC24B',
    test: (c) => c.bestStreak >= 30,
  },
  {
    key: 'perfect_week',
    label: 'パーフェクトウィーク',
    description: '1週間を完全達成',
    icon: 'checkmark-done-circle',
    color: '#C6F432',
    test: (c) => c.perfectWeeks >= 1,
  },
  {
    key: 'full_return',
    label: '課金ゼロ',
    description: '一度も課金されずシーズン完走',
    icon: 'wallet',
    color: '#A78BFA',
    test: (c) => c.perfectSeasons >= 1,
  },
  {
    key: 'returned_3000',
    label: '免除の達人',
    description: '通算 ¥3,000 以上を免除',
    icon: 'cash',
    color: '#4ADE80',
    test: (c) => c.totalWaived >= 3000,
  },
  {
    key: 'done_50',
    label: '塵も積もれば',
    description: '通算50回 達成',
    icon: 'layers',
    color: '#6AA6FF',
    test: (c) => c.totalDone >= 50,
  },
  {
    key: 'season_1',
    label: 'シーズン完走',
    description: '1シーズンを完走',
    icon: 'flag',
    color: '#4ADE80',
    test: (c) => c.seasonsCompleted >= 1,
  },
  {
    key: 'season_perfect',
    label: '皆勤シーズン',
    description: '未達ゼロでシーズン完走',
    icon: 'trophy',
    color: '#FFC24B',
    test: (c) => c.perfectSeasons >= 1,
  },
  {
    key: 'season_3',
    label: '継続の鬼',
    description: '3シーズンを完走',
    icon: 'medal',
    color: '#FFC24B',
    test: (c) => c.seasonsCompleted >= 3,
  },
  {
    key: 'points_1000',
    label: 'ポイントマスター',
    description: '通算1,000ポイント到達',
    icon: 'diamond',
    color: '#A78BFA',
    test: (c) => c.points >= 1000,
  },
];

/** 現在満たしているバッジのキー一覧 */
export function satisfiedBadgeKeys(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => b.test(ctx)).map((b) => b.key);
}

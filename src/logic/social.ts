/**
 * 仲間・チーム・ランキングのモックデータ生成。
 * サーバーは無いため、カテゴリごとに固定の「ライバル」を用意し、
 * 日付から決まる擬似乱数でポイントを日々少しずつ変化させる。
 * （同じ日に何度見ても同じ結果 = ダミーだが安定して見える）
 */

import { GoalCategory, LeaderboardEntry } from '@/types';
import { todayStr } from './date';

/** 文字列 -> 32bit ハッシュ（擬似乱数の種） */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** カテゴリごとのモックライバル（名前と実力ベース値） */
const RIVALS: Record<GoalCategory, { name: string; base: number }[]> = {
  exercise: [
    { name: 'カズ', base: 420 },
    { name: 'モモカ', base: 300 },
    { name: 'テツ', base: 205 },
    { name: 'リョウ', base: 150 },
    { name: 'アユミ', base: 95 },
    { name: 'ダイキ', base: 60 },
    { name: 'ミサキ', base: 30 },
  ],
  study: [
    { name: 'ユウタ', base: 390 },
    { name: 'サクラ', base: 280 },
    { name: 'ケンジ', base: 210 },
    { name: 'ナナ', base: 140 },
    { name: 'ハルト', base: 90 },
    { name: 'アオイ', base: 55 },
    { name: 'ソウタ', base: 25 },
  ],
  morning: [
    { name: 'アサヒ', base: 410 },
    { name: 'ヒカリ', base: 290 },
    { name: 'マコト', base: 200 },
    { name: 'スバル', base: 145 },
    { name: 'ノゾミ', base: 85 },
    { name: 'イブキ', base: 50 },
    { name: 'レン', base: 20 },
  ],
  health: [
    { name: 'ミドリ', base: 400 },
    { name: 'タクミ', base: 285 },
    { name: 'コハル', base: 215 },
    { name: 'シュン', base: 135 },
    { name: 'メイ', base: 100 },
    { name: 'カナタ', base: 45 },
    { name: 'ユズ', base: 15 },
  ],
  other: [
    { name: 'ツバサ', base: 395 },
    { name: 'リコ', base: 275 },
    { name: 'ガク', base: 195 },
    { name: 'ホノカ', base: 130 },
    { name: 'イツキ', base: 80 },
    { name: 'セナ', base: 40 },
    { name: 'ニコ', base: 10 },
  ],
};

/** モックライバルの今日時点のポイント（日ごとに少し変動） */
function rivalPoints(name: string, base: number): number {
  const wiggle = hash(name + todayStr()) % 30; // 0-29pt の日次変動
  return base + wiggle;
}

/** モックライバルの連続日数 */
function rivalStreak(name: string): number {
  return (hash('streak' + name + todayStr()) % 18) + 1;
}

/**
 * 同カテゴリのランキング（自分を含む・ポイント降順）。
 * ベース値が最小のライバル1人は「昨日連続が途切れた人」として演出する。
 */
export function buildLeaderboard(
  category: GoalCategory,
  myPoints: number,
  myStreak: number
): LeaderboardEntry[] {
  const list = RIVALS[category];
  const minBase = Math.min(...list.map((r) => r.base));
  const rivals: LeaderboardEntry[] = list.map((r) => {
    const broken = r.base === minBase;
    return {
      id: r.name,
      name: r.name,
      points: rivalPoints(r.name, r.base),
      streak: broken ? 0 : rivalStreak(r.name),
      isMe: false,
      broken,
    };
  });
  const me: LeaderboardEntry = {
    id: 'me',
    name: 'あなた',
    points: myPoints,
    streak: myStreak,
    isMe: true,
  };
  return [...rivals, me].sort((a, b) => b.points - a.points);
}

/** 先週からの順位変動（モック: 日付から決まる 0〜2） */
export function weeklyRankDelta(category: GoalCategory): number {
  return hash('delta' + category + todayStr()) % 3;
}


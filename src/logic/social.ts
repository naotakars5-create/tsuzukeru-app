/**
 * 仲間・ランキングのモックデータ生成。サーバーは無いためダミー。
 * - 月間ランキング（1ヶ月単位で競う）
 * - マッチングは自分のランク前後（±1〜2）を混ぜて近しい相手を集める
 * - 各行にランク称号を付与
 * - 相手プロフィールもモックで生成
 */

import { GoalCategory, LeaderboardEntry, RivalProfile } from '@/types';
import { todayStr } from './date';
import { RANK_TIERS } from './rank';
import { categoryOf } from './category';

/** 文字列 -> 32bit ハッシュ（擬似乱数の種） */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 共通の名前プール（コミュニティごとにずらして使う） */
const NAME_POOL = [
  'カズ', 'モモカ', 'テツ', 'リョウ', 'アユミ', 'ダイキ', 'ミサキ',
  'ユウタ', 'サクラ', 'ケンジ', 'ナナ', 'ハルト', 'アオイ', 'ソウタ',
  'アサヒ', 'ヒカリ', 'マコト', 'スバル', 'ノゾミ', 'イブキ', 'レン',
];

/** コミュニティごとに7人の固定ライバルを選ぶ（コミュニティごとに顔ぶれが変わる） */
function rivalNames(category: GoalCategory): string[] {
  const start = hash(category) % NAME_POOL.length;
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(NAME_POOL[(start + i) % NAME_POOL.length]);
  return out;
}

const MOTIVATIONS = [
  '今度こそ、合格する。',
  '未来の自分への投資。',
  '受かるまで、やめない。',
  '言い訳をやめた日から。',
  '積み重ねだけは裏切らない。',
  '毎日30分でも、必ず。',
  '燃え尽きるより、燃やし続ける。',
];

const AVATAR_COLORS = ['#FF9F43', '#6AA6FF', '#4ADE80', '#FF6B8A', '#A78BFA', '#FFC24B', '#4FD1C5'];
const AVATAR_ICONS = ['walk', 'barbell', 'book', 'sunny', 'heart', 'bicycle', 'flash'] as const;

/** ランク前後(±1〜2)を混ぜた相手のランクindexを決める */
function rivalRankOffsets(): number[] {
  // 同ランク多め、±1をそこそこ、±2を少し
  return [0, 0, 1, -1, 1, -2, 2];
}

/** 自分のランクindexを求める */
export function rankIndexOf(points: number): number {
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) if (points >= RANK_TIERS[i].minPoints) idx = i;
  return idx;
}

/** 相手1人ぶんのランクindex（自分のindex＋オフセットをクランプ） */
function rivalRankIndex(myIndex: number, i: number): number {
  const offs = rivalRankOffsets();
  const raw = myIndex + offs[i % offs.length];
  return Math.max(0, Math.min(RANK_TIERS.length - 1, raw));
}

/** ランクindexに応じた今月ポイントの目安 */
function monthPointsForRank(rankIndex: number, seed: number): number {
  const base = rankIndex * 90 + 40;
  const noise = seed % 70;
  return base + noise;
}

/**
 * 同カテゴリの月間ランキング（自分を含む・ポイント降順）。
 */
export function buildLeaderboard(
  category: GoalCategory,
  myRankIndex: number,
  myMonthPoints: number,
  myStreak: number,
  myMonthMinutes: number,
  myMotivation: string
): LeaderboardEntry[] {
  const names = rivalNames(category);
  const minMonthOfRank = monthPointsForRank(0, 0);
  const rivals: LeaderboardEntry[] = names.map((name, i) => {
    const ri = rivalRankIndex(myRankIndex, i);
    const mp = monthPointsForRank(ri, hash(name + todayStr()));
    const broken = mp === Math.min(mp, minMonthOfRank) && ri === 0 && i === names.length - 1;
    return {
      id: name,
      name,
      points: mp,
      streak: broken ? 0 : (hash('s' + name + todayStr()) % 18) + 1,
      studyMinutes: mp * 6 + (hash('m' + name) % 120),
      motivation: MOTIVATIONS[hash(name) % MOTIVATIONS.length],
      rank: RANK_TIERS[ri],
      isMe: false,
      broken,
    };
  });
  const me: LeaderboardEntry = {
    id: 'me',
    name: 'あなた',
    points: myMonthPoints,
    streak: myStreak,
    studyMinutes: myMonthMinutes,
    motivation: myMotivation || '合格まで、続ける。',
    rank: RANK_TIERS[myRankIndex],
    isMe: true,
  };
  return [...rivals, me].sort((a, b) => b.points - a.points);
}

/** そのコミュニティの挑戦者数（実人数＋ベース143人で「賑わい」を出す・モック） */
export function communityCount(category: GoalCategory, boardLength: number): number {
  return boardLength + 143 + (hash('cc' + category) % 60);
}

/** 先月からの順位変動（モック: 日付から決まる 0〜2） */
export function monthlyRankDelta(category: GoalCategory): number {
  return hash('delta' + category + todayStr()) % 3;
}

/** 相手プロフィール（モック） */
export function buildRivalProfile(category: GoalCategory, id: string): RivalProfile {
  const h = hash(id);
  const rankIndex = rankIndexOf(monthPointsForRank(2, h) + 100);
  const cat = categoryOf(category);
  const totalDone = 20 + (h % 90);
  const bestStreak = 3 + (h % 25);
  return {
    id,
    name: id,
    icon: AVATAR_ICONS[h % AVATAR_ICONS.length],
    color: AVATAR_COLORS[h % AVATAR_COLORS.length],
    motivation: MOTIVATIONS[h % MOTIVATIONS.length],
    goalName: `${cat.label}の勉強を続ける`,
    category,
    points: totalDone * 10,
    streak: (hash('s' + id + todayStr()) % 18) + 1,
    bestStreak,
    totalDone,
    totalMinutes: totalDone * 65 + (h % 400),
    rank: RANK_TIERS[Math.min(RANK_TIERS.length - 1, rankIndex)],
  };
}

/** アバターの背景色（名前から安定して決まる） */
export function avatarColor(name: string): string {
  return AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
}


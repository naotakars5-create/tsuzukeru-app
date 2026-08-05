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

/** 資格コミュニティから抽出されるライバルの人数（毎日ランダムに選ばれる） */
export const RIVAL_SAMPLE_SIZE = 30;

/** ランキングに表示する上位の人数（＋自分） */
export const LEADERBOARD_TOP_N = 10;

/**
 * その日抽出されるライバル名（コミュニティごと・日付ごとに顔ぶれが変わる）。
 * 同じ資格の全挑戦者から RIVAL_SAMPLE_SIZE 人がランダムに選ばれる想定のモック。
 */
function rivalNames(category: GoalCategory): string[] {
  const start = hash(category + todayStr()) % NAME_POOL.length;
  const step = 1 + (hash('step' + category + todayStr()) % 5);
  const out: string[] = [];
  for (let i = 0; i < RIVAL_SAMPLE_SIZE; i++) {
    const base = NAME_POOL[(start + i * step) % NAME_POOL.length];
    // プールより多く必要なので、周回ごとに連番を付けて重複を避ける
    const lap = Math.floor((i * step) / NAME_POOL.length);
    out.push(lap > 0 ? `${base}${lap + 1}` : base);
  }
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

/** 月間ランキングの表示用データ */
export interface Leaderboard {
  /** 表示する上位 LEADERBOARD_TOP_N 人（自分が上位なら自分の行もここに入る） */
  top: LeaderboardEntry[];
  /** 自分の行（順位は抽出母数での本当の順位） */
  me: LeaderboardEntry;
  /** 自分が上位 LEADERBOARD_TOP_N 人に入っているか */
  myInTop: boolean;
  /** 自分のすぐ上の人（1位なら null） */
  above: LeaderboardEntry | null;
  /** 抽出母数の人数（ライバル＋自分） */
  total: number;
}

/**
 * 同カテゴリの月間ランキング。
 *
 * その日ランダムに選ばれた RIVAL_SAMPLE_SIZE 人＋自分の「全員」でまず順位を確定させ、
 * そのうえで表示用に上位 LEADERBOARD_TOP_N 人を切り出す。
 * 順位は必ず抽出母数の中での本当の順位なので、
 * 自分が上位に入っていなければ 11 位ではなく本来の順位（例: 31 位）になる。
 */
export function buildLeaderboard(
  category: GoalCategory,
  myRankIndex: number,
  myMonthPoints: number,
  myStreak: number,
  myMonthMinutes: number,
  myMotivation: string
): Leaderboard {
  const names = rivalNames(category);
  const minMonthOfRank = monthPointsForRank(0, 0);
  const rivals: LeaderboardEntry[] = names.map((name, i) => {
    const ri = rivalRankIndex(myRankIndex, i);
    const mp = monthPointsForRank(ri, hash(name + todayStr()));
    const broken = mp === Math.min(mp, minMonthOfRank) && ri === 0 && i === names.length - 1;
    return {
      id: name,
      name,
      position: 0, // 全員を並べたあとで確定させる
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
    position: 0,
    points: myMonthPoints,
    streak: myStreak,
    studyMinutes: myMonthMinutes,
    motivation: myMotivation || '合格まで、続ける。',
    rank: RANK_TIERS[myRankIndex],
    isMe: true,
  };

  // 抽出母数の全員で順位を確定（同点なら自分が上）
  const all = [me, ...rivals].sort((a, b) => b.points - a.points);
  all.forEach((e, i) => {
    e.position = i + 1;
  });

  const top = all.slice(0, LEADERBOARD_TOP_N);
  const myIdx = all.findIndex((e) => e.isMe);
  return {
    top,
    me,
    myInTop: me.position <= LEADERBOARD_TOP_N,
    above: myIdx > 0 ? all[myIdx - 1] : null,
    total: all.length,
  };
}

/**
 * その資格コミュニティの挑戦者数（モック）。
 * 画面によって数字がぶれないよう、カテゴリだけから安定して決まる。
 */
export function communityCount(category: GoalCategory): number {
  return 154 + (hash('cc' + category) % 60);
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


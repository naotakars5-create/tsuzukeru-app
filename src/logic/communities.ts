/**
 * コミュニティのディレクトリ（モック）。
 * 資格ごとに自動生成されるランキングとは別に、
 * ユーザーが「探して参加する／自分で作る」ためのコミュニティ一覧。
 * サーバーが無いためダミー。将来API連携に差し替える。
 */

import { ChatMessage, CustomGroup, GoalCategory, RankTier } from '@/types';
import { CATEGORIES } from './category';
import { rankForPoints } from './rank';

/** 文字列 -> 32bit ハッシュ */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** ディレクトリの1件（＝参加できるコミュニティ） */
export interface CommunityInfo extends CustomGroup {
  category?: GoalCategory;
  members: number;
  tagline: string;
}

// 手作りの人気コミュニティ（テーマ性のあるもの）
const CURATED: Array<{ name: string; category?: GoalCategory; tagline: string }> = [
  { name: '朝活勉強部', tagline: '5〜7時に机に向かう人たち', category: undefined },
  { name: '社会人の独学クラブ', tagline: '仕事終わりの1時間を積み上げる', category: undefined },
  { name: '深夜の追い込み部', tagline: '夜型でも受かる、を証明する', category: undefined },
  { name: '主婦・主夫の勉強仲間', tagline: 'スキマ時間で資格を取る', category: undefined },
  { name: '一発合格を狙う会', tagline: '今年で決める人だけ', category: undefined },
  { name: '簿記マラソン', tagline: '仕訳を毎日コツコツ', category: 'boki' },
  { name: 'TOEIC 800↑クラブ', tagline: 'スコアを本気で上げる', category: 'toeic' },
  { name: '宅建 一発合格部', tagline: '過去問を回し続ける', category: 'takken' },
  { name: '公務員 面接まで', tagline: '筆記も面接も一緒に', category: 'komuin' },
  { name: '行政書士ガチ勢', tagline: '記述で差をつける', category: 'gyosei' },
  { name: '基本情報 合格ロード', tagline: '午後対策を毎日', category: 'kihonjoho' },
  { name: '看護学生の勉強垢', tagline: '実習と国試を両立', category: 'kangoshi' },
];

/** コミュニティ全ディレクトリ（モック・人数は名前から安定生成） */
export function communityDirectory(): CommunityInfo[] {
  return CURATED.map((c) => {
    const h = hash(c.name);
    return {
      code: generateCode(c.name),
      name: c.name,
      owner: false,
      category: c.category,
      members: 40 + (h % 460),
      tagline: c.tagline,
    };
  });
}

/** キーワードで検索（名前・説明・資格名が対象） */
export function searchCommunities(q: string): CommunityInfo[] {
  const s = q.trim().toLowerCase();
  const all = communityDirectory();
  if (!s) return all;
  return all.filter((c) => {
    const cat = c.category ? CATEGORIES.find((x) => x.key === c.category)?.label ?? '' : '';
    return (
      c.name.toLowerCase().includes(s) ||
      c.tagline.toLowerCase().includes(s) ||
      cat.toLowerCase().includes(s)
    );
  });
}

// ── コミュニティ内のメンバー & 掲示板（モック） ──────────────

const MEMBER_NAMES = [
  'カズ', 'モモカ', 'テツ', 'リョウ', 'アユミ', 'ダイキ', 'ミサキ', 'ユウタ',
  'サクラ', 'ケンジ', 'ナナ', 'ハルト', 'アオイ', 'ソウタ', 'アサヒ', 'ヒカリ',
  'マコト', 'スバル', 'ノゾミ', 'イブキ', 'レン', 'ユイ', 'ショウ', 'カエデ',
];

const MEMBER_MOTIVES = [
  '今度こそ合格する。',
  '受かるまでやめない。',
  '毎日コツコツ。',
  '朝活で差をつける。',
  '仕事終わりの1時間。',
  '積み重ねは裏切らない。',
];

const CHAT_SEEDS = [
  '今日は3時間やった。みんなも頑張ろう！',
  'ここのみんながいるから続けられてる。',
  '朝型に切り替えたら捗るようになった。',
  '過去問むずすぎ…でも諦めない。',
  '週末まとめてやる派、誰かいる？',
  'モチベ下がってたけど、このコミュ見て復活した。',
  '今週も皆勤いけそう。',
  'スキマ時間の使い方、共有しませんか？',
];

/** コミュニティ内メンバー（ランキング用） */
export interface CommunityMember {
  id: string;
  name: string;
  points: number;
  streak: number;
  studyMinutes: number;
  /** 今週の勉強時間（分） */
  weekMinutes: number;
  rank: RankTier;
  isMe: boolean;
}

/** 自分の情報 */
export interface MeInput {
  name: string;
  points: number;
  streak: number;
  studyMinutes: number;
  /** 今週の勉強時間（分） */
  weekMinutes: number;
}

/** コミュニティ内のメンバー一覧（自分を含む・ポイント降順・モック） */
export function buildCommunityMembers(code: string, me: MeInput): CommunityMember[] {
  const h = hash(code);
  const count = 8 + (h % 7); // 8〜14人
  const members: CommunityMember[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name = MEMBER_NAMES[(h + i * 5) % MEMBER_NAMES.length];
    if (used.has(name)) name = `${name}${(i % 9) + 1}`;
    used.add(name);
    const pts = 40 + (hash(code + name + i) % 460);
    members.push({
      id: `m${i}-${name}`,
      name,
      points: pts,
      streak: hash('s' + name + code) % 21,
      studyMinutes: pts * 6 + (hash('t' + name) % 240),
      weekMinutes: 60 + (hash('w' + name + code) % 900),
      rank: rankForPoints(pts),
      isMe: false,
    });
  }
  members.push({
    id: 'me',
    name: me.name || 'あなた',
    points: me.points,
    streak: me.streak,
    studyMinutes: me.studyMinutes,
    weekMinutes: me.weekMinutes,
    rank: rankForPoints(me.points),
    isMe: true,
  });
  return members.sort((a, b) => b.points - a.points);
}

/** 掲示板の初期メッセージ（他メンバーのモック投稿。now を基準に過去へ並べる） */
export function seedChat(code: string, now: number): ChatMessage[] {
  const h = hash(code);
  const n = 3 + (h % 4); // 3〜6件
  const out: ChatMessage[] = [];
  for (let i = 0; i < n; i++) {
    const name = MEMBER_NAMES[(h + i * 7) % MEMBER_NAMES.length];
    const text = CHAT_SEEDS[(h + i * 3) % CHAT_SEEDS.length];
    out.push({
      id: `seed-${code}-${i}`,
      author: name,
      text,
      at: now - (n - i) * (3 + (hash(code + i) % 20)) * 3600000,
      mine: false,
    });
  }
  return out;
}

/** モチベ文言（メンバー名から安定して選ぶ） */
export function memberMotive(name: string): string {
  return MEMBER_MOTIVES[hash(name) % MEMBER_MOTIVES.length];
}

// 投稿への“返信”の弾（モック演出用）
const REPLY_POOL = [
  'いいね、その調子！',
  'おつかれさま！私も今からやる。',
  'ナイス積み上げ🔥 負けてられない。',
  'わかる。一緒にがんばろう。',
  'その集中力、見習います…！',
  '今日もお互い一歩前進だね。',
  '刺激もらった。俺もやる。',
  'えらい！明日も続けよう。',
  'このコミュ、みんな熱くて好き。',
  '私も同じところやってる。がんばろ！',
];

/**
 * 投稿への返信を1件選ぶ（モック）。
 * seed（投稿内容や時刻）で返信者と文面を変える。返信者名を返す。
 */
export function pickReply(code: string, seed: string): { author: string; text: string } {
  const h = hash(code + seed);
  const author = MEMBER_NAMES[h % MEMBER_NAMES.length];
  const text = REPLY_POOL[(h >> 3) % REPLY_POOL.length];
  return { author, text };
}

/** 参加コードを生成（モック・6桁英数字） */
export function generateCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let h = hash(seed);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[h % chars.length];
    h = Math.floor(h / chars.length) + hash(out);
  }
  return out;
}

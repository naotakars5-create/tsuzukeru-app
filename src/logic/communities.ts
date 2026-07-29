/**
 * コミュニティのディレクトリ（モック）。
 * 資格ごとに自動生成されるランキングとは別に、
 * ユーザーが「探して参加する／自分で作る」ためのコミュニティ一覧。
 * サーバーが無いためダミー。将来API連携に差し替える。
 */

import { CustomGroup, GoalCategory } from '@/types';
import { CATEGORIES } from './category';

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

/**
 * 資格・試験ごとのコミュニティ定義（勉強特化）。
 * 種類が多いのでジャンル（genre）でグルーピングし、目標設定ではプルダウンで選ぶ。
 * 同じ資格を目指す人だけでランキング・チャレンジを行う。
 */

import { GoalCategory, IconName } from '@/types';

/** ジャンル（プルダウンの大分類） */
export interface GenreDef {
  key: string;
  label: string;
  icon: IconName;
  color: string;
}

export const GENRES: GenreDef[] = [
  { key: 'juken', label: '大学・高校受験', icon: 'school', color: '#FF9F43' },
  { key: 'language', label: '語学・英語', icon: 'language', color: '#38BDF8' },
  { key: 'law', label: '法律・士業', icon: 'document-text', color: '#C6F432' },
  { key: 'finance', label: '会計・金融', icon: 'cash', color: '#FFC24B' },
  { key: 'komuin', label: '公務員', icon: 'business', color: '#F472B6' },
  { key: 'it', label: 'IT・情報', icon: 'hardware-chip', color: '#A78BFA' },
  { key: 'medical', label: '医療・福祉', icon: 'medkit', color: '#FF6B8A' },
  { key: 'estate', label: '不動産・建築・技術', icon: 'home', color: '#4ADE80' },
  { key: 'business', label: 'ビジネス・その他', icon: 'briefcase', color: '#94A3B8' },
];

export interface CategoryDef {
  key: GoalCategory;
  /** 所属ジャンル */
  genre: string;
  /** コミュニティ名（＝資格名） */
  label: string;
  icon: IconName;
  color: string;
  /** 目標名の入力例 */
  placeholder: string;
}

export const CATEGORIES: CategoryDef[] = [
  // 大学・高校受験
  { key: 'univ', genre: 'juken', label: '大学受験', icon: 'school', color: '#FF9F43', placeholder: '例: 英単語を50個おぼえる' },
  { key: 'highschool', genre: 'juken', label: '高校受験', icon: 'book', color: '#6AA6FF', placeholder: '例: 数学の問題集を3ページ' },
  { key: 'daiken', genre: 'juken', label: '高卒認定（大検）', icon: 'ribbon', color: '#FBBF24', placeholder: '例: 現代文を1時間' },
  { key: 'kokoro', genre: 'juken', label: '中学受験', icon: 'balloon', color: '#F472B6', placeholder: '例: 計算ドリルを1ページ' },

  // 語学・英語
  { key: 'toeic', genre: 'language', label: 'TOEIC', icon: 'language', color: '#38BDF8', placeholder: '例: リスニング20分' },
  { key: 'toefl', genre: 'language', label: 'TOEFL', icon: 'language', color: '#0EA5E9', placeholder: '例: 単語を30個' },
  { key: 'eiken', genre: 'language', label: '英検', icon: 'chatbubbles', color: '#22D3EE', placeholder: '例: 過去問を1回分' },
  { key: 'ielts', genre: 'language', label: 'IELTS', icon: 'globe', color: '#2DD4BF', placeholder: '例: ライティング1題' },
  { key: 'hsk', genre: 'language', label: '中国語（HSK）', icon: 'chatbox-ellipses', color: '#F87171', placeholder: '例: 単語を20個' },
  { key: 'topik', genre: 'language', label: '韓国語（TOPIK）', icon: 'chatbox', color: '#60A5FA', placeholder: '例: 文法を1課' },

  // 法律・士業
  { key: 'gyosei', genre: 'law', label: '行政書士', icon: 'document-text', color: '#C6F432', placeholder: '例: 民法を1時間' },
  { key: 'shihoshoshi', genre: 'law', label: '司法書士', icon: 'document-lock', color: '#A3E635', placeholder: '例: 不動産登記法を30分' },
  { key: 'shihoshiken', genre: 'law', label: '司法試験・予備', icon: 'shield-checkmark', color: '#84CC16', placeholder: '例: 論文を1通' },
  { key: 'benrishi', genre: 'law', label: '弁理士', icon: 'bulb', color: '#EAB308', placeholder: '例: 特許法を1時間' },
  { key: 'sharoushi', genre: 'law', label: '社労士', icon: 'people', color: '#FF6B8A', placeholder: '例: 労働基準法を30分' },
  { key: 'shindanshi', genre: 'law', label: '中小企業診断士', icon: 'trending-up', color: '#A78BFA', placeholder: '例: 財務を1時間' },

  // 会計・金融
  { key: 'boki', genre: 'finance', label: '簿記', icon: 'calculator', color: '#4FD1C5', placeholder: '例: 仕訳を20問' },
  { key: 'fp', genre: 'finance', label: 'FP', icon: 'cash', color: '#FFC24B', placeholder: '例: テキストを10ページ' },
  { key: 'kaikeishi', genre: 'finance', label: '公認会計士', icon: 'stats-chart', color: '#FCD34D', placeholder: '例: 財務会計を1時間' },
  { key: 'zeirishi', genre: 'finance', label: '税理士', icon: 'receipt', color: '#FBBF24', placeholder: '例: 簿記論を1時間' },
  { key: 'gaimuin', genre: 'finance', label: '証券外務員', icon: 'trending-up', color: '#34D399', placeholder: '例: 過去問を20問' },
  { key: 'uscpa', genre: 'finance', label: 'USCPA', icon: 'globe', color: '#38BDF8', placeholder: '例: FARを1時間' },

  // 公務員
  { key: 'komuin', genre: 'komuin', label: '公務員（一般）', icon: 'business', color: '#F472B6', placeholder: '例: 判断推理を10問' },
  { key: 'kokka', genre: 'komuin', label: '国家公務員', icon: 'library', color: '#EC4899', placeholder: '例: 憲法を30分' },
  { key: 'chiho', genre: 'komuin', label: '地方公務員', icon: 'map', color: '#F9A8D4', placeholder: '例: 数的処理を10問' },
  { key: 'keisatsu', genre: 'komuin', label: '警察・消防', icon: 'shield', color: '#FB7185', placeholder: '例: 教養を1時間' },

  // IT・情報
  { key: 'kihonjoho', genre: 'it', label: '基本情報技術者', icon: 'hardware-chip', color: '#A78BFA', placeholder: '例: 過去問を20問' },
  { key: 'ohyojoho', genre: 'it', label: '応用情報技術者', icon: 'git-branch', color: '#8B5CF6', placeholder: '例: 午後問題を1問' },
  { key: 'itpass', genre: 'it', label: 'ITパスポート', icon: 'laptop', color: '#C4B5FD', placeholder: '例: 用語を20個' },
  { key: 'shienshi', genre: 'it', label: '情報安全確保支援士', icon: 'lock-closed', color: '#7C3AED', placeholder: '例: セキュリティを30分' },
  { key: 'aws', genre: 'it', label: 'AWS認定', icon: 'cloud', color: '#F59E0B', placeholder: '例: 模擬問題を10問' },
  { key: 'gken', genre: 'it', label: 'G検定・E資格', icon: 'sparkles', color: '#818CF8', placeholder: '例: 機械学習を30分' },

  // 医療・福祉
  { key: 'kangoshi', genre: 'medical', label: '看護師', icon: 'medkit', color: '#FF6B8A', placeholder: '例: 過去問を30問' },
  { key: 'tourokuhanbai', genre: 'medical', label: '登録販売者', icon: 'bandage', color: '#FDA4AF', placeholder: '例: 薬の成分を10個' },
  { key: 'kaigo', genre: 'medical', label: '介護福祉士', icon: 'accessibility', color: '#FB923C', placeholder: '例: テキストを10ページ' },
  { key: 'hoiku', genre: 'medical', label: '保育士', icon: 'happy', color: '#F472B6', placeholder: '例: 過去問を20問' },
  { key: 'eiyoshi', genre: 'medical', label: '管理栄養士', icon: 'nutrition', color: '#4ADE80', placeholder: '例: 人体を30分' },

  // 不動産・建築・技術
  { key: 'takken', genre: 'estate', label: '宅建', icon: 'home', color: '#4ADE80', placeholder: '例: 過去問を10問' },
  { key: 'kanri', genre: 'estate', label: 'マンション管理士', icon: 'business', color: '#34D399', placeholder: '例: 区分所有法を30分' },
  { key: 'kenchikushi', genre: 'estate', label: '建築士', icon: 'construct', color: '#22C55E', placeholder: '例: 構造を1時間' },
  { key: 'denki', genre: 'estate', label: '電気工事士', icon: 'flash', color: '#FACC15', placeholder: '例: 配線図を10問' },

  // ビジネス・その他
  { key: 'hisho', genre: 'business', label: '秘書検定', icon: 'briefcase', color: '#94A3B8', placeholder: '例: マナーを1章' },
  { key: 'mos', genre: 'business', label: 'MOS', icon: 'document', color: '#60A5FA', placeholder: '例: Excelを30分' },
  { key: 'hanbaishi', genre: 'business', label: '販売士', icon: 'pricetag', color: '#A3A3A3', placeholder: '例: テキストを10ページ' },
  { key: 'other', genre: 'business', label: 'その他の資格', icon: 'ribbon', color: '#94A3B8', placeholder: '例: 参考書を1章' },
];

export function categoryOf(key: GoalCategory | undefined): CategoryDef {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** ジャンル定義を取得 */
export function genreOf(key: string | undefined): GenreDef {
  return GENRES.find((g) => g.key === key) ?? GENRES[GENRES.length - 1];
}

/** 指定ジャンルに属する資格一覧 */
export function categoriesInGenre(genreKey: string): CategoryDef[] {
  return CATEGORIES.filter((c) => c.genre === genreKey);
}

/** キーワードで資格を検索（ラベル部分一致・ジャンル名も対象） */
export function searchCategories(q: string): CategoryDef[] {
  const s = q.trim().toLowerCase();
  if (!s) return CATEGORIES;
  return CATEGORIES.filter((c) => {
    const g = genreOf(c.genre);
    return c.label.toLowerCase().includes(s) || g.label.toLowerCase().includes(s);
  });
}

/** デフォルトのコミュニティ */
export const DEFAULT_CATEGORY: GoalCategory = 'univ';

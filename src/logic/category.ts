/**
 * 資格・試験ごとのコミュニティ定義（勉強特化）。
 * 同じ資格を目指す人だけでランキング・チャレンジを行う。
 */

import { GoalCategory, IconName } from '@/types';

export interface CategoryDef {
  key: GoalCategory;
  /** コミュニティ名（＝資格名） */
  label: string;
  icon: IconName;
  color: string;
  /** 目標名の入力例 */
  placeholder: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'univ', label: '大学受験', icon: 'school', color: '#FF9F43', placeholder: '例: 英単語を50個おぼえる' },
  { key: 'highschool', label: '高校受験', icon: 'book', color: '#6AA6FF', placeholder: '例: 数学の問題集を3ページ' },
  { key: 'gyosei', label: '行政書士', icon: 'document-text', color: '#C6F432', placeholder: '例: 民法を1時間' },
  { key: 'takken', label: '宅建', icon: 'home', color: '#4ADE80', placeholder: '例: 過去問を10問' },
  { key: 'boki', label: '簿記', icon: 'calculator', color: '#4FD1C5', placeholder: '例: 仕訳を20問' },
  { key: 'shindanshi', label: '中小企業診断士', icon: 'trending-up', color: '#A78BFA', placeholder: '例: 財務を1時間' },
  { key: 'sharoushi', label: '社労士', icon: 'people', color: '#FF6B8A', placeholder: '例: 労働基準法を30分' },
  { key: 'fp', label: 'FP', icon: 'cash', color: '#FFC24B', placeholder: '例: テキストを10ページ' },
  { key: 'toeic', label: 'TOEIC / 英語', icon: 'language', color: '#38BDF8', placeholder: '例: リスニング20分' },
  { key: 'komuin', label: '公務員試験', icon: 'business', color: '#F472B6', placeholder: '例: 判断推理を10問' },
  { key: 'other', label: 'その他の資格', icon: 'ribbon', color: '#94A3B8', placeholder: '例: 参考書を1章' },
];

export function categoryOf(key: GoalCategory | undefined): CategoryDef {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** デフォルトのコミュニティ */
export const DEFAULT_CATEGORY: GoalCategory = 'univ';

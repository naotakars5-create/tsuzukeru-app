/**
 * 目標カテゴリの定義。
 * 同じカテゴリの仲間とチーム・ランキングでつながる（MVPではモックデータ）。
 */

import { GoalCategory, IconName } from '@/types';

export interface CategoryDef {
  key: GoalCategory;
  label: string;
  icon: IconName;
  color: string;
  /** モックのチーム名 */
  teamName: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'exercise', label: '運動', icon: 'barbell', color: '#FF8A4C', teamName: '燃焼ブートキャンプ' },
  { key: 'study', label: '勉強', icon: 'book', color: '#6AA6FF', teamName: '深夜の図書室' },
  { key: 'morning', label: '朝活', icon: 'sunny', color: '#FFC24B', teamName: '朝活クラブ5AM' },
  { key: 'health', label: '健康', icon: 'heart', color: '#FF6B8A', teamName: 'ヘルシー同盟' },
  { key: 'other', label: 'その他', icon: 'sparkles', color: '#B48CFF', teamName: '継続ギルド' },
];

export function categoryOf(key: GoalCategory | undefined): CategoryDef {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

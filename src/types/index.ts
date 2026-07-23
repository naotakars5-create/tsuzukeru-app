/**
 * アプリ全体で使う型定義。
 * 将来サーバー保存や仲間機能を足すときも、まずここに型を足すのが起点になる。
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Ioniconsのアイコン名（ベクターアイコン） */
export type IconName = ComponentProps<typeof Ionicons>['name'];

/** 目標の頻度 */
export type Frequency = 'daily' | 'weekdays';

/** 目標のカテゴリ（仲間・ランキングのグループ分けに使う） */
export type GoalCategory = 'exercise' | 'study' | 'morning' | 'health' | 'other';

/** その日の達成状態 */
export type DayStatus = 'done' | 'missed' | 'pending';

/** 目標（1つだけ保持するMVP） */
export interface Goal {
  id: string;
  /** 目標名（例: 毎日10分ランニング） */
  name: string;
  /** カテゴリ（同じカテゴリの仲間と競う） */
  category: GoalCategory;
  /** 頻度: 毎日 or 特定曜日 */
  frequency: Frequency;
  /** frequency === 'weekdays' のとき対象曜日 (0=日, 1=月, ... 6=土) */
  weekdays: number[];
  /** 積立額（数値のみ。実決済はしない） */
  stakeAmount: number;
  /** 開始日 'YYYY-MM-DD' */
  startDate: string;
  /** 期間（週）: MVPは4週固定 */
  durationWeeks: number;
  /** 作成日時 ISO文字列 */
  createdAt: string;
}

/** 日付をキーにした達成記録 { '2026-07-21': 'done' } */
export type RecordMap = Record<string, DayStatus>;

/** リマインド通知の設定（端末内のローカル通知） */
export interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

/** 保存されるアプリの状態のスナップショット */
export interface PersistedState {
  goal: Goal | null;
  records: RecordMap;
  reminder: ReminderSettings;
}

/** ランク（称号）の定義 */
export interface RankTier {
  key: string;
  label: string;
  icon: IconName;
  /** このランクに到達するのに必要な最低ポイント */
  minPoints: number;
  color: string;
}

/** 進捗の集計結果（recordsから計算して求める派生値） */
export interface ProgressSummary {
  points: number;
  streak: number; // 現在の連続達成日数
  bestStreak: number; // 最高連続達成日数
  doneCount: number;
  missedCount: number;
  scheduledCount: number; // これまでに予定されていた日数（今日まで）
  rank: RankTier;
  nextRank: RankTier | null;
  pointsToNext: number; // 次ランクまでの残りポイント
}

/** 1週間分の集計 */
export interface WeekSummary {
  weekIndex: number; // 0..3
  label: string; // '第1週' など
  startDate: string;
  endDate: string;
  scheduled: number;
  done: number;
  missed: number;
  pending: number;
  /** この週で発生した課金（モック） */
  chargedAmount: number;
  isCurrent: boolean;
}

/** ランキングの1行（モックの仲間 or 自分） */
export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  streak: number;
  isMe: boolean;
  /** 連続が昨日途切れた（モック演出用） */
  broken?: boolean;
}

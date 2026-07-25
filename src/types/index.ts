/**
 * アプリ全体で使う型定義。
 * 将来サーバー保存や仲間機能を足すときも、まずここに型を足すのが起点になる。
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Ioniconsのアイコン名（ベクターアイコン） */
export type IconName = ComponentProps<typeof Ionicons>['name'];

/** 目標の頻度: 毎日 / 特定曜日 / 週N回（曜日は自由） */
export type Frequency = 'daily' | 'weekdays' | 'weekly_count';

/** 資格・試験コミュニティ（仲間・ランキングのグループ分けに使う） */
export type GoalCategory =
  | 'univ'
  | 'highschool'
  | 'gyosei'
  | 'takken'
  | 'boki'
  | 'shindanshi'
  | 'sharoushi'
  | 'fp'
  | 'toeic'
  | 'komuin'
  | 'other';

/** その日の達成状態 */
export type DayStatus = 'done' | 'missed' | 'pending';

/** 目標（1つだけ保持するMVP） */
export interface Goal {
  id: string;
  /** 目標名（例: 毎日10分ランニング） */
  name: string;
  /** カテゴリ（同じカテゴリの仲間と競う） */
  category: GoalCategory;
  /** 頻度: 毎日 / 特定曜日 / 週N回 */
  frequency: Frequency;
  /** frequency === 'weekdays' のとき対象曜日 (0=日, 1=月, ... 6=土) */
  weekdays: number[];
  /** frequency === 'weekly_count' のとき週あたりの目標回数 */
  weeklyTarget: number;
  /** 積立額（数値のみ。実決済はしない） */
  stakeAmount: number;
  /** このシーズン開始時に実際に課金した額（0=無料月・モック） */
  startCharge: number;
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

/** シーズンをまたいで積み上がる通算スタッツ */
export interface LifetimeStats {
  /** 完了したシーズンの通算達成回数（現シーズンは含まない） */
  totalDone: number;
  /** 歴代最高連続日数 */
  bestStreak: number;
  /** 完走したシーズン数 */
  seasonsCompleted: number;
  /** 完全達成（未達ゼロ）で完走したシーズン数 */
  perfectSeasons: number;
  /** 通算で没収された額（モック） */
  totalCharged: number;
  /** 通算で支払った額（モック） */
  totalPaid: number;
  /** 次のシーズンを無料にする権利（前月パーフェクトで付与） */
  nextSeasonFree: boolean;
}

/** 自分のプロフィール */
export interface Profile {
  /** 表示名 */
  name: string;
  /** アイコン（Ionicons名） */
  icon: IconName;
  /** アイコンの色 */
  color: string;
  /** 意気込み（ひとこと） */
  motivation: string;
}

/** バッジの解除状態: key -> 解除日 'YYYY-MM-DD' */
export type BadgeMap = Record<string, string>;

/** 任意で作る/参加するグループ（モック） */
export interface CustomGroup {
  /** 参加コード（共有用・モック） */
  code: string;
  /** グループ名 */
  name: string;
  /** 自分が作成者か */
  owner: boolean;
}

/** 保存されるアプリの状態のスナップショット */
export interface PersistedState {
  goal: Goal | null;
  records: RecordMap;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  badges: BadgeMap;
  profile: Profile;
  group: CustomGroup | null;
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
  points: number; // 通算ポイント（シーズンをまたいで積み上がる）
  streak: number; // 現在の連続達成日数
  bestStreak: number; // 歴代最高連続達成日数
  doneCount: number; // 現シーズンの達成日数
  missedCount: number; // 現シーズンの未達日数
  scheduledCount: number; // 現シーズンで今日までに予定されていた日数
  totalDone: number; // 通算達成日数（全シーズン）
  rank: RankTier;
  nextRank: RankTier | null;
  pointsToNext: number; // 次ランクまでの残りポイント
}

/** バッジ（実績）の定義 */
export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  color: string;
}

/** UI表示用のバッジ状態 */
export interface BadgeView extends BadgeDef {
  unlockedAt: string | null;
  isNew: boolean;
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
  /** この週で確定した課金（モック・未達があると週¥100没収） */
  chargedAmount: number;
  /** この週で返金された額（モック・週の予定を完全達成で¥100返金） */
  refundedAmount: number;
  isCurrent: boolean;
}

/** ランキングの1行（モックの仲間 or 自分） */
export interface LeaderboardEntry {
  id: string;
  name: string;
  /** 今月のポイント（月間ランキング用） */
  points: number;
  streak: number;
  /** ランク称号 */
  rank: RankTier;
  isMe: boolean;
  /** 連続が昨日途切れた（モック演出用） */
  broken?: boolean;
}

/** 相手プロフィール（モック） */
export interface RivalProfile {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  motivation: string;
  goalName: string;
  category: GoalCategory;
  points: number;
  streak: number;
  bestStreak: number;
  totalDone: number;
  rank: RankTier;
}

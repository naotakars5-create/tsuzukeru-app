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

/**
 * 資格・試験コミュニティのキー（仲間・ランキングのグループ分けに使う）。
 * 種類が多いので固定の直和ではなく文字列ID。定義は src/logic/category.ts。
 */
export type GoalCategory = string;

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
  /** 1日の目標勉強時間（分）。この時間に届いた日が「達成」 */
  dailyTargetMin: number;
  /** コミット額（達成すれば¥0、未達の週ぶんだけ課金・モック。お金は預からない） */
  deposit: number;
  /** 開始日 'YYYY-MM-DD' */
  startDate: string;
  /** 期間（週）: MVPは4週固定 */
  durationWeeks: number;
  /** 作成日時 ISO文字列 */
  createdAt: string;
}

/** 日付をキーにした達成記録 { '2026-07-21': 'done' } */
export type RecordMap = Record<string, DayStatus>;

/** 日付をキーにした勉強時間（分） { '2026-07-21': 125 } */
export type MinutesMap = Record<string, number>;

/** 日付をキーにした学習メモ { '2026-07-21': '英単語50個、過去問大問3' } */
export type NotesMap = Record<string, string>;

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
  /** 通算勉強時間（分・全シーズン） */
  totalMinutes: number;
  /** 通算で課金された額（未達の週ぶん・モック） */
  totalCharged: number;
  /** 通算で免除された額（達成した週ぶん・モック） */
  totalWaived: number;
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
  /** プロフィール写真（切り抜き済みのdata URI）。未設定ならアイコンを使う */
  photo?: string | null;
}

/** バッジの解除状態: key -> 解除日 'YYYY-MM-DD' */
export type BadgeMap = Record<string, string>;

/** 任意で作る/参加するコミュニティ（モック） */
export interface CustomGroup {
  /** 参加コード（共有用・モック） */
  code: string;
  /** コミュニティ名 */
  name: string;
  /** 自分が作成者か */
  owner: boolean;
  /** 関連する資格カテゴリ（任意） */
  category?: GoalCategory;
  /** 参加人数（モック表示用） */
  members?: number;
  /** ひとこと説明（任意） */
  tagline?: string;
}

/** コミュニティの掲示板メッセージ（モック・端末内保存） */
export interface ChatMessage {
  id: string;
  /** 投稿者の表示名 */
  author: string;
  text: string;
  /** 投稿時刻(ms) */
  at: number;
  /** 自分の投稿か */
  mine: boolean;
}

/** コミュニティコード -> 自分の投稿一覧 */
export type ChatMap = Record<string, ChatMessage[]>;

/** コミュニティコード -> 掲示板を最後に読んだ時刻(ms) */
export type ChatReadMap = Record<string, number>;

/** コミュニティ作成の月間カウント（プレミアム限定・月3個まで） */
export interface CommunityCreations {
  /** 対象の月 'YYYY-MM' */
  month: string;
  /** その月に作成した数 */
  count: number;
}

/** 保存されるアプリの状態のスナップショット */
export interface PersistedState {
  goal: Goal | null;
  /** 日ごとの勉強時間（分） */
  minutes: MinutesMap;
  /** 日ごとの学習メモ */
  notes: NotesMap;
  /** ストップウォッチ計測開始時刻(ms)。null=計測していない */
  timerStartedAt: number | null;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  badges: BadgeMap;
  profile: Profile;
  /** 参加中のコミュニティ（最大3つ） */
  groups: CustomGroup[];
  /** 有料会員（プレミアム）か（モック） */
  premium: boolean;
  /** コミュニティ作成の月間カウント */
  communityCreations: CommunityCreations;
  /** コミュニティ掲示板への自分の投稿 */
  chats: ChatMap;
  /** 掲示板の既読時刻（コードごと） */
  chatReads: ChatReadMap;
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
  studyMinutes: number; // 現シーズンの合計勉強時間（分）
  totalMinutes: number; // 通算の合計勉強時間（分）
  todayMinutes: number; // 今日の勉強時間（分）
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
  /** この週で確定した課金（モック・未達があると週ぶんを課金） */
  chargedAmount: number;
  /** この週で免除された額（モック・週の予定を完全達成で¥0） */
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
  /** 今月の合計勉強時間（分） */
  studyMinutes: number;
  /** 意気込み */
  motivation: string;
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
  /** 通算勉強時間（分） */
  totalMinutes: number;
  rank: RankTier;
}

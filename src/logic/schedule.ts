/**
 * 「予定日」の計算と、勉強時間からの達成/未達判定。
 * 達成判定はストップウォッチで記録した勉強時間ベース：
 * その日の勉強時間が「1日の目標時間」に届いたら達成。
 */

import { Goal, MinutesMap, DayStatus } from '@/types';
import { addDays, compareDate, todayStr, weekdayOf } from './date';

/** 週N回モードか */
export function isWeeklyCount(goal: Goal): boolean {
  return goal.frequency === 'weekly_count';
}

/**
 * 目標の全予定日（4週間ぶん）の 'YYYY-MM-DD' 配列。
 * 週N回モードでは「どの日でも達成できる」ので、全日を候補として返す。
 */
export function scheduledDates(goal: Goal): string[] {
  const total = goal.durationWeeks * 7;
  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(goal.startDate, i);
    if (isScheduledDay(goal, date)) out.push(date);
  }
  return out;
}

/** その日付が達成可能な日かどうか（頻度設定に基づく） */
export function isScheduledDay(goal: Goal, date: string): boolean {
  if (goal.frequency === 'daily') return true;
  if (goal.frequency === 'weekly_count') return true; // どの日でもOK
  return goal.weekdays.includes(weekdayOf(date));
}

/** 目標の最終日 'YYYY-MM-DD'（含む） */
export function goalEndDate(goal: Goal): string {
  return addDays(goal.startDate, goal.durationWeeks * 7 - 1);
}

/** その日の勉強時間（分） */
export function minutesOf(minutes: MinutesMap, date: string): number {
  return minutes[date] ?? 0;
}

/** その日が「達成」か（勉強時間が1日の目標に届いたか） */
export function isDayDone(goal: Goal, minutes: MinutesMap, date: string): boolean {
  return minutesOf(minutes, date) >= goal.dailyTargetMin;
}

/**
 * 指定日の状態（daily / weekdays 用）。
 * 達成=目標時間到達 / 未達=過去の予定日で未到達 / pending=今日以降。
 * 週N回モードでは日単位のmissedは使わず、週単位で判定する（summary側）。
 */
export function statusOf(goal: Goal, minutes: MinutesMap, date: string): DayStatus {
  if (isDayDone(goal, minutes, date)) return 'done';
  if (goal.frequency !== 'weekly_count' && compareDate(date, todayStr()) < 0) return 'missed';
  return 'pending';
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 頻度を人が読める文字列にする（例: 「毎日」「月・水・金」「週3回」） */
export function frequencyLabel(goal: Goal): string {
  if (goal.frequency === 'daily') return '毎日';
  if (goal.frequency === 'weekly_count') return `週${goal.weeklyTarget}回`;
  const days = [...goal.weekdays].sort((a, b) => a - b);
  if (days.length === 0) return '曜日未設定';
  return days.map((d) => WEEKDAY_LABELS[d]).join('・');
}

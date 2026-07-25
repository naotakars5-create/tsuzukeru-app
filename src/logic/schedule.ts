/**
 * 「予定日」の計算と、期限切れの自動「未達」判定。
 * MVPの達成判定（レベル1: ボタン方式）の中核。
 */

import { Goal, RecordMap, DayStatus } from '@/types';
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

/**
 * 期限切れの予定日を自動的に 'missed' にして返す（元のrecordsは変更しない）。
 * ルール:
 *  - 「今日」より前の予定日で done でないもの -> missed
 *  - 「今日」は押していなければ pending（まだ未達ではない）
 */
export function applyAutoMiss(goal: Goal | null, records: RecordMap): RecordMap {
  if (!goal) return records;
  // 週N回モードは「どの日でも自由」なので、個別の日を未達にしない
  // （週の合計が目標に届いたかは summary 側で週単位に判定する）
  if (goal.frequency === 'weekly_count') return records;
  const today = todayStr();
  const next: RecordMap = { ...records };
  for (const date of scheduledDates(goal)) {
    if (compareDate(date, today) < 0) {
      // 過去の予定日
      if (next[date] !== 'done') next[date] = 'missed';
    }
  }
  return next;
}

/** 指定日の状態を返す（未記録は pending 扱い） */
export function statusOf(records: RecordMap, date: string): DayStatus {
  return records[date] ?? 'pending';
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

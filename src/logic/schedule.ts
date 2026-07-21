/**
 * 「予定日」の計算と、期限切れの自動「未達」判定。
 * MVPの達成判定（レベル1: ボタン方式）の中核。
 */

import { Goal, RecordMap, DayStatus } from '@/types';
import { addDays, compareDate, todayStr, weekdayOf } from './date';

/** 目標の全予定日（4週間ぶん）の 'YYYY-MM-DD' 配列 */
export function scheduledDates(goal: Goal): string[] {
  const total = goal.durationWeeks * 7;
  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(goal.startDate, i);
    if (isScheduledDay(goal, date)) out.push(date);
  }
  return out;
}

/** その日付が予定日かどうか（頻度設定に基づく） */
export function isScheduledDay(goal: Goal, date: string): boolean {
  if (goal.frequency === 'daily') return true;
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

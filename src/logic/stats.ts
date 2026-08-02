/**
 * 勉強時間の推移と、曜日別のクセを分析する。
 * 「自分は水曜が弱い」など、行動を変えるヒントを数字から出す。
 */

import { Goal, MinutesMap } from '@/types';
import { addDays, compareDate, todayStr, weekdayOf } from './date';
import { minutesOf } from './schedule';

const WD_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export interface DayBar {
  date: string;
  minutes: number;
  /** 今日か */
  isToday: boolean;
}

export interface WeekdayStat {
  /** 0=日..6=土 */
  weekday: number;
  label: string;
  /** 平均勉強時間（分） */
  avgMinutes: number;
  /** 集計に使った日数 */
  days: number;
}

export interface StudyStats {
  /** 直近14日の日別バー（古い順） */
  recent: DayBar[];
  /** 直近14日の最大値（バーのスケール用・最低1） */
  recentMax: number;
  /** 曜日別の平均（日→土） */
  byWeekday: WeekdayStat[];
  /** いちばん強い曜日（記録がなければ null） */
  best: WeekdayStat | null;
  /** いちばん弱い曜日（記録がなければ null） */
  worst: WeekdayStat | null;
  /** 直近7日の合計（分） */
  last7: number;
  /** その前の7日の合計（分） */
  prev7: number;
  /** 直近7日 - 前の7日（分・増減） */
  delta7: number;
  /** 1日あたりの平均（記録のある日だけ・分） */
  avgPerActiveDay: number;
}

/**
 * 勉強時間の統計をまとめて計算する。
 * 集計範囲は目標の開始日以降（開始前は含めない）。
 */
export function buildStudyStats(goal: Goal | null, minutes: MinutesMap): StudyStats {
  const today = todayStr();

  // 直近14日のバー
  const recent: DayBar[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    recent.push({ date: d, minutes: minutesOf(minutes, d), isToday: d === today });
  }
  const recentMax = Math.max(1, ...recent.map((r) => r.minutes));

  // 曜日別（記録全体から。目標開始日以降に限定）
  const start = goal?.startDate;
  const sums = new Array(7).fill(0) as number[];
  const counts = new Array(7).fill(0) as number[];
  for (const [date, min] of Object.entries(minutes)) {
    if (start && compareDate(date, start) < 0) continue;
    if (compareDate(date, today) > 0) continue;
    const wd = weekdayOf(date);
    sums[wd] += min;
    counts[wd] += 1;
  }
  const byWeekday: WeekdayStat[] = sums.map((sum, wd) => ({
    weekday: wd,
    label: WD_LABELS[wd],
    avgMinutes: counts[wd] > 0 ? Math.round(sum / counts[wd]) : 0,
    days: counts[wd],
  }));

  const recorded = byWeekday.filter((w) => w.days > 0);
  const best = recorded.length
    ? recorded.reduce((a, b) => (b.avgMinutes > a.avgMinutes ? b : a))
    : null;
  const worst = recorded.length
    ? recorded.reduce((a, b) => (b.avgMinutes < a.avgMinutes ? b : a))
    : null;

  // 直近7日 vs その前の7日
  let last7 = 0;
  let prev7 = 0;
  for (let i = 0; i < 7; i++) last7 += minutesOf(minutes, addDays(today, -i));
  for (let i = 7; i < 14; i++) prev7 += minutesOf(minutes, addDays(today, -i));

  const activeDays = Object.entries(minutes).filter(
    ([d, m]) => m > 0 && (!start || compareDate(d, start) >= 0) && compareDate(d, today) <= 0
  );
  const activeTotal = activeDays.reduce((sum, [, m]) => sum + m, 0);
  const avgPerActiveDay = activeDays.length ? Math.round(activeTotal / activeDays.length) : 0;

  return {
    recent,
    recentMax,
    byWeekday,
    best,
    worst,
    last7,
    prev7,
    delta7: last7 - prev7,
    avgPerActiveDay,
  };
}

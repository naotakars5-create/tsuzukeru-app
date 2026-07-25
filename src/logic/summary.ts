/**
 * records（達成記録）から派生する集計値をまとめて計算する。
 * 画面はここが返す値を表示するだけにして、計算ロジックを一箇所に集約する。
 */

import { Goal, RecordMap, LifetimeStats, ProgressSummary, WeekSummary } from '@/types';
import { addDays, compareDate, todayStr } from './date';
import { scheduledDates, statusOf, goalEndDate, isWeeklyCount } from './schedule';
import { calcPoints, rankForPoints, nextRankAfter } from './rank';
import { WEEKLY_PENALTY } from './billing';

/** 通算スタッツの初期値 */
export const EMPTY_LIFETIME: LifetimeStats = {
  totalDone: 0,
  bestStreak: 0,
  seasonsCompleted: 0,
  perfectSeasons: 0,
  totalCharged: 0,
  totalPaid: 0,
  nextSeasonFree: false,
};

/**
 * 現在の連続達成日数と最高連続を計算。
 * 予定日を古い順に見て、'done' が続いた長さを数える。'missed' で連続は途切れる。
 * 週N回モードでは、過去の「達成しなかった日」でも連続を途切れさせない
 * （どの日でも自由なため）。今日の未達成(pending)は常に維持。
 */
function calcStreaks(goal: Goal, records: RecordMap): { streak: number; best: number } {
  const today = todayStr();
  const weekly = isWeeklyCount(goal);
  let run = 0;
  let best = 0;
  let currentRun = 0;

  for (const date of scheduledDates(goal)) {
    if (compareDate(date, today) > 0) break;
    const st = statusOf(records, date);
    if (st === 'done') {
      run += 1;
      currentRun = run;
      if (run > best) best = run;
    } else if (st === 'missed') {
      run = 0;
      currentRun = 0;
    } else {
      // pending。週N回モードでは維持、それ以外(過去のmissed扱い)は起きない
      currentRun = run;
      if (weekly) currentRun = run;
    }
  }
  return { streak: currentRun, best };
}

/**
 * 全体の進捗サマリー（ポイント・連続・ランクなど）。
 * ポイント・最高連続・通算達成は lifetime（過去シーズン）を足し込み、
 * シーズンをまたいでも積み上がり続けるようにする。
 */
export function buildProgress(
  goal: Goal | null,
  records: RecordMap,
  lifetime: LifetimeStats
): ProgressSummary {
  const emptyRank = rankForPoints(0);
  if (!goal) {
    const points = calcPoints(lifetime.totalDone, lifetime.bestStreak);
    const rank = rankForPoints(points);
    const nextRank = nextRankAfter(rank);
    return {
      points,
      streak: 0,
      bestStreak: lifetime.bestStreak,
      doneCount: 0,
      missedCount: 0,
      scheduledCount: 0,
      totalDone: lifetime.totalDone,
      rank,
      nextRank,
      pointsToNext: nextRank ? Math.max(0, nextRank.minPoints - points) : 0,
    };
  }

  const today = todayStr();
  const weekly = isWeeklyCount(goal);
  let doneCount = 0;
  let missedCount = 0;
  let scheduledCount = 0;

  if (weekly) {
    // 週N回: 週単位で集計（週の目標未達分をmissed扱い）
    const weeks = buildWeeks(goal, records);
    for (const w of weeks) {
      if (compareDate(w.startDate, today) > 0) continue;
      doneCount += w.done;
      missedCount += w.missed;
      scheduledCount += w.scheduled;
    }
  } else {
    for (const date of scheduledDates(goal)) {
      if (compareDate(date, today) > 0) continue;
      scheduledCount += 1;
      const st = statusOf(records, date);
      if (st === 'done') doneCount += 1;
      else if (st === 'missed') missedCount += 1;
    }
  }

  const { streak, best } = calcStreaks(goal, records);
  const totalDone = lifetime.totalDone + doneCount;
  const bestStreak = Math.max(lifetime.bestStreak, best);
  const points = calcPoints(totalDone, bestStreak);
  const rank = rankForPoints(points);
  const nextRank = nextRankAfter(rank);
  const pointsToNext = nextRank ? Math.max(0, nextRank.minPoints - points) : 0;

  return {
    points,
    streak,
    bestStreak,
    doneCount,
    missedCount,
    scheduledCount,
    totalDone,
    rank,
    nextRank,
    pointsToNext,
  };
}

/** 4週間を週ごとに集計（週次チェックポイント用） */
export function buildWeeks(goal: Goal | null, records: RecordMap): WeekSummary[] {
  if (!goal) return [];
  const today = todayStr();
  const weekly = isWeeklyCount(goal);
  const allDates: string[] = [];
  for (let i = 0; i < goal.durationWeeks * 7; i++) allDates.push(addDays(goal.startDate, i));
  const weeks: WeekSummary[] = [];

  for (let w = 0; w < goal.durationWeeks; w++) {
    const startDate = addDays(goal.startDate, w * 7);
    const endDate = addDays(goal.startDate, w * 7 + 6);
    const isCurrent = compareDate(today, startDate) >= 0 && compareDate(today, endDate) <= 0;
    const isPast = compareDate(endDate, today) < 0;

    let done = 0;
    let missed = 0;
    let pending = 0;
    let scheduled = 0;

    if (weekly) {
      // その週の達成日数を数える
      const target = goal.weeklyTarget;
      scheduled = target;
      const inWeek = allDates.filter(
        (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
      );
      for (const d of inWeek) if (records[d] === 'done') done += 1;
      done = Math.min(done, target);
      if (isPast) {
        missed = done < target ? 1 : 0; // 週として未達なら1
      } else if (isCurrent) {
        pending = Math.max(0, target - done);
      } else {
        pending = target; // 未来
      }
    } else {
      const inWeek = scheduledDates(goal).filter(
        (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
      );
      scheduled = inWeek.length;
      for (const d of inWeek) {
        const st = statusOf(records, d);
        if (st === 'done') done += 1;
        else if (st === 'missed') missed += 1;
        else pending += 1;
      }
    }

    // 週の課金（没収）: 未達がある(=痛みが発生した)週は ¥100 没収
    const failed = weekly ? missed > 0 : missed > 0;
    const chargedAmount = isPast && failed ? WEEKLY_PENALTY : 0;

    weeks.push({
      weekIndex: w,
      label: `第${w + 1}週`,
      startDate,
      endDate,
      scheduled,
      done,
      missed,
      pending,
      chargedAmount,
      refundedAmount: 0,
      isCurrent,
    });
  }
  return weeks;
}

/** シーズン（4週間）が終了しているか（最終日を過ぎたか） */
export function isSeasonComplete(goal: Goal | null): boolean {
  if (!goal) return false;
  return compareDate(todayStr(), goalEndDate(goal)) > 0;
}

/** 現シーズンの成績サマリー */
export interface SeasonResult {
  done: number;
  missed: number;
  scheduled: number;
  perfectWeeks: number;
  allPerfect: boolean;
  charged: number;
  /** この月の積立プールの残り（startCharge − 没収） */
  poolRemaining: number;
}

export function buildSeasonResult(goal: Goal | null, records: RecordMap): SeasonResult {
  const weeks = buildWeeks(goal, records);
  let done = 0;
  let missed = 0;
  let scheduled = 0;
  let perfectWeeks = 0;
  let charged = 0;
  for (const w of weeks) {
    done += w.done;
    missed += w.missed;
    scheduled += w.scheduled;
    charged += w.chargedAmount;
    if (w.scheduled > 0 && w.missed === 0 && w.pending === 0) perfectWeeks += 1;
  }
  const startCharge = goal?.startCharge ?? 0;
  return {
    done,
    missed,
    scheduled,
    perfectWeeks,
    allPerfect: scheduled > 0 && missed === 0,
    charged,
    poolRemaining: Math.max(0, startCharge - charged),
  };
}

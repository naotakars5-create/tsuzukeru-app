/**
 * 勉強記録（分）から派生する集計値をまとめて計算する。
 * 画面はここが返す値を表示するだけにして、計算ロジックを一箇所に集約する。
 */

import { Goal, MinutesMap, LifetimeStats, ProgressSummary, WeekSummary } from '@/types';
import { addDays, compareDate, todayStr } from './date';
import {
  scheduledDates,
  statusOf,
  goalEndDate,
  isWeeklyCount,
  isDayDone,
  minutesOf,
} from './schedule';
import { calcPoints, rankForPoints, nextRankAfter } from './rank';
import { weekStake } from './billing';

/** 通算スタッツの初期値 */
export const EMPTY_LIFETIME: LifetimeStats = {
  totalDone: 0,
  bestStreak: 0,
  seasonsCompleted: 0,
  perfectSeasons: 0,
  totalMinutes: 0,
  totalDeposited: 0,
  totalReturned: 0,
  totalForfeited: 0,
};

/**
 * 現在の連続達成日数と最高連続を計算。
 * 達成=その日の勉強時間が目標に届いた日。'missed' で連続は途切れる。
 */
function calcStreaks(goal: Goal, minutes: MinutesMap): { streak: number; best: number } {
  const today = todayStr();
  const weekly = isWeeklyCount(goal);
  let run = 0;
  let best = 0;
  let currentRun = 0;

  for (const date of scheduledDates(goal)) {
    if (compareDate(date, today) > 0) break;
    const st = statusOf(goal, minutes, date);
    if (st === 'done') {
      run += 1;
      currentRun = run;
      if (run > best) best = run;
    } else if (st === 'missed') {
      run = 0;
      currentRun = 0;
    } else {
      currentRun = run;
      if (weekly) currentRun = run;
    }
  }
  return { streak: currentRun, best };
}

/** 現シーズンの合計勉強時間（分・今日まで） */
function seasonMinutes(goal: Goal, minutes: MinutesMap): number {
  const today = todayStr();
  let total = 0;
  for (let i = 0; i < goal.durationWeeks * 7; i++) {
    const d = addDays(goal.startDate, i);
    if (compareDate(d, today) > 0) break;
    total += minutesOf(minutes, d);
  }
  return total;
}

/** 全体の進捗サマリー（ポイント・連続・勉強時間・ランクなど） */
export function buildProgress(
  goal: Goal | null,
  minutes: MinutesMap,
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
      studyMinutes: 0,
      totalMinutes: lifetime.totalMinutes,
      todayMinutes: 0,
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
    const weeks = buildWeeks(goal, minutes);
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
      const st = statusOf(goal, minutes, date);
      if (st === 'done') doneCount += 1;
      else if (st === 'missed') missedCount += 1;
    }
  }

  const { streak, best } = calcStreaks(goal, minutes);
  const totalDone = lifetime.totalDone + doneCount;
  const bestStreak = Math.max(lifetime.bestStreak, best);
  const points = calcPoints(totalDone, bestStreak);
  const rank = rankForPoints(points);
  const nextRank = nextRankAfter(rank);
  const pointsToNext = nextRank ? Math.max(0, nextRank.minPoints - points) : 0;
  const studyMinutes = seasonMinutes(goal, minutes);

  return {
    points,
    streak,
    bestStreak,
    doneCount,
    missedCount,
    scheduledCount,
    totalDone,
    studyMinutes,
    totalMinutes: lifetime.totalMinutes + studyMinutes,
    todayMinutes: minutesOf(minutes, today),
    rank,
    nextRank,
    pointsToNext,
  };
}

/** 4週間を週ごとに集計（週次チェックポイント用） */
export function buildWeeks(goal: Goal | null, minutes: MinutesMap): WeekSummary[] {
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
      const target = goal.weeklyTarget;
      scheduled = target;
      const inWeek = allDates.filter(
        (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
      );
      for (const d of inWeek) if (isDayDone(goal, minutes, d)) done += 1;
      done = Math.min(done, target);
      if (isPast) missed = done < target ? 1 : 0;
      else if (isCurrent) pending = Math.max(0, target - done);
      else pending = target;
    } else {
      const inWeek = scheduledDates(goal).filter(
        (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
      );
      scheduled = inWeek.length;
      for (const d of inWeek) {
        const st = statusOf(goal, minutes, d);
        if (st === 'done') done += 1;
        else if (st === 'missed') missed += 1;
        else pending += 1;
      }
    }

    // デポジット方式: 週ぶんの掛け金を、達成なら返還・未達なら没収
    const stake = weekStake(goal.deposit, goal.durationWeeks);
    const failed = missed > 0;
    const perfect = scheduled > 0 && missed === 0 && pending === 0;
    const chargedAmount = isPast && failed ? stake : 0; // 没収
    const refundedAmount = isPast && perfect ? stake : 0; // 返還

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
      refundedAmount,
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

/** 現シーズンの成績サマリー（デポジット） */
export interface SeasonResult {
  done: number;
  missed: number;
  scheduled: number;
  perfectWeeks: number;
  allPerfect: boolean;
  /** 没収された額（未達分） */
  forfeited: number;
  /** 返還された額（達成分） */
  returned: number;
  /** まだ結果が出ていない預かり中の額 */
  held: number;
  minutes: number;
}

export function buildSeasonResult(goal: Goal | null, minutes: MinutesMap): SeasonResult {
  const weeks = buildWeeks(goal, minutes);
  let done = 0;
  let missed = 0;
  let scheduled = 0;
  let perfectWeeks = 0;
  let forfeited = 0;
  let returned = 0;
  for (const w of weeks) {
    done += w.done;
    missed += w.missed;
    scheduled += w.scheduled;
    forfeited += w.chargedAmount;
    returned += w.refundedAmount;
    if (w.scheduled > 0 && w.missed === 0 && w.pending === 0) perfectWeeks += 1;
  }
  const deposit = goal?.deposit ?? 0;
  return {
    done,
    missed,
    scheduled,
    perfectWeeks,
    allPerfect: scheduled > 0 && missed === 0,
    forfeited,
    returned,
    held: Math.max(0, deposit - forfeited - returned),
    minutes: goal ? seasonMinutes(goal, minutes) : 0,
  };
}

/**
 * records（達成記録）から派生する集計値をまとめて計算する。
 * 画面はここが返す値を表示するだけにして、計算ロジックを一箇所に集約する。
 */

import { Goal, RecordMap, LifetimeStats, ProgressSummary, WeekSummary } from '@/types';
import { addDays, compareDate, todayStr } from './date';
import { scheduledDates, statusOf, goalEndDate } from './schedule';
import { calcPoints, rankForPoints, nextRankAfter } from './rank';
import { WEEKLY_STAKE } from './billing';

/** 通算スタッツの初期値 */
export const EMPTY_LIFETIME: LifetimeStats = {
  totalDone: 0,
  bestStreak: 0,
  seasonsCompleted: 0,
  perfectSeasons: 0,
  totalRefunded: 0,
  totalCharged: 0,
};

/**
 * 現在の連続達成日数と最高連続を計算。
 * 予定日を古い順に見て、'done' が続いた長さを数える。
 * 'missed' で連続は途切れる。今日の 'pending' は連続を途切れさせない。
 */
function calcStreaks(goal: Goal, records: RecordMap): { streak: number; best: number } {
  const today = todayStr();
  let run = 0;
  let best = 0;
  let currentRun = 0;

  for (const date of scheduledDates(goal)) {
    // 未来の予定日は評価しない
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
      // pending（＝今日まだ押していない）: 連続は維持するが加算しない
      currentRun = run;
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
  let doneCount = 0;
  let missedCount = 0;
  let scheduledCount = 0;
  for (const date of scheduledDates(goal)) {
    if (compareDate(date, today) > 0) continue; // 今日まで
    scheduledCount += 1;
    const st = statusOf(records, date);
    if (st === 'done') doneCount += 1;
    else if (st === 'missed') missedCount += 1;
  }

  const { streak, best } = calcStreaks(goal, records);
  // 通算値（過去シーズン + 現シーズン）
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

/** シーズン（4週間）が終了しているか（最終日を過ぎたか） */
export function isSeasonComplete(goal: Goal | null): boolean {
  if (!goal) return false;
  return compareDate(todayStr(), goalEndDate(goal)) > 0;
}

/** 現シーズンの成績サマリー（完了カードや次シーズンへの引き継ぎに使う） */
export interface SeasonResult {
  done: number;
  missed: number;
  scheduled: number;
  perfectWeeks: number;
  allPerfect: boolean;
  refunded: number;
  charged: number;
}

export function buildSeasonResult(goal: Goal | null, records: RecordMap): SeasonResult {
  const weeks = buildWeeks(goal, records);
  let done = 0;
  let missed = 0;
  let scheduled = 0;
  let perfectWeeks = 0;
  let refunded = 0;
  let charged = 0;
  for (const w of weeks) {
    done += w.done;
    missed += w.missed;
    scheduled += w.scheduled;
    refunded += w.refundedAmount;
    charged += w.chargedAmount;
    if (w.scheduled > 0 && w.missed === 0 && w.pending === 0) perfectWeeks += 1;
  }
  return {
    done,
    missed,
    scheduled,
    perfectWeeks,
    allPerfect: scheduled > 0 && missed === 0,
    refunded,
    charged,
  };
}

/** 4週間を週ごとに集計（週次チェックポイント用） */
export function buildWeeks(goal: Goal | null, records: RecordMap): WeekSummary[] {
  if (!goal) return [];
  const today = todayStr();
  const allScheduled = scheduledDates(goal);
  const weeks: WeekSummary[] = [];

  for (let w = 0; w < goal.durationWeeks; w++) {
    const startDate = addDays(goal.startDate, w * 7);
    const endDate = addDays(goal.startDate, w * 7 + 6);
    const inWeek = allScheduled.filter(
      (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
    );

    let done = 0;
    let missed = 0;
    let pending = 0;
    for (const d of inWeek) {
      const st = statusOf(records, d);
      if (st === 'done') done += 1;
      else if (st === 'missed') missed += 1;
      else pending += 1;
    }

    const isCurrent =
      compareDate(today, startDate) >= 0 && compareDate(today, endDate) <= 0;
    const isPast = compareDate(endDate, today) < 0;

    // 週¥100モデル: 未達が1日でもあれば課金確定、週が終わって未達ゼロなら返金
    const chargedAmount = missed > 0 ? WEEKLY_STAKE : 0;
    const refundedAmount = isPast && missed === 0 && inWeek.length > 0 ? WEEKLY_STAKE : 0;

    weeks.push({
      weekIndex: w,
      label: `第${w + 1}週`,
      startDate,
      endDate,
      scheduled: inWeek.length,
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

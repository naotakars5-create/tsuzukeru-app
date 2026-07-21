/**
 * 課金（モック）の計算。
 * 実際の決済・カード登録は一切行わない。金額は表示用のダミー。
 * 「未達1回 = 1日ぶんの積立が課金される」という非対称ルールをモックで表現する。
 */

import { Goal } from '@/types';
import { scheduledDates } from './schedule';

/** 予定日1日あたりの積立額（= 月額積立 / 予定日数） */
export function dailyStake(goal: Goal): number {
  const days = scheduledDates(goal).length || 1;
  return goal.stakeAmount / days;
}

/** 未達日数に対する課金額（モック） */
export function chargeForMisses(goal: Goal, missedCount: number): number {
  return Math.round(dailyStake(goal) * missedCount);
}

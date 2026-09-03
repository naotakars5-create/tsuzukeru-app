/**
 * ローカルの目標・毎日の記録を、課金判定用にサーバー（Supabase）へ同期する。
 * あくまで「サーバー側の判定材料」を送るだけで、アプリの表示はローカルデータのまま。
 * 失敗してもアプリの利用は止めない（ベストエフォート）。
 */
import { Goal, MinutesMap } from '@/types';
import { isWeeklyCount, scheduledDates } from '@/logic/schedule';
import { addDays, compareDate } from '@/logic/date';
import { supabase } from './supabase';

interface WeekPlan {
  weekIndex: number;
  startDate: string;
  endDate: string;
  scheduledDays: number;
}

/** buildWeeks と同じ基準で、週ごとの「予定日数」を計算する */
function computeWeekPlan(goal: Goal): WeekPlan[] {
  const weekly = isWeeklyCount(goal);
  const scheduled = weekly ? null : scheduledDates(goal);
  const weeks: WeekPlan[] = [];

  for (let w = 0; w < goal.durationWeeks; w++) {
    const startDate = addDays(goal.startDate, w * 7);
    const endDate = addDays(goal.startDate, w * 7 + 6);
    const scheduledDays = weekly
      ? goal.weeklyTarget
      : (scheduled ?? []).filter(
          (d) => compareDate(d, startDate) >= 0 && compareDate(d, endDate) <= 0
        ).length;
    weeks.push({ weekIndex: w, startDate, endDate, scheduledDays });
  }
  return weeks;
}

/** 目標をサーバーに登録し、週ごとの判定・課金データを作らせる（案C: ここでは課金しない） */
export async function syncGoalToServer(goal: Goal): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;

    await supabase.functions.invoke('create-goal', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: goal.name,
        category: goal.category,
        examDate: goal.examDate ?? null,
        targetTotalHours: goal.targetTotalHours ?? null,
        commitAmount: goal.deposit,
        dailyTargetMin: goal.dailyTargetMin,
        weeks: computeWeekPlan(goal),
      },
    });
  } catch (e) {
    console.warn('目標のサーバー同期に失敗しました（オフラインでも記録はローカルに残ります）', e);
  }
}

/** その日の勉強時間（合計・分）をサーバーに同期する */
export async function syncDailyMinutes(date: string, minutesForDate: number): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase
      .from('daily_logs')
      .upsert({ user_id: userData.user.id, date, minutes: Math.round(minutesForDate) });
  } catch (e) {
    console.warn('学習時間のサーバー同期に失敗しました', e);
  }
}

/** minutes全体を一括で同期する（バックアップ復元・初回ログイン後の追いつき用） */
export async function syncAllMinutes(minutes: MinutesMap): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const rows = Object.entries(minutes).map(([date, min]) => ({
      user_id: userData.user!.id,
      date,
      minutes: Math.round(min),
    }));
    if (rows.length === 0) return;
    await supabase.from('daily_logs').upsert(rows);
  } catch (e) {
    console.warn('学習記録の一括同期に失敗しました', e);
  }
}

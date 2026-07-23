/**
 * アプリ全体の状態（目標・達成記録・リマインド設定）を保持する Context。
 * - 起動時に AsyncStorage から読み込み、期限切れを自動 missed に補正
 * - 目標保存 / 今日の達成 / リマインド設定 / リセット などの操作を提供
 * 画面はこの Context を通じてデータにアクセスする。
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Goal, RecordMap, ReminderSettings } from '@/types';
import { loadState, saveGoal, saveRecords, saveReminder, clearAll } from '@/storage';
import { applyAutoMiss, isScheduledDay } from '@/logic/schedule';
import { todayStr } from '@/logic/date';
import { buildProgress, buildWeeks } from '@/logic/summary';
import { scheduleDailyReminder, cancelReminders } from '@/logic/reminder';

interface AppContextValue {
  ready: boolean;
  goal: Goal | null;
  records: RecordMap;
  reminder: ReminderSettings;
  /** 派生値 */
  progress: ReturnType<typeof buildProgress>;
  weeks: ReturnType<typeof buildWeeks>;
  /** 今日が予定日か */
  isTodayScheduled: boolean;
  /** 今日の状態 */
  todayStatus: 'done' | 'missed' | 'pending';
  /** 操作 */
  createGoal: (input: NewGoalInput) => Promise<void>;
  markTodayDone: () => Promise<void>;
  /** リマインド設定を更新。通知権限が無く有効化できなかったら false */
  updateReminder: (settings: ReminderSettings) => Promise<boolean>;
  resetAll: () => Promise<void>;
}

export interface NewGoalInput {
  name: string;
  category: Goal['category'];
  frequency: Goal['frequency'];
  weekdays: number[];
  stakeAmount: number;
  durationWeeks: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [records, setRecords] = useState<RecordMap>({});
  const [reminder, setReminder] = useState<ReminderSettings>({
    enabled: false,
    hour: 20,
    minute: 0,
  });

  // 起動時に読み込み＆自動未達補正
  useEffect(() => {
    (async () => {
      const state = await loadState();
      const corrected = applyAutoMiss(state.goal, state.records);
      setGoal(state.goal);
      setRecords(corrected);
      setReminder(state.reminder);
      // 補正結果を保存（前回起動以降に過ぎた日を確定させる）
      if (state.goal) await saveRecords(corrected);
      setReady(true);
    })();
  }, []);

  const createGoal = useCallback(
    async (input: NewGoalInput) => {
      const newGoal: Goal = {
        id: `${Date.now()}`,
        name: input.name.trim(),
        category: input.category,
        frequency: input.frequency,
        weekdays: input.weekdays,
        stakeAmount: input.stakeAmount,
        startDate: todayStr(),
        durationWeeks: input.durationWeeks,
        createdAt: new Date().toISOString(),
      };
      // 新しい目標を作ると記録はリセット
      setGoal(newGoal);
      setRecords({});
      await Promise.all([saveGoal(newGoal), saveRecords({})]);
      // リマインドが有効なら、新しい目標名で通知を組み直す
      if (reminder.enabled) {
        await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
      }
    },
    [reminder]
  );

  const markTodayDone = useCallback(async () => {
    if (!goal) return;
    const today = todayStr();
    if (!isScheduledDay(goal, today)) return; // 予定日でなければ何もしない
    setRecords((prev) => {
      if (prev[today] === 'done') return prev;
      const next = { ...prev, [today]: 'done' as const };
      saveRecords(next);
      return next;
    });
  }, [goal]);

  const updateReminder = useCallback(
    async (settings: ReminderSettings): Promise<boolean> => {
      if (settings.enabled) {
        const ok = await scheduleDailyReminder(
          settings.hour,
          settings.minute,
          goal?.name ?? '今日の習慣'
        );
        if (!ok) {
          // 権限が無い等で設定できなかった → オフのまま保存
          const off = { ...settings, enabled: false };
          setReminder(off);
          await saveReminder(off);
          return false;
        }
      } else {
        await cancelReminders();
      }
      setReminder(settings);
      await saveReminder(settings);
      return true;
    },
    [goal]
  );

  const resetAll = useCallback(async () => {
    setGoal(null);
    setRecords({});
    setReminder({ enabled: false, hour: 20, minute: 0 });
    await cancelReminders();
    await clearAll();
  }, []);

  const progress = useMemo(() => buildProgress(goal, records), [goal, records]);
  const weeks = useMemo(() => buildWeeks(goal, records), [goal, records]);

  const isTodayScheduled = useMemo(
    () => (goal ? isScheduledDay(goal, todayStr()) : false),
    [goal]
  );
  const todayStatus = useMemo<'done' | 'missed' | 'pending'>(() => {
    const st = records[todayStr()];
    return st === 'done' ? 'done' : st === 'missed' ? 'missed' : 'pending';
  }, [records]);

  const value: AppContextValue = {
    ready,
    goal,
    records,
    reminder,
    progress,
    weeks,
    isTodayScheduled,
    todayStatus,
    createGoal,
    markTodayDone,
    updateReminder,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

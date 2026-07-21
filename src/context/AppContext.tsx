/**
 * アプリ全体の状態（目標・達成記録）を保持する Context。
 * - 起動時に AsyncStorage から読み込み、期限切れを自動 missed に補正
 * - 目標保存 / 今日の達成 / リセット などの操作を提供
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
import { Goal, RecordMap } from '@/types';
import { loadState, saveGoal, saveRecords, clearAll } from '@/storage';
import { applyAutoMiss, isScheduledDay } from '@/logic/schedule';
import { todayStr } from '@/logic/date';
import { buildProgress, buildWeeks } from '@/logic/summary';

interface AppContextValue {
  ready: boolean;
  goal: Goal | null;
  records: RecordMap;
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
  resetAll: () => Promise<void>;
}

export interface NewGoalInput {
  name: string;
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

  // 起動時に読み込み＆自動未達補正
  useEffect(() => {
    (async () => {
      const state = await loadState();
      const corrected = applyAutoMiss(state.goal, state.records);
      setGoal(state.goal);
      setRecords(corrected);
      // 補正結果を保存（前回起動以降に過ぎた日を確定させる）
      if (state.goal) await saveRecords(corrected);
      setReady(true);
    })();
  }, []);

  const createGoal = useCallback(async (input: NewGoalInput) => {
    const newGoal: Goal = {
      id: `${Date.now()}`,
      name: input.name.trim(),
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
  }, []);

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

  const resetAll = useCallback(async () => {
    setGoal(null);
    setRecords({});
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
    progress,
    weeks,
    isTodayScheduled,
    todayStatus,
    createGoal,
    markTodayDone,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

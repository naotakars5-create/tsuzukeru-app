/**
 * アプリ全体の状態（目標・達成記録・リマインド・通算スタッツ・バッジ）を保持する Context。
 * - 起動時に AsyncStorage から読み込み、期限切れを自動 missed に補正
 * - シーズン制: 4週間が終わると「シーズン完了」。次シーズンへ通算成績を引き継ぐ
 * - 実績バッジ: 条件を満たすと自動解除して保存
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
import { Goal, RecordMap, ReminderSettings, LifetimeStats, BadgeMap, BadgeView } from '@/types';
import {
  loadState,
  saveGoal,
  saveRecords,
  saveReminder,
  saveLifetime,
  saveBadges,
  clearAll,
} from '@/storage';
import { applyAutoMiss, isScheduledDay } from '@/logic/schedule';
import { todayStr } from '@/logic/date';
import {
  buildProgress,
  buildWeeks,
  buildSeasonResult,
  isSeasonComplete,
  EMPTY_LIFETIME,
} from '@/logic/summary';
import { scheduleDailyReminder, cancelReminders } from '@/logic/reminder';
import { BADGES, satisfiedBadgeKeys } from '@/logic/badges';

interface AppContextValue {
  ready: boolean;
  goal: Goal | null;
  records: RecordMap;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  /** 派生値 */
  progress: ReturnType<typeof buildProgress>;
  weeks: ReturnType<typeof buildWeeks>;
  seasonResult: ReturnType<typeof buildSeasonResult>;
  /** 現在のシーズン番号（1始まり） */
  seasonNumber: number;
  /** シーズン（4週間）が終了しているか */
  seasonComplete: boolean;
  /** 今日が予定日か */
  isTodayScheduled: boolean;
  /** 今日の状態 */
  todayStatus: 'done' | 'missed' | 'pending';
  /** バッジ（実績）一覧 */
  badges: BadgeView[];
  unlockedBadgeCount: number;
  /** 操作 */
  createGoal: (input: NewGoalInput) => Promise<void>;
  markTodayDone: () => Promise<void>;
  startNextSeason: () => Promise<void>;
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
  const [lifetime, setLifetime] = useState<LifetimeStats>(EMPTY_LIFETIME);
  const [badgesMap, setBadgesMap] = useState<BadgeMap>({});

  // 起動時に読み込み＆自動未達補正
  useEffect(() => {
    (async () => {
      const state = await loadState();
      const corrected = applyAutoMiss(state.goal, state.records);
      setGoal(state.goal);
      setRecords(corrected);
      setReminder(state.reminder);
      setLifetime(state.lifetime);
      setBadgesMap(state.badges);
      if (state.goal) await saveRecords(corrected);
      setReady(true);
    })();
  }, []);

  const progress = useMemo(
    () => buildProgress(goal, records, lifetime),
    [goal, records, lifetime]
  );
  const weeks = useMemo(() => buildWeeks(goal, records), [goal, records]);
  const seasonResult = useMemo(() => buildSeasonResult(goal, records), [goal, records]);
  const seasonComplete = useMemo(() => isSeasonComplete(goal), [goal]);

  // バッジの自動解除（条件を満たしたら保存し、以後ロックされたまま）
  useEffect(() => {
    if (!ready) return;
    const satisfied = satisfiedBadgeKeys({
      totalDone: progress.totalDone,
      bestStreak: progress.bestStreak,
      currentStreak: progress.streak,
      points: progress.points,
      perfectWeeks: seasonResult.perfectWeeks,
      seasonsCompleted: lifetime.seasonsCompleted,
      perfectSeasons: lifetime.perfectSeasons,
      totalRefunded: lifetime.totalRefunded + seasonResult.refunded,
    });
    const additions = satisfied.filter((k) => !(k in badgesMap));
    if (additions.length === 0) return;
    const today = todayStr();
    const next = { ...badgesMap };
    for (const k of additions) next[k] = today;
    setBadgesMap(next);
    saveBadges(next);
  }, [ready, progress, seasonResult, lifetime, badgesMap]);

  /** 既存の完了シーズンを通算に畳み込む（次シーズン/目標変更の共通処理） */
  const foldSeasonIntoLifetime = useCallback((): LifetimeStats => {
    const r = buildSeasonResult(goal, records);
    return {
      totalDone: lifetime.totalDone + r.done,
      bestStreak: Math.max(lifetime.bestStreak, progress.bestStreak),
      seasonsCompleted: lifetime.seasonsCompleted + 1,
      perfectSeasons: lifetime.perfectSeasons + (r.allPerfect ? 1 : 0),
      totalRefunded: lifetime.totalRefunded + r.refunded,
      totalCharged: lifetime.totalCharged + r.charged,
    };
  }, [goal, records, lifetime, progress.bestStreak]);

  const makeGoal = useCallback((input: NewGoalInput): Goal => {
    return {
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
  }, []);

  const createGoal = useCallback(
    async (input: NewGoalInput) => {
      // 完了済みシーズンから目標を変える場合は、成績を通算に畳み込んで引き継ぐ
      let nextLifetime = lifetime;
      if (goal && isSeasonComplete(goal)) {
        nextLifetime = foldSeasonIntoLifetime();
        setLifetime(nextLifetime);
        await saveLifetime(nextLifetime);
      }
      const newGoal = makeGoal(input);
      setGoal(newGoal);
      setRecords({});
      await Promise.all([saveGoal(newGoal), saveRecords({})]);
      if (reminder.enabled) {
        await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
      }
    },
    [goal, lifetime, foldSeasonIntoLifetime, makeGoal, reminder]
  );

  /** 同じ目標設定で次の4週間シーズンを開始（通算成績は引き継ぐ） */
  const startNextSeason = useCallback(async () => {
    if (!goal) return;
    const nextLifetime = foldSeasonIntoLifetime();
    const newGoal: Goal = {
      ...goal,
      id: `${Date.now()}`,
      startDate: todayStr(),
      createdAt: new Date().toISOString(),
    };
    setLifetime(nextLifetime);
    setGoal(newGoal);
    setRecords({});
    await Promise.all([saveLifetime(nextLifetime), saveGoal(newGoal), saveRecords({})]);
    if (reminder.enabled) {
      await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
    }
  }, [goal, foldSeasonIntoLifetime, reminder]);

  const markTodayDone = useCallback(async () => {
    if (!goal) return;
    const today = todayStr();
    if (!isScheduledDay(goal, today)) return;
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
    setLifetime(EMPTY_LIFETIME);
    setBadgesMap({});
    await cancelReminders();
    await clearAll();
  }, []);

  const isTodayScheduled = useMemo(
    () => (goal ? isScheduledDay(goal, todayStr()) : false),
    [goal]
  );
  const todayStatus = useMemo<'done' | 'missed' | 'pending'>(() => {
    const st = records[todayStr()];
    return st === 'done' ? 'done' : st === 'missed' ? 'missed' : 'pending';
  }, [records]);

  const badges = useMemo<BadgeView[]>(() => {
    const today = todayStr();
    return BADGES.map((b) => ({
      key: b.key,
      label: b.label,
      description: b.description,
      icon: b.icon,
      color: b.color,
      unlockedAt: badgesMap[b.key] ?? null,
      isNew: badgesMap[b.key] === today,
    }));
  }, [badgesMap]);

  const unlockedBadgeCount = useMemo(
    () => badges.filter((b) => b.unlockedAt).length,
    [badges]
  );

  const value: AppContextValue = {
    ready,
    goal,
    records,
    reminder,
    lifetime,
    progress,
    weeks,
    seasonResult,
    seasonNumber: lifetime.seasonsCompleted + 1,
    seasonComplete,
    isTodayScheduled,
    todayStatus,
    badges,
    unlockedBadgeCount,
    createGoal,
    markTodayDone,
    startNextSeason,
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

/**
 * アプリ全体の状態を保持する Context。
 * 目標・勉強時間(分)・リマインド・通算スタッツ・バッジ・プロフィール・グループを管理する。
 * 達成判定はストップウォッチで記録した勉強時間ベース（1日の目標時間に届けば達成）。
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Goal,
  MinutesMap,
  ReminderSettings,
  LifetimeStats,
  BadgeMap,
  BadgeView,
  Profile,
  CustomGroup,
} from '@/types';
import {
  loadState,
  saveGoal,
  saveMinutes,
  saveReminder,
  saveLifetime,
  saveBadges,
  saveProfile,
  saveGroup,
  clearAll,
  DEFAULT_PROFILE,
} from '@/storage';
import { isScheduledDay, statusOf } from '@/logic/schedule';
import { todayStr } from '@/logic/date';
import {
  buildProgress,
  buildWeeks,
  buildSeasonResult,
  isSeasonComplete,
  EMPTY_LIFETIME,
} from '@/logic/summary';
import { MONTHLY_STAKE } from '@/logic/billing';
import { scheduleDailyReminder, cancelReminders } from '@/logic/reminder';
import { BADGES, satisfiedBadgeKeys } from '@/logic/badges';

interface AppContextValue {
  ready: boolean;
  goal: Goal | null;
  minutes: MinutesMap;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  profile: Profile;
  group: CustomGroup | null;
  progress: ReturnType<typeof buildProgress>;
  weeks: ReturnType<typeof buildWeeks>;
  seasonResult: ReturnType<typeof buildSeasonResult>;
  seasonNumber: number;
  seasonComplete: boolean;
  nextStartCharge: number;
  isTodayScheduled: boolean;
  todayStatus: 'done' | 'missed' | 'pending';
  badges: BadgeView[];
  unlockedBadgeCount: number;
  createGoal: (input: NewGoalInput) => Promise<void>;
  /** 勉強時間（分）を今日に加算 */
  addStudyMinutes: (min: number) => Promise<void>;
  startNextSeason: () => Promise<void>;
  updateReminder: (settings: ReminderSettings) => Promise<boolean>;
  updateProfile: (p: Profile) => Promise<void>;
  setGroup: (g: CustomGroup | null) => Promise<void>;
  resetAll: () => Promise<void>;
}

export interface NewGoalInput {
  name: string;
  category: Goal['category'];
  frequency: Goal['frequency'];
  weekdays: number[];
  weeklyTarget: number;
  dailyTargetMin: number;
  durationWeeks: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [minutes, setMinutes] = useState<MinutesMap>({});
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 20, minute: 0 });
  const [lifetime, setLifetime] = useState<LifetimeStats>(EMPTY_LIFETIME);
  const [badgesMap, setBadgesMap] = useState<BadgeMap>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [group, setGroupState] = useState<CustomGroup | null>(null);

  useEffect(() => {
    (async () => {
      const state = await loadState();
      setGoal(state.goal);
      setMinutes(state.minutes);
      setReminder(state.reminder);
      setLifetime(state.lifetime);
      setBadgesMap(state.badges);
      setProfile(state.profile);
      setGroupState(state.group);
      setReady(true);
    })();
  }, []);

  const progress = useMemo(() => buildProgress(goal, minutes, lifetime), [goal, minutes, lifetime]);
  const weeks = useMemo(() => buildWeeks(goal, minutes), [goal, minutes]);
  const seasonResult = useMemo(() => buildSeasonResult(goal, minutes), [goal, minutes]);
  const seasonComplete = useMemo(() => isSeasonComplete(goal), [goal]);

  // バッジの自動解除
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
      totalPaid: lifetime.totalPaid,
    });
    const additions = satisfied.filter((k) => !(k in badgesMap));
    if (additions.length === 0) return;
    const today = todayStr();
    const next = { ...badgesMap };
    for (const k of additions) next[k] = today;
    setBadgesMap(next);
    saveBadges(next);
  }, [ready, progress, seasonResult, lifetime, badgesMap]);

  const foldSeasonIntoLifetime = useCallback((): LifetimeStats => {
    const r = buildSeasonResult(goal, minutes);
    return {
      totalDone: lifetime.totalDone + r.done,
      bestStreak: Math.max(lifetime.bestStreak, progress.bestStreak),
      seasonsCompleted: lifetime.seasonsCompleted + 1,
      perfectSeasons: lifetime.perfectSeasons + (r.allPerfect ? 1 : 0),
      totalMinutes: lifetime.totalMinutes + r.minutes,
      totalCharged: lifetime.totalCharged + r.charged,
      totalPaid: lifetime.totalPaid,
      nextSeasonFree: r.allPerfect,
    };
  }, [goal, minutes, lifetime, progress.bestStreak]);

  const nextStartCharge = useMemo(() => {
    if (goal && isSeasonComplete(goal) && seasonResult.allPerfect) return 0;
    return lifetime.nextSeasonFree ? 0 : MONTHLY_STAKE;
  }, [goal, seasonResult.allPerfect, lifetime.nextSeasonFree]);

  const makeGoal = useCallback((input: NewGoalInput, startCharge: number): Goal => {
    return {
      id: `${Date.now()}`,
      name: input.name.trim(),
      category: input.category,
      frequency: input.frequency,
      weekdays: input.weekdays,
      weeklyTarget: input.weeklyTarget,
      dailyTargetMin: input.dailyTargetMin,
      stakeAmount: MONTHLY_STAKE,
      startCharge,
      startDate: todayStr(),
      durationWeeks: input.durationWeeks,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const applyStartCharge = useCallback(
    (base: LifetimeStats): { lifetime: LifetimeStats; charge: number } => {
      const charge = base.nextSeasonFree ? 0 : MONTHLY_STAKE;
      return {
        charge,
        lifetime: { ...base, totalPaid: base.totalPaid + charge, nextSeasonFree: false },
      };
    },
    []
  );

  const createGoal = useCallback(
    async (input: NewGoalInput) => {
      let base = lifetime;
      if (goal && isSeasonComplete(goal)) base = foldSeasonIntoLifetime();
      const { lifetime: charged, charge } = applyStartCharge(base);
      const newGoal = makeGoal(input, charge);
      setLifetime(charged);
      setGoal(newGoal);
      setMinutes({});
      await Promise.all([saveLifetime(charged), saveGoal(newGoal), saveMinutes({})]);
      if (reminder.enabled) {
        await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
      }
    },
    [goal, lifetime, foldSeasonIntoLifetime, applyStartCharge, makeGoal, reminder]
  );

  const startNextSeason = useCallback(async () => {
    if (!goal) return;
    const folded = foldSeasonIntoLifetime();
    const { lifetime: charged, charge } = applyStartCharge(folded);
    const newGoal: Goal = {
      ...goal,
      id: `${Date.now()}`,
      startCharge: charge,
      startDate: todayStr(),
      createdAt: new Date().toISOString(),
    };
    setLifetime(charged);
    setGoal(newGoal);
    setMinutes({});
    await Promise.all([saveLifetime(charged), saveGoal(newGoal), saveMinutes({})]);
    if (reminder.enabled) {
      await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
    }
  }, [goal, foldSeasonIntoLifetime, applyStartCharge, reminder]);

  const addStudyMinutes = useCallback(async (min: number) => {
    if (min <= 0) return;
    const today = todayStr();
    setMinutes((prev) => {
      const next = { ...prev, [today]: Math.round((prev[today] ?? 0) + min) };
      saveMinutes(next);
      return next;
    });
  }, []);

  const updateReminder = useCallback(
    async (settings: ReminderSettings): Promise<boolean> => {
      if (settings.enabled) {
        const ok = await scheduleDailyReminder(settings.hour, settings.minute, goal?.name ?? '今日の勉強');
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

  const updateProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await saveProfile(p);
  }, []);

  const setGroup = useCallback(async (g: CustomGroup | null) => {
    setGroupState(g);
    await saveGroup(g);
  }, []);

  const resetAll = useCallback(async () => {
    setGoal(null);
    setMinutes({});
    setReminder({ enabled: false, hour: 20, minute: 0 });
    setLifetime(EMPTY_LIFETIME);
    setBadgesMap({});
    setProfile(DEFAULT_PROFILE);
    setGroupState(null);
    await cancelReminders();
    await clearAll();
  }, []);

  const isTodayScheduled = useMemo(
    () => (goal ? isScheduledDay(goal, todayStr()) : false),
    [goal]
  );
  const todayStatus = useMemo<'done' | 'missed' | 'pending'>(() => {
    if (!goal) return 'pending';
    const st = statusOf(goal, minutes, todayStr());
    return st;
  }, [goal, minutes]);

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

  const unlockedBadgeCount = useMemo(() => badges.filter((b) => b.unlockedAt).length, [badges]);

  const value: AppContextValue = {
    ready,
    goal,
    minutes,
    reminder,
    lifetime,
    profile,
    group,
    progress,
    weeks,
    seasonResult,
    seasonNumber: lifetime.seasonsCompleted + 1,
    seasonComplete,
    nextStartCharge,
    isTodayScheduled,
    todayStatus,
    badges,
    unlockedBadgeCount,
    createGoal,
    addStudyMinutes,
    startNextSeason,
    updateReminder,
    updateProfile,
    setGroup,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

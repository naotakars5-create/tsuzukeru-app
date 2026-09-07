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
  NotesMap,
  ReminderSettings,
  LifetimeStats,
  BadgeMap,
  BadgeView,
  Profile,
  CommunityCreations,
  SubjectLog,
} from '@/types';
import {
  loadState,
  saveGoal,
  saveMinutes,
  saveNotes,
  saveSubjectLogs,
  saveTimer,
  saveReminder,
  saveLifetime,
  saveBadges,
  saveProfile,
  saveCommunityCreations,
  clearAll,
  DEFAULT_PROFILE,
} from '@/storage';

/** コミュニティ作成の月間上限（スパム防止） */
export const COMMUNITY_CREATE_LIMIT = 3;

/** 未読バッジを取りにいく間隔（ミリ秒） */
const UNREAD_POLL_MS = 60000;
import { isScheduledDay, statusOf } from '@/logic/schedule';
import { todayStr, daysBetween, addDays } from '@/logic/date';
import {
  buildProgress,
  buildWeeks,
  buildSeasonResult,
  isSeasonComplete,
  EMPTY_LIFETIME,
} from '@/logic/summary';
import { scheduleDailyReminder, cancelReminders, scheduleSmartReminders } from '@/logic/reminder';
import { BADGES, satisfiedBadgeKeys } from '@/logic/badges';
import { weekStake } from '@/logic/billing';
import { syncGoalToServer, syncDailyMinutes } from '@/lib/sync';
import { syncUserStats, fetchMyCommunities, fetchUnreadCounts } from '@/lib/socialApi';
import { POINTS_PER_DONE } from '@/logic/rank';

interface AppContextValue {
  ready: boolean;
  goal: Goal | null;
  minutes: MinutesMap;
  /** 日ごとの学習メモ */
  notes: NotesMap;
  /** ある日のメモを保存（空文字ならその日のメモを削除） */
  setNote: (date: string, text: string) => Promise<void>;
  /** 科目別の勉強記録 */
  subjectLogs: SubjectLog[];
  /** 科目に勉強時間を記録する */
  addSubjectMinutes: (subject: string, minutes: number) => Promise<void>;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  profile: Profile;
  progress: ReturnType<typeof buildProgress>;
  weeks: ReturnType<typeof buildWeeks>;
  seasonResult: ReturnType<typeof buildSeasonResult>;
  seasonNumber: number;
  seasonComplete: boolean;
  isTodayScheduled: boolean;
  todayStatus: 'done' | 'missed' | 'pending';
  badges: BadgeView[];
  unlockedBadgeCount: number;
  /** ストップウォッチ計測開始時刻(ms)。null=停止中 */
  timerStartedAt: number | null;
  /** 計測を開始 */
  startTimer: () => void;
  /** 計測を停止し、経過ぶんを今日に記録（返り値=記録した分） */
  stopTimer: () => Promise<number>;
  createGoal: (input: NewGoalInput) => Promise<void>;
  /** 勉強時間（分）を今日に加算 */
  addStudyMinutes: (min: number) => Promise<void>;
  startNextSeason: () => Promise<void>;
  updateReminder: (settings: ReminderSettings) => Promise<boolean>;
  updateProfile: (p: Profile) => Promise<void>;
  /** コミュニティ作成の月間上限 */
  communityLimit: number;
  /** 今月すでに作成したコミュニティ数 */
  communityCreationsThisMonth: number;
  /** コミュニティ作成を1件記録する（月をまたいだらリセット） */
  recordCommunityCreation: () => Promise<void>;
  /** 参加中コミュニティの未読メッセージ数（サーバー由来・タブのバッジ用） */
  groupUnreadCount: number;
  /** 保存済みデータを読み直す（バックアップ復元後に使う） */
  reloadAll: () => Promise<void>;
  resetAll: () => Promise<void>;
}

export interface NewGoalInput {
  name: string;
  category: Goal['category'];
  frequency: Goal['frequency'];
  weekdays: number[];
  weeklyTarget: number;
  dailyTargetMin: number;
  deposit: number;
  examDate?: string | null;
  targetTotalHours?: number | null;
  durationWeeks: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [minutes, setMinutes] = useState<MinutesMap>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [subjectLogs, setSubjectLogs] = useState<SubjectLog[]>([]);
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 20, minute: 0 });
  const [lifetime, setLifetime] = useState<LifetimeStats>(EMPTY_LIFETIME);
  const [badgesMap, setBadgesMap] = useState<BadgeMap>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [communityCreations, setCommunityCreationsState] = useState<CommunityCreations>({
    month: '',
    count: 0,
  });

  const applyState = useCallback((state: Awaited<ReturnType<typeof loadState>>) => {
    setGoal(state.goal);
    setMinutes(state.minutes);
    setNotes(state.notes);
    setSubjectLogs(state.subjectLogs);
    setReminder(state.reminder);
    setLifetime(state.lifetime);
    setBadgesMap(state.badges);
    setProfile(state.profile);
    setTimerStartedAt(state.timerStartedAt);
    setCommunityCreationsState(state.communityCreations);
  }, []);

  useEffect(() => {
    (async () => {
      applyState(await loadState());
      setReady(true);
    })();
  }, [applyState]);

  const reloadAll = useCallback(async () => {
    applyState(await loadState());
  }, [applyState]);

  const currentMonth = todayStr().slice(0, 7);
  const communityCreationsThisMonth =
    communityCreations.month === currentMonth ? communityCreations.count : 0;
  // 参加中コミュニティの未読数。サーバーから定期的に取得してタブのバッジに出す。
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const load = async () => {
      const comms = await fetchMyCommunities();
      const counts = await fetchUnreadCounts(comms.map((c) => c.id));
      if (alive) setGroupUnreadCount(Object.values(counts).reduce((a, b) => a + b, 0));
    };
    void load();
    const timer = setInterval(load, UNREAD_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ready]);

  const recordCommunityCreation = useCallback(async () => {
    const month = todayStr().slice(0, 7);
    setCommunityCreationsState((prev) => {
      const base = prev.month === month ? prev.count : 0;
      const next = { month, count: base + 1 };
      saveCommunityCreations(next);
      return next;
    });
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
      totalWaived: lifetime.totalWaived,
    });
    const additions = satisfied.filter((k) => !(k in badgesMap));
    if (additions.length === 0) return;
    const today = todayStr();
    const next = { ...badgesMap };
    for (const k of additions) next[k] = today;
    setBadgesMap(next);
    saveBadges(next);
  }, [ready, progress, seasonResult, lifetime, badgesMap]);

  // 記録や設定が変わるたびに、状況に応じた通知を組み直す
  useEffect(() => {
    if (!ready || !goal) return;
    const currentWeek = weeks.find((w) => w.isCurrent);
    const weekRemaining = currentWeek?.pending ?? 0;
    const daysLeftInWeek = currentWeek
      ? Math.max(0, daysBetween(todayStr(), currentWeek.endDate) + 1)
      : 0;
    const examDaysLeft = goal.examDate ? daysBetween(todayStr(), goal.examDate) : null;
    scheduleSmartReminders({
      reminder,
      goalName: goal.name,
      isTodayScheduled: isScheduledDay(goal, todayStr()),
      todayDone: statusOf(goal, minutes, todayStr()) === 'done',
      todayMinutes: progress.todayMinutes,
      dailyTargetMin: goal.dailyTargetMin,
      streak: progress.streak,
      weekRemaining,
      daysLeftInWeek,
      weekStakeAmount: weekStake(goal.deposit, goal.durationWeeks),
      examDaysLeft,
    });
  }, [ready, goal, minutes, reminder, weeks, progress.todayMinutes, progress.streak]);

  // ランキングに載せる自分の集計値をサーバーへ同期する。
  // 他人からは読めるが書けない（RLS）ので、各自が自分のぶんだけ書き込む。
  useEffect(() => {
    if (!ready) return;
    const today = todayStr();
    let weekMinutes = 0;
    for (let i = 0; i < 7; i++) weekMinutes += minutes[addDays(today, -i)] ?? 0;

    void syncUserStats({
      displayName: profile.name,
      icon: profile.icon,
      color: profile.color,
      motivation: profile.motivation,
      // 写真はデータURIで重いため、サーバーには送らず端末内だけで持つ
      photoUrl: null,
      category: goal?.category ?? null,
      points: progress.points,
      monthPoints: seasonResult.done * POINTS_PER_DONE,
      monthMinutes: seasonResult.minutes,
      weekMinutes: Math.round(weekMinutes),
      streak: progress.streak,
    });
  }, [
    ready,
    profile.name,
    profile.icon,
    profile.color,
    profile.motivation,
    goal?.category,
    progress.points,
    progress.streak,
    seasonResult.done,
    seasonResult.minutes,
    minutes,
  ]);

  /** 完了シーズンを通算へ畳み込む（課金/免除を反映・案C。お金は預からない） */
  const foldSeasonIntoLifetime = useCallback((): LifetimeStats => {
    const r = buildSeasonResult(goal, minutes);
    return {
      totalDone: lifetime.totalDone + r.done,
      bestStreak: Math.max(lifetime.bestStreak, progress.bestStreak),
      seasonsCompleted: lifetime.seasonsCompleted + 1,
      perfectSeasons: lifetime.perfectSeasons + (r.allPerfect ? 1 : 0),
      totalMinutes: lifetime.totalMinutes + r.minutes,
      totalCharged: lifetime.totalCharged + r.charged,
      totalWaived: lifetime.totalWaived + r.waived,
    };
  }, [goal, minutes, lifetime, progress.bestStreak]);

  const makeGoal = useCallback((input: NewGoalInput): Goal => {
    return {
      id: `${Date.now()}`,
      name: input.name.trim(),
      category: input.category,
      frequency: input.frequency,
      weekdays: input.weekdays,
      weeklyTarget: input.weeklyTarget,
      dailyTargetMin: input.dailyTargetMin,
      deposit: input.deposit,
      examDate: input.examDate ?? null,
      targetTotalHours: input.targetTotalHours ?? null,
      startDate: todayStr(),
      durationWeeks: input.durationWeeks,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const createGoal = useCallback(
    async (input: NewGoalInput) => {
      let base = lifetime;
      if (goal && isSeasonComplete(goal)) base = foldSeasonIntoLifetime();
      // 案C: 開始時は課金しない（カード登録＋コミットのみ）。お金は預からない
      const nextLifetime = base;
      const newGoal = makeGoal(input);
      setLifetime(nextLifetime);
      setGoal(newGoal);
      setMinutes({});
      await Promise.all([saveLifetime(nextLifetime), saveGoal(newGoal), saveMinutes({})]);
      if (reminder.enabled) {
        await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
      }
      void syncGoalToServer(newGoal);
    },
    [goal, lifetime, foldSeasonIntoLifetime, makeGoal, reminder]
  );

  const startNextSeason = useCallback(async () => {
    if (!goal) return;
    // 案C: 次シーズン開始時も課金しない（お金は預からない）
    const nextLifetime = foldSeasonIntoLifetime();
    const newGoal: Goal = {
      ...goal,
      id: `${Date.now()}`,
      startDate: todayStr(),
      createdAt: new Date().toISOString(),
    };
    setLifetime(nextLifetime);
    setGoal(newGoal);
    setMinutes({});
    await Promise.all([saveLifetime(nextLifetime), saveGoal(newGoal), saveMinutes({})]);
    if (reminder.enabled) {
      await scheduleDailyReminder(reminder.hour, reminder.minute, newGoal.name);
    }
    void syncGoalToServer(newGoal);
  }, [goal, foldSeasonIntoLifetime, reminder]);

  const addStudyMinutes = useCallback(async (min: number) => {
    if (min <= 0) return;
    const today = todayStr();
    setMinutes((prev) => {
      const todayTotal = Math.round((prev[today] ?? 0) + min);
      const next = { ...prev, [today]: todayTotal };
      saveMinutes(next);
      void syncDailyMinutes(today, todayTotal);
      return next;
    });
  }, []);

  const addSubjectMinutes = useCallback(async (subject: string, min: number) => {
    const name = subject.trim();
    if (!name || min <= 0) return;
    const date = todayStr();
    setSubjectLogs((prev) => {
      // 同じ日・同じ科目はまとめる
      const idx = prev.findIndex((l) => l.date === date && l.subject === name);
      const next =
        idx >= 0
          ? prev.map((l, i) => (i === idx ? { ...l, minutes: Math.round(l.minutes + min) } : l))
          : [...prev, { date, subject: name, minutes: Math.round(min) }];
      saveSubjectLogs(next);
      return next;
    });
  }, []);

  const setNote = useCallback(async (date: string, text: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      const t = text.trim();
      if (t) next[date] = t;
      else delete next[date];
      saveNotes(next);
      return next;
    });
  }, []);

  const startTimer = useCallback(() => {
    const now = Date.now();
    setTimerStartedAt(now);
    saveTimer(now);
  }, []);

  const stopTimer = useCallback(async (): Promise<number> => {
    if (!timerStartedAt) return 0;
    // 1セッション最大6時間でキャップ（止め忘れ対策）
    const elapsedMin = Math.min(360, (Date.now() - timerStartedAt) / 60000);
    setTimerStartedAt(null);
    await saveTimer(null);
    if (elapsedMin > 0) await addStudyMinutes(elapsedMin);
    return elapsedMin;
  }, [timerStartedAt, addStudyMinutes]);

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

  const resetAll = useCallback(async () => {
    setGoal(null);
    setMinutes({});
    setNotes({});
    setSubjectLogs([]);
    setTimerStartedAt(null);
    await saveTimer(null);
    setReminder({ enabled: false, hour: 20, minute: 0 });
    setLifetime(EMPTY_LIFETIME);
    setBadgesMap({});
    setProfile(DEFAULT_PROFILE);
    setCommunityCreationsState({ month: '', count: 0 });
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
    notes,
    setNote,
    subjectLogs,
    addSubjectMinutes,
    reminder,
    lifetime,
    profile,
    progress,
    weeks,
    seasonResult,
    seasonNumber: lifetime.seasonsCompleted + 1,
    seasonComplete,
    isTodayScheduled,
    todayStatus,
    badges,
    unlockedBadgeCount,
    timerStartedAt,
    startTimer,
    stopTimer,
    createGoal,
    addStudyMinutes,
    startNextSeason,
    updateReminder,
    updateProfile,
    communityLimit: COMMUNITY_CREATE_LIMIT,
    communityCreationsThisMonth,
    recordCommunityCreation,
    groupUnreadCount,
    reloadAll,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

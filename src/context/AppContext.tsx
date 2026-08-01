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
  CustomGroup,
  CommunityCreations,
  ChatMap,
  ChatMessage,
  ChatReadMap,
} from '@/types';
import {
  loadState,
  saveGoal,
  saveMinutes,
  saveNotes,
  saveTimer,
  saveReminder,
  saveLifetime,
  saveBadges,
  saveProfile,
  saveGroup,
  savePremium,
  saveCommunityCreations,
  saveChats,
  saveChatReads,
  clearAll,
  DEFAULT_PROFILE,
} from '@/storage';

/** コミュニティ作成の月間上限（プレミアム限定） */
export const COMMUNITY_CREATE_LIMIT = 3;
import { isScheduledDay, statusOf } from '@/logic/schedule';
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
  minutes: MinutesMap;
  /** 日ごとの学習メモ */
  notes: NotesMap;
  /** ある日のメモを保存（空文字ならその日のメモを削除） */
  setNote: (date: string, text: string) => Promise<void>;
  reminder: ReminderSettings;
  lifetime: LifetimeStats;
  profile: Profile;
  group: CustomGroup | null;
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
  setGroup: (g: CustomGroup | null) => Promise<void>;
  /** 有料会員（プレミアム）か（モック） */
  premium: boolean;
  /** プレミアム加入/解約（モック） */
  setPremium: (v: boolean) => Promise<void>;
  /** コミュニティ作成の月間上限 */
  communityLimit: number;
  /** 今月すでに作成したコミュニティ数 */
  communityCreationsThisMonth: number;
  /** いまコミュニティを作成できるか（プレミアム && 上限未満） */
  canCreateCommunity: boolean;
  /** コミュニティ作成を1件記録する（月をまたいだらリセット） */
  recordCommunityCreation: () => Promise<void>;
  /** コミュニティ掲示板への自分の投稿（コード -> 投稿） */
  chats: ChatMap;
  /** 掲示板に投稿する */
  postChatMessage: (code: string, text: string) => Promise<void>;
  /** 他メンバーの返信を掲示板に追加する（モック演出用） */
  postChatReply: (code: string, author: string, text: string) => Promise<void>;
  /** 掲示板の既読時刻（コードごと） */
  chatReads: ChatReadMap;
  /** 掲示板を既読にする */
  markChatRead: (code: string) => Promise<void>;
  /** 参加中コミュニティの未読メッセージ数（未参加なら0） */
  groupUnreadCount: number;
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
  durationWeeks: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [minutes, setMinutes] = useState<MinutesMap>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 20, minute: 0 });
  const [lifetime, setLifetime] = useState<LifetimeStats>(EMPTY_LIFETIME);
  const [badgesMap, setBadgesMap] = useState<BadgeMap>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [group, setGroupState] = useState<CustomGroup | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [premium, setPremiumState] = useState(false);
  const [communityCreations, setCommunityCreationsState] = useState<CommunityCreations>({
    month: '',
    count: 0,
  });
  const [chats, setChats] = useState<ChatMap>({});
  const [chatReads, setChatReads] = useState<ChatReadMap>({});

  useEffect(() => {
    (async () => {
      const state = await loadState();
      setGoal(state.goal);
      setMinutes(state.minutes);
      setNotes(state.notes);
      setReminder(state.reminder);
      setLifetime(state.lifetime);
      setBadgesMap(state.badges);
      setProfile(state.profile);
      setGroupState(state.group);
      setTimerStartedAt(state.timerStartedAt);
      setPremiumState(state.premium);
      setCommunityCreationsState(state.communityCreations);
      setChats(state.chats);
      setChatReads(state.chatReads);
      setReady(true);
    })();
  }, []);

  const currentMonth = todayStr().slice(0, 7);
  const communityCreationsThisMonth =
    communityCreations.month === currentMonth ? communityCreations.count : 0;
  const canCreateCommunity = premium && communityCreationsThisMonth < COMMUNITY_CREATE_LIMIT;

  const setPremium = useCallback(async (v: boolean) => {
    setPremiumState(v);
    await savePremium(v);
  }, []);

  const postChatMessage = useCallback(
    async (code: string, text: string) => {
      const t = text.trim();
      if (!t || !code) return;
      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        author: profile.name,
        text: t,
        at: Date.now(),
        mine: true,
      };
      setChats((prev) => {
        const next = { ...prev, [code]: [...(prev[code] ?? []), msg] };
        saveChats(next);
        return next;
      });
      // 自分の投稿と同時に既読も更新（自分の投稿で未読が増えないように）
      setChatReads((prev) => {
        const next = { ...prev, [code]: Date.now() };
        saveChatReads(next);
        return next;
      });
    },
    [profile.name]
  );

  const postChatReply = useCallback(async (code: string, author: string, text: string) => {
    if (!code || !text.trim()) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-r${Math.round(Math.random() * 1e6)}`,
      author,
      text: text.trim(),
      at: Date.now(),
      mine: false,
    };
    setChats((prev) => {
      const next = { ...prev, [code]: [...(prev[code] ?? []), msg] };
      saveChats(next);
      return next;
    });
  }, []);

  const markChatRead = useCallback(async (code: string) => {
    if (!code) return;
    setChatReads((prev) => {
      const next = { ...prev, [code]: Date.now() };
      saveChatReads(next);
      return next;
    });
  }, []);

  // 参加中コミュニティの未読数（他メンバーの投稿のうち、既読時刻より新しいもの）
  const groupUnreadCount = useMemo(() => {
    if (!group) return 0;
    const lastRead = chatReads[group.code] ?? 0;
    return (chats[group.code] ?? []).filter((m) => !m.mine && m.at > lastRead).length;
  }, [group, chats, chatReads]);

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
  }, [goal, foldSeasonIntoLifetime, reminder]);

  const addStudyMinutes = useCallback(async (min: number) => {
    if (min <= 0) return;
    const today = todayStr();
    setMinutes((prev) => {
      const next = { ...prev, [today]: Math.round((prev[today] ?? 0) + min) };
      saveMinutes(next);
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

  const setGroup = useCallback(async (g: CustomGroup | null) => {
    setGroupState(g);
    await saveGroup(g);
  }, []);

  const resetAll = useCallback(async () => {
    setGoal(null);
    setMinutes({});
    setNotes({});
    setTimerStartedAt(null);
    await saveTimer(null);
    setReminder({ enabled: false, hour: 20, minute: 0 });
    setLifetime(EMPTY_LIFETIME);
    setBadgesMap({});
    setProfile(DEFAULT_PROFILE);
    setGroupState(null);
    setPremiumState(false);
    setCommunityCreationsState({ month: '', count: 0 });
    setChats({});
    setChatReads({});
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
    reminder,
    lifetime,
    profile,
    group,
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
    setGroup,
    premium,
    setPremium,
    communityLimit: COMMUNITY_CREATE_LIMIT,
    communityCreationsThisMonth,
    canCreateCommunity,
    recordCommunityCreation,
    chats,
    postChatMessage,
    postChatReply,
    chatReads,
    markChatRead,
    groupUnreadCount,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

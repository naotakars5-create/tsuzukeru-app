/**
 * AsyncStorage への読み書きを集約する保存層。
 * 将来サーバー保存に切り替えるときは、このファイルの実装だけ差し替えればよい。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Goal,
  MinutesMap,
  NotesMap,
  PersistedState,
  ReminderSettings,
  LifetimeStats,
  BadgeMap,
  Profile,
  CustomGroup,
  CommunityCreations,
  ChatMap,
  ChatReadMap,
  SubjectLog,
} from '@/types';
import { EMPTY_LIFETIME } from '@/logic/summary';
import { DEFAULT_DEPOSIT } from '@/logic/billing';

const KEY_GOAL = 'tsuzukeru.goal.v1';
const KEY_MINUTES = 'tsuzukeru.minutes.v1';
const KEY_NOTES = 'tsuzukeru.notes.v1';
const KEY_SUBJECTS = 'tsuzukeru.subjects.v1';
const KEY_TIMER = 'tsuzukeru.timer.v1';
const KEY_REMINDER = 'tsuzukeru.reminder.v1';
const KEY_LIFETIME = 'tsuzukeru.lifetime.v1';
const KEY_BADGES = 'tsuzukeru.badges.v1';
const KEY_PROFILE = 'tsuzukeru.profile.v1';
const KEY_GROUP = 'tsuzukeru.group.v1';
const KEY_PREMIUM = 'tsuzukeru.premium.v1';
const KEY_COMMUNITY_CREATIONS = 'tsuzukeru.communityCreations.v1';
const KEY_CHATS = 'tsuzukeru.chats.v1';
const KEY_CHAT_READS = 'tsuzukeru.chatReads.v1';

const DEFAULT_COMMUNITY_CREATIONS: CommunityCreations = { month: '', count: 0 };

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export const DEFAULT_PROFILE: Profile = {
  name: 'あなた',
  icon: 'person',
  color: '#C6F432',
  motivation: '合格まで、続ける。',
};

export async function loadState(): Promise<PersistedState> {
  try {
    const [
      goalRaw,
      minutesRaw,
      notesRaw,
      timerRaw,
      reminderRaw,
      lifetimeRaw,
      badgesRaw,
      profileRaw,
      groupRaw,
      premiumRaw,
      creationsRaw,
      chatsRaw,
      chatReadsRaw,
      subjectsRaw,
    ] = await Promise.all([
      AsyncStorage.getItem(KEY_GOAL),
      AsyncStorage.getItem(KEY_MINUTES),
      AsyncStorage.getItem(KEY_NOTES),
      AsyncStorage.getItem(KEY_TIMER),
      AsyncStorage.getItem(KEY_REMINDER),
      AsyncStorage.getItem(KEY_LIFETIME),
      AsyncStorage.getItem(KEY_BADGES),
      AsyncStorage.getItem(KEY_PROFILE),
      AsyncStorage.getItem(KEY_GROUP),
      AsyncStorage.getItem(KEY_PREMIUM),
      AsyncStorage.getItem(KEY_COMMUNITY_CREATIONS),
      AsyncStorage.getItem(KEY_CHATS),
      AsyncStorage.getItem(KEY_CHAT_READS),
      AsyncStorage.getItem(KEY_SUBJECTS),
    ]);
    const goal: Goal | null = goalRaw ? JSON.parse(goalRaw) : null;
    // 旧バージョン互換
    if (goal) {
      if (!goal.category) goal.category = 'other';
      if (goal.weeklyTarget == null) goal.weeklyTarget = 3;
      if (goal.dailyTargetMin == null) goal.dailyTargetMin = 120;
      if (goal.deposit == null) goal.deposit = DEFAULT_DEPOSIT;
    }
    const minutes: MinutesMap = minutesRaw ? JSON.parse(minutesRaw) : {};
    const notes: NotesMap = notesRaw ? JSON.parse(notesRaw) : {};
    const timerStartedAt: number | null = timerRaw ? JSON.parse(timerRaw) : null;
    const reminder: ReminderSettings = reminderRaw
      ? { ...DEFAULT_REMINDER, ...JSON.parse(reminderRaw) }
      : DEFAULT_REMINDER;
    const lifetime: LifetimeStats = lifetimeRaw
      ? { ...EMPTY_LIFETIME, ...JSON.parse(lifetimeRaw) }
      : EMPTY_LIFETIME;
    const badges: BadgeMap = badgesRaw ? JSON.parse(badgesRaw) : {};
    const profile: Profile = profileRaw
      ? { ...DEFAULT_PROFILE, ...JSON.parse(profileRaw) }
      : DEFAULT_PROFILE;
    // 旧バージョンは単一オブジェクト保存だったため、配列へ移行する
    let groups: CustomGroup[] = [];
    if (groupRaw) {
      const parsed = JSON.parse(groupRaw);
      groups = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    }
    const premium: boolean = premiumRaw ? JSON.parse(premiumRaw) : false;
    const communityCreations: CommunityCreations = creationsRaw
      ? { ...DEFAULT_COMMUNITY_CREATIONS, ...JSON.parse(creationsRaw) }
      : DEFAULT_COMMUNITY_CREATIONS;
    const chats: ChatMap = chatsRaw ? JSON.parse(chatsRaw) : {};
    const chatReads: ChatReadMap = chatReadsRaw ? JSON.parse(chatReadsRaw) : {};
    const subjectLogs: SubjectLog[] = subjectsRaw ? JSON.parse(subjectsRaw) : [];
    return {
      goal,
      minutes,
      notes,
      subjectLogs,
      timerStartedAt,
      reminder,
      lifetime,
      badges,
      profile,
      groups,
      premium,
      communityCreations,
      chats,
      chatReads,
    };
  } catch (e) {
    console.warn('loadState failed', e);
    return {
      goal: null,
      minutes: {},
      notes: {},
      subjectLogs: [],
      timerStartedAt: null,
      reminder: DEFAULT_REMINDER,
      lifetime: EMPTY_LIFETIME,
      badges: {},
      profile: DEFAULT_PROFILE,
      groups: [],
      premium: false,
      communityCreations: DEFAULT_COMMUNITY_CREATIONS,
      chats: {},
      chatReads: {},
    };
  }
}

export async function saveGoal(goal: Goal | null): Promise<void> {
  if (goal) await AsyncStorage.setItem(KEY_GOAL, JSON.stringify(goal));
  else await AsyncStorage.removeItem(KEY_GOAL);
}

export async function saveMinutes(minutes: MinutesMap): Promise<void> {
  await AsyncStorage.setItem(KEY_MINUTES, JSON.stringify(minutes));
}

export async function saveNotes(notes: NotesMap): Promise<void> {
  await AsyncStorage.setItem(KEY_NOTES, JSON.stringify(notes));
}

export async function saveSubjectLogs(logs: SubjectLog[]): Promise<void> {
  await AsyncStorage.setItem(KEY_SUBJECTS, JSON.stringify(logs));
}

export async function saveTimer(startedAt: number | null): Promise<void> {
  if (startedAt) await AsyncStorage.setItem(KEY_TIMER, JSON.stringify(startedAt));
  else await AsyncStorage.removeItem(KEY_TIMER);
}

export async function saveReminder(reminder: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY_REMINDER, JSON.stringify(reminder));
}

export async function saveLifetime(lifetime: LifetimeStats): Promise<void> {
  await AsyncStorage.setItem(KEY_LIFETIME, JSON.stringify(lifetime));
}

export async function saveBadges(badges: BadgeMap): Promise<void> {
  await AsyncStorage.setItem(KEY_BADGES, JSON.stringify(badges));
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
}

export async function saveGroups(groups: CustomGroup[]): Promise<void> {
  await AsyncStorage.setItem(KEY_GROUP, JSON.stringify(groups));
}

export async function savePremium(premium: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_PREMIUM, JSON.stringify(premium));
}

export async function saveCommunityCreations(c: CommunityCreations): Promise<void> {
  await AsyncStorage.setItem(KEY_COMMUNITY_CREATIONS, JSON.stringify(c));
}

export async function saveChats(chats: ChatMap): Promise<void> {
  await AsyncStorage.setItem(KEY_CHATS, JSON.stringify(chats));
}

export async function saveChatReads(reads: ChatReadMap): Promise<void> {
  await AsyncStorage.setItem(KEY_CHAT_READS, JSON.stringify(reads));
}

/** 全データを1つのオブジェクトに書き出す（バックアップ用） */
export async function exportAll(): Promise<string> {
  const state = await loadState();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

/**
 * バックアップJSONから復元する。形式が違えば false。
 * 復元後はアプリの再読み込みが必要（呼び出し側で loadState し直す）。
 */
export async function importAll(json: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(json);
    const st = parsed?.state;
    if (!st || typeof st !== 'object') return false;
    const writes: Array<Promise<void>> = [];
    if (st.goal !== undefined) writes.push(saveGoal(st.goal));
    if (st.minutes) writes.push(saveMinutes(st.minutes));
    if (st.notes) writes.push(saveNotes(st.notes));
    if (st.subjectLogs) writes.push(saveSubjectLogs(st.subjectLogs));
    if (st.reminder) writes.push(saveReminder(st.reminder));
    if (st.lifetime) writes.push(saveLifetime(st.lifetime));
    if (st.badges) writes.push(saveBadges(st.badges));
    if (st.profile) writes.push(saveProfile(st.profile));
    if (st.groups) writes.push(saveGroups(st.groups));
    if (typeof st.premium === 'boolean') writes.push(savePremium(st.premium));
    if (st.communityCreations) writes.push(saveCommunityCreations(st.communityCreations));
    if (st.chats) writes.push(saveChats(st.chats));
    if (st.chatReads) writes.push(saveChatReads(st.chatReads));
    await Promise.all(writes);
    return true;
  } catch {
    return false;
  }
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_GOAL,
    KEY_MINUTES,
    KEY_NOTES,
    KEY_SUBJECTS,
    KEY_TIMER,
    KEY_REMINDER,
    KEY_LIFETIME,
    KEY_BADGES,
    KEY_PROFILE,
    KEY_GROUP,
    KEY_PREMIUM,
    KEY_COMMUNITY_CREATIONS,
    KEY_CHATS,
    KEY_CHAT_READS,
  ]);
}

/**
 * AsyncStorage への読み書きを集約する保存層。
 * 将来サーバー保存に切り替えるときは、このファイルの実装だけ差し替えればよい。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Goal,
  MinutesMap,
  PersistedState,
  ReminderSettings,
  LifetimeStats,
  BadgeMap,
  Profile,
  CustomGroup,
} from '@/types';
import { EMPTY_LIFETIME } from '@/logic/summary';

const KEY_GOAL = 'tsuzukeru.goal.v1';
const KEY_MINUTES = 'tsuzukeru.minutes.v1';
const KEY_REMINDER = 'tsuzukeru.reminder.v1';
const KEY_LIFETIME = 'tsuzukeru.lifetime.v1';
const KEY_BADGES = 'tsuzukeru.badges.v1';
const KEY_PROFILE = 'tsuzukeru.profile.v1';
const KEY_GROUP = 'tsuzukeru.group.v1';

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export const DEFAULT_PROFILE: Profile = {
  name: 'あなた',
  icon: 'person',
  color: '#C6F432',
  motivation: '合格まで、続ける。',
};

export async function loadState(): Promise<PersistedState> {
  try {
    const [goalRaw, minutesRaw, reminderRaw, lifetimeRaw, badgesRaw, profileRaw, groupRaw] =
      await Promise.all([
        AsyncStorage.getItem(KEY_GOAL),
        AsyncStorage.getItem(KEY_MINUTES),
        AsyncStorage.getItem(KEY_REMINDER),
        AsyncStorage.getItem(KEY_LIFETIME),
        AsyncStorage.getItem(KEY_BADGES),
        AsyncStorage.getItem(KEY_PROFILE),
        AsyncStorage.getItem(KEY_GROUP),
      ]);
    const goal: Goal | null = goalRaw ? JSON.parse(goalRaw) : null;
    // 旧バージョン互換
    if (goal) {
      if (!goal.category) goal.category = 'other';
      if (goal.weeklyTarget == null) goal.weeklyTarget = 3;
      if (goal.startCharge == null) goal.startCharge = 0;
      if (goal.dailyTargetMin == null) goal.dailyTargetMin = 120;
    }
    const minutes: MinutesMap = minutesRaw ? JSON.parse(minutesRaw) : {};
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
    const group: CustomGroup | null = groupRaw ? JSON.parse(groupRaw) : null;
    return { goal, minutes, reminder, lifetime, badges, profile, group };
  } catch (e) {
    console.warn('loadState failed', e);
    return {
      goal: null,
      minutes: {},
      reminder: DEFAULT_REMINDER,
      lifetime: EMPTY_LIFETIME,
      badges: {},
      profile: DEFAULT_PROFILE,
      group: null,
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

export async function saveGroup(group: CustomGroup | null): Promise<void> {
  if (group) await AsyncStorage.setItem(KEY_GROUP, JSON.stringify(group));
  else await AsyncStorage.removeItem(KEY_GROUP);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_GOAL,
    KEY_MINUTES,
    KEY_REMINDER,
    KEY_LIFETIME,
    KEY_BADGES,
    KEY_PROFILE,
    KEY_GROUP,
  ]);
}

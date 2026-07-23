/**
 * AsyncStorage への読み書きを集約する保存層。
 * 将来サーバー保存に切り替えるときは、このファイルの実装だけ差し替えればよい。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, RecordMap, PersistedState, ReminderSettings, LifetimeStats, BadgeMap } from '@/types';
import { EMPTY_LIFETIME } from '@/logic/summary';

const KEY_GOAL = 'tsuzukeru.goal.v1';
const KEY_RECORDS = 'tsuzukeru.records.v1';
const KEY_REMINDER = 'tsuzukeru.reminder.v1';
const KEY_LIFETIME = 'tsuzukeru.lifetime.v1';
const KEY_BADGES = 'tsuzukeru.badges.v1';

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export async function loadState(): Promise<PersistedState> {
  try {
    const [goalRaw, recordsRaw, reminderRaw, lifetimeRaw, badgesRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_GOAL),
      AsyncStorage.getItem(KEY_RECORDS),
      AsyncStorage.getItem(KEY_REMINDER),
      AsyncStorage.getItem(KEY_LIFETIME),
      AsyncStorage.getItem(KEY_BADGES),
    ]);
    const goal: Goal | null = goalRaw ? JSON.parse(goalRaw) : null;
    // 旧バージョンで保存された目標にはカテゴリが無いことがある
    if (goal && !goal.category) goal.category = 'other';
    const records: RecordMap = recordsRaw ? JSON.parse(recordsRaw) : {};
    const reminder: ReminderSettings = reminderRaw
      ? { ...DEFAULT_REMINDER, ...JSON.parse(reminderRaw) }
      : DEFAULT_REMINDER;
    const lifetime: LifetimeStats = lifetimeRaw
      ? { ...EMPTY_LIFETIME, ...JSON.parse(lifetimeRaw) }
      : EMPTY_LIFETIME;
    const badges: BadgeMap = badgesRaw ? JSON.parse(badgesRaw) : {};
    return { goal, records, reminder, lifetime, badges };
  } catch (e) {
    console.warn('loadState failed', e);
    return { goal: null, records: {}, reminder: DEFAULT_REMINDER, lifetime: EMPTY_LIFETIME, badges: {} };
  }
}

export async function saveGoal(goal: Goal | null): Promise<void> {
  if (goal) await AsyncStorage.setItem(KEY_GOAL, JSON.stringify(goal));
  else await AsyncStorage.removeItem(KEY_GOAL);
}

export async function saveRecords(records: RecordMap): Promise<void> {
  await AsyncStorage.setItem(KEY_RECORDS, JSON.stringify(records));
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

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_GOAL, KEY_RECORDS, KEY_REMINDER, KEY_LIFETIME, KEY_BADGES]);
}

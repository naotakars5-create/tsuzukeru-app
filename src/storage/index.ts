/**
 * AsyncStorage への読み書きを集約する保存層。
 * 将来サーバー保存に切り替えるときは、このファイルの実装だけ差し替えればよい。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, RecordMap, PersistedState } from '@/types';

const KEY_GOAL = 'tsuzukeru.goal.v1';
const KEY_RECORDS = 'tsuzukeru.records.v1';

export async function loadState(): Promise<PersistedState> {
  try {
    const [goalRaw, recordsRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_GOAL),
      AsyncStorage.getItem(KEY_RECORDS),
    ]);
    const goal: Goal | null = goalRaw ? JSON.parse(goalRaw) : null;
    const records: RecordMap = recordsRaw ? JSON.parse(recordsRaw) : {};
    return { goal, records };
  } catch (e) {
    console.warn('loadState failed', e);
    return { goal: null, records: {} };
  }
}

export async function saveGoal(goal: Goal | null): Promise<void> {
  if (goal) await AsyncStorage.setItem(KEY_GOAL, JSON.stringify(goal));
  else await AsyncStorage.removeItem(KEY_GOAL);
}

export async function saveRecords(records: RecordMap): Promise<void> {
  await AsyncStorage.setItem(KEY_RECORDS, JSON.stringify(records));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_GOAL, KEY_RECORDS]);
}

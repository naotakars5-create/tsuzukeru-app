/**
 * リマインド通知（端末内のローカル通知）。
 * サーバーからのプッシュ通知ではなく、端末が自分で毎日決まった時刻に
 * 通知を出す仕組みなので、サーバー無しで完結する。
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// フォアグラウンドでも通知を表示する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** 通知権限を確認し、なければリクエストする。許可されたら true */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * 毎日 hour:minute に鳴るリマインドを設定する（既存の予約は入れ替え）。
 * 成功したら true。権限が無い場合は false。
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  goalName: string
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'リマインド',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '今日の習慣の時間です',
      body: `「${goalName}」をやったら、達成ボタンを忘れずに！`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'reminder' : undefined,
    },
  });
  return true;
}

/** すべてのリマインド予約を解除する */
export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

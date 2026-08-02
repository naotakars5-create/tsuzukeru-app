/**
 * リマインド通知（端末内のローカル通知）。
 * サーバーからのプッシュ通知ではなく、端末が自分で決まった時刻に
 * 通知を出す仕組みなので、サーバー無しで完結する。
 *
 * 「毎日◯時」の定期リマインドに加えて、状況に応じた“スマート通知”を出す:
 *  - 夜になっても未達 → 連続が途切れる警告
 *  - 週の残り日数が足りない → 課金が確定しそうな警告
 *  - 試験が近い → 直前期の発破
 * 予約はアプリが開かれるたび・記録が変わるたびに組み直すので、内容は常に最新になる。
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

/** スマート通知を出す時刻（夜のリカバリー枠） */
export const SMART_HOUR = 21;
export const SMART_MINUTE = 0;

/** 通知権限を確認し、なければリクエストする。許可されたら true */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'リマインド',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

const channelId = () => (Platform.OS === 'android' ? 'reminder' : undefined);

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
  await ensureChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '今日の勉強の時間です',
      body: `「${goalName}」を始めよう。机に向かえば、やる気は後からついてくる。`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: channelId(),
    },
  });
  return true;
}

/** スマート通知の判断に使う、いまの状況 */
export interface SmartContext {
  /** 定期リマインドの設定 */
  reminder: { enabled: boolean; hour: number; minute: number };
  goalName: string;
  /** 今日は予定日か */
  isTodayScheduled: boolean;
  /** 今日はすでに達成したか */
  todayDone: boolean;
  /** 今日の勉強時間（分） */
  todayMinutes: number;
  /** 1日の目標時間（分） */
  dailyTargetMin: number;
  /** 現在の連続日数 */
  streak: number;
  /** 今週の残り必要回数（週N回モードで未達のぶん） */
  weekRemaining: number;
  /** 今週の残り日数 */
  daysLeftInWeek: number;
  /** 未達だとこの週に課金される額 */
  weekStakeAmount: number;
  /** 試験までの残り日数（未設定なら null） */
  examDaysLeft: number | null;
}

/** 今日の SMART_HOUR 時が未来なら Date を返す（過ぎていたら null） */
function tonightAt(hour: number, minute: number): Date | null {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  return t.getTime() > now.getTime() + 60_000 ? t : null;
}

/**
 * 状況に応じたスマート通知を組み直す（毎日のリマインドも含めて再予約）。
 * 呼ぶたびに全部作り直すので、達成済みなら警告は消える。
 */
export async function scheduleSmartReminders(ctx: SmartContext): Promise<void> {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();

  // 1) 毎日の定期リマインド
  if (ctx.reminder.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '今日の勉強の時間です',
        body: `「${ctx.goalName}」を始めよう。机に向かえば、やる気は後からついてくる。`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: ctx.reminder.hour,
        minute: ctx.reminder.minute,
        channelId: channelId(),
      },
    });
  }

  // 2) 夜のスマート通知（今日ぶんが未達のときだけ・今夜21時）
  const at = tonightAt(SMART_HOUR, SMART_MINUTE);
  if (at && ctx.isTodayScheduled && !ctx.todayDone) {
    const remain = Math.max(0, ctx.dailyTargetMin - ctx.todayMinutes);
    const alert = buildNightAlert(ctx, remain);
    if (alert) {
      await Notifications.scheduleNotificationAsync({
        content: { title: alert.title, body: alert.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: channelId(),
        },
      });
    }
  }
}

/** 夜の通知文面を、いちばん切実な理由から選ぶ */
function buildNightAlert(
  ctx: SmartContext,
  remainMinutes: number
): { title: string; body: string } | null {
  const remainText =
    remainMinutes >= 60
      ? `あと${Math.floor(remainMinutes / 60)}時間${remainMinutes % 60 ? `${remainMinutes % 60}分` : ''}`
      : `あと${remainMinutes}分`;

  // ① 連続が途切れる
  if (ctx.streak > 0) {
    return {
      title: `連続${ctx.streak}日が、今日で途切れます`,
      body: `${remainText}で今日も達成。ここで消すには惜しい火だ。`,
    };
  }
  // ② 今週の課金が確定しそう
  if (ctx.weekRemaining > 0 && ctx.daysLeftInWeek <= ctx.weekRemaining) {
    return {
      title: `今週、¥${ctx.weekStakeAmount.toLocaleString()} の課金が近づいています`,
      body: `残り${ctx.daysLeftInWeek}日で${ctx.weekRemaining}回。今日やらないと間に合いません。`,
    };
  }
  // ③ 試験が近い
  if (ctx.examDaysLeft != null && ctx.examDaysLeft >= 0 && ctx.examDaysLeft <= 30) {
    return {
      title: `試験まであと${ctx.examDaysLeft}日`,
      body: `直前期の1日は、平時の3日ぶん。${remainText}だけでも机に向かおう。`,
    };
  }
  // ④ ふつうの未達リマインド
  return {
    title: 'まだ今日の目標に届いていません',
    body: `${remainText}で今日は達成。5分でいい、始めよう。`,
  };
}

/** すべてのリマインド予約を解除する */
export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

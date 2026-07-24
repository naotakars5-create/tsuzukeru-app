/**
 * クロスプラットフォームの確認ダイアログ。
 * React Native の Alert.alert はWeb(react-native-web)ではボタンが機能しないため、
 * Webでは window.confirm を使う。ネイティブでは Alert.alert を使う。
 * true=OK / false=キャンセル を返す。
 */

import { Alert, Platform } from 'react-native';

export function confirmAsync(
  title: string,
  message?: string,
  okLabel = 'OK',
  cancelLabel = 'キャンセル'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // window.confirm は同期だが Promise にそろえる
    const ok = typeof window !== 'undefined' ? window.confirm(text) : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** 情報表示のみ（OKだけ）。Webは alert、ネイティブは Alert.alert。 */
export function notifyAsync(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

/**
 * テキスト入力プロンプト。Webは window.prompt、iOSは Alert.prompt。
 * それ以外(Android)は defaultValue をそのまま返す（簡易）。
 * null=キャンセル。
 */
export function promptAsync(
  title: string,
  message?: string,
  defaultValue = ''
): Promise<string | null> {
  if (Platform.OS === 'web') {
    const v = typeof window !== 'undefined' ? window.prompt(message ? `${title}\n${message}` : title, defaultValue) : null;
    return Promise.resolve(v);
  }
  if (Platform.OS === 'ios' && typeof (Alert as { prompt?: unknown }).prompt === 'function') {
    return new Promise((resolve) => {
      (Alert as unknown as {
        prompt: (t: string, m: string | undefined, cbs: { text: string; style?: string; onPress?: (v?: string) => void }[], type?: string, def?: string) => void;
      }).prompt(
        title,
        message,
        [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
          { text: 'OK', onPress: (v?: string) => resolve(v ?? '') },
        ],
        'plain-text',
        defaultValue
      );
    });
  }
  return Promise.resolve(defaultValue || null);
}

import { useEffect } from 'react';
import { Alert } from 'react-native';

/**
 * 原因調査用。JavaScript側で誰も受け取らなかったエラーを、画面に出して知らせる。
 *
 * リリース版のアプリは、エラーが起きても何も言わずに落ちるだけなので、
 * 何が起きたのか分からない。ここで横取りして文面を表示する。
 * 原因が分かったら外してよい。
 */
export function CrashReporter() {
  useEffect(() => {
    const globalAny = global as unknown as {
      ErrorUtils?: {
        getGlobalHandler: () => (e: unknown, isFatal?: boolean) => void;
        setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void;
      };
    };
    const utils = globalAny.ErrorUtils;
    if (!utils) return;

    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((error, isFatal) => {
      const e = error as { message?: string; stack?: string } | undefined;
      const message = e?.message ?? String(error);
      const where = (e?.stack ?? '').split('\n').slice(0, 6).join('\n');
      Alert.alert(
        isFatal ? 'エラーが起きました（致命的）' : 'エラーが起きました',
        `${message}\n\n${where}`
      );
      // 元の処理にも渡す。ただし致命的として扱うと、そのままアプリが終了してしまうので、
      // 文面を読む時間を作るために false で渡す。
      previous(error, false);
    });

    return () => utils.setGlobalHandler(previous);
  }, []);

  return null;
}

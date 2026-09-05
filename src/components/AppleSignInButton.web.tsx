import React from 'react';

/**
 * Web版の「Appleでサインイン」（表示しない）。
 * expo-apple-authentication はネイティブ専用のため、
 * Webバンドルに import 自体が入らないようファイルを分けている。
 */
export function AppleSignInButton(_props: {
  onLinked: (result: { changedUser: boolean }) => void;
  onError: (message: string) => void;
}) {
  return null;
}

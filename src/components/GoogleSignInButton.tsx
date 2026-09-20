import React from 'react';
import type { GoogleSignInButtonProps } from '@/components/GoogleSignInButton.types';

/**
 * ネイティブ版の「Googleで続ける」（いまは表示しない）。
 *
 * iOSには「Appleでサインイン」があるので1タップで済む。
 * Androidでも出すには、OAuthの画面をアプリ内ブラウザで開く仕組み
 * （expo-web-browser）とGoogle側の追加設定が要るため、あとから足す。
 */
export function GoogleSignInButton(_props: GoogleSignInButtonProps) {
  return null;
}

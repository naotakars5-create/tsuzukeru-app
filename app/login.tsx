import React from 'react';
import { AuthScreen } from '@/components/AuthScreen';

/**
 * 既存アカウントでのログイン。
 * 起動時に強制されることはなく、設定タブや「IDの登録」画面から開く。
 */
export default function LoginScreen() {
  return <AuthScreen />;
}

import React from 'react';
import { Stack } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';

/** ログイン/新規登録。未ログインのときはここへリダイレクトされる。 */
export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthScreen />
    </>
  );
}

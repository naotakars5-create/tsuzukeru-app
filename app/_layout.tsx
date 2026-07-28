import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/AppContext';
import { TimerBar } from '@/components/TimerBar';
import { colors } from '@/theme';

/**
 * アプリ全体のルートレイアウト。
 * AppProvider で状態を全画面に供給し、画面スタックを定義する。
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800', color: colors.text },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="goal-setup"
            options={{ title: '目標を設定', presentation: 'modal' }}
          />
          <Stack.Screen
            name="today"
            options={{ title: '今日の達成', presentation: 'card' }}
          />
          <Stack.Screen
            name="profile-edit"
            options={{ title: 'プロフィール編集', presentation: 'modal' }}
          />
          <Stack.Screen name="rival/[id]" options={{ title: 'プロフィール' }} />
          <Stack.Screen
            name="ignite"
            options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="share-card"
            options={{ title: '成果カード', presentation: 'modal' }}
          />
        </Stack>
        <TimerBar />
      </AppProvider>
    </SafeAreaProvider>
  );
}

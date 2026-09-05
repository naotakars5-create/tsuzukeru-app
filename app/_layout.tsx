import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { StripeGate } from '@/components/StripeGate';
import { TimerBar } from '@/components/TimerBar';
import { colors } from '@/theme';

/**
 * アプリ全体のルートレイアウト。
 *
 * 起動時にログイン画面は出さない。認証は裏で匿名アカウントとして始まり、
 * カードを登録するときに初めてIDの紐付けを求める
 * （App Store ガイドライン 5.1.1(i) への対応でもある）。
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <StripeGate>
          <AppProvider>
            <AuthLoading />
            <RootStack />
            <TimerBar />
          </AppProvider>
        </StripeGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** 認証の初期化中だけ、上にローディングを重ねる */
function AuthLoading() {
  const { loading } = useAuth();
  if (!loading) return null;
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function RootStack() {
  return (
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
      <Stack.Screen name="login" options={{ title: 'ログイン', presentation: 'modal' }} />
      <Stack.Screen name="goal-setup" options={{ title: '目標を設定', presentation: 'modal' }} />
      <Stack.Screen name="today" options={{ title: '今日の達成', presentation: 'card' }} />
      <Stack.Screen name="journal" options={{ title: '学習メモ', presentation: 'card' }} />
      <Stack.Screen
        name="profile-edit"
        options={{ title: 'プロフィール編集', presentation: 'modal' }}
      />
      <Stack.Screen name="rival/[id]" options={{ title: 'プロフィール' }} />
      <Stack.Screen
        name="communities"
        options={{ title: 'コミュニティを探す', presentation: 'modal' }}
      />
      <Stack.Screen name="community/[code]" options={{ title: 'コミュニティ' }} />
      <Stack.Screen
        name="ignite"
        options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="share-card" options={{ title: '成果カード', presentation: 'modal' }} />
      <Stack.Screen name="card-setup" options={{ title: '支払い方法', presentation: 'modal' }} />
      <Stack.Screen name="link-account" options={{ title: 'IDの登録' }} />
      <Stack.Screen name="legal/[doc]" options={{ title: '規約' }} />
    </Stack>
  );
}

const styles = {
  loading: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
} as const;

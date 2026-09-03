import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { AppProvider } from '@/context/AppContext';
import { StripeGate } from '@/components/StripeGate';
import { TimerBar } from '@/components/TimerBar';
import { colors } from '@/theme';

/**
 * アプリ全体のルートレイアウト。
 * ログイン状態でゲートし、未ログインなら AuthScreen のみを表示する
 * （カード登録・週次の自動課金判定にはアカウントが必須なため）。
 * Supabase の鍵が未設定のビルドではゲートせず、ローカル専用モードで起動する。
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { session, loading, backendEnabled } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // サーバー未設定のときはログインを求めず、そのままローカル専用モードで使えるようにする
  if (!session && backendEnabled) return <AuthScreen />;

  return <AppContent />;
}

/** StripeGate はカード登録・課金のUI（PaymentSheet）に必要。Web版は素通しする。 */
function AppContent() {
  return (
    <StripeGate>
      <AppProvider>
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
        </Stack>
        <TimerBar />
      </AppProvider>
    </StripeGate>
  );
}

const styles = {
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;

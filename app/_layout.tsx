import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { StripeGate } from '@/components/StripeGate';
import { TimerBar } from '@/components/TimerBar';
import { colors } from '@/theme';

/** ログインしていなくても開ける画面（ログイン自身と、規約類） */
const PUBLIC_SEGMENTS = ['login', 'legal'];

/**
 * アプリ全体のルートレイアウト。
 * 未ログインならログイン画面へ誘導する（カード登録・週次の自動課金判定に
 * アカウントが必須なため）。Supabase の鍵が未設定のビルドでは
 * ログインを求めず、ローカル専用モードで起動する。
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <StripeGate>
          <AppProvider>
            <AuthRedirect />
            <RootStack />
            <TimerBar />
          </AppProvider>
        </StripeGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** ログイン状態に応じて、行き先を入れ替える */
function AuthRedirect() {
  const { session, loading, backendEnabled } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // サーバー未設定のときはログインを求めない（ローカル専用モード）
    if (loading || !backendEnabled) return;
    const inPublic = PUBLIC_SEGMENTS.includes(segments[0] ?? '');
    if (!session && !inPublic) router.replace('/login');
    else if (session && segments[0] === 'login') router.replace('/');
  }, [session, loading, backendEnabled, segments, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return null;
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
      <Stack.Screen name="login" options={{ headerShown: false }} />
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

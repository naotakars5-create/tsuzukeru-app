import React from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { AppProvider } from '@/context/AppContext';
import { TimerBar } from '@/components/TimerBar';
import { colors } from '@/theme';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/**
 * アプリ全体のルートレイアウト。
 * ログイン状態でゲートし、未ログインなら AuthScreen のみを表示する
 * （カード登録・週次の自動課金判定にはアカウントが必須なため）。
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
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  return <AppContent />;
}

/** StripeProvider はカード登録・課金のUI（PaymentSheet）に必要。Web版はネイティブモジュールが無いため素通しする。 */
function AppContent() {
  const content = (
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
        <Stack.Screen
          name="card-setup"
          options={{ title: '支払い方法', presentation: 'modal' }}
        />
      </Stack>
      <TimerBar />
    </AppProvider>
  );

  if (Platform.OS === 'web' || !stripePublishableKey) return content;
  return <StripeProvider publishableKey={stripePublishableKey}>{content}</StripeProvider>;
}

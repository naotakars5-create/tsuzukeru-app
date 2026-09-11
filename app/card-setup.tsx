import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CardSetupPanel } from '@/components/CardSetupPanel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { CardOnFile } from '@/lib/billingClient';
import { loadCardOnboarding, saveCardOnboarding } from '@/storage';
import { weekStake } from '@/logic/billing';

/**
 * カード登録画面（案C: ここでは¥0。保存のみ）。
 *
 * 設定から開く通常の表示に加えて、目標を作った直後の「最後の1ステップ」としても開く
 * （/card-setup?onboarding=1）。そのときは登録しても飛ばしても、火がつく演出へ進む。
 *
 * 匿名のまま使っている人には、先にIDの登録をお願いする。
 * 請求先を確定させるためと、機種変更で請求の状況が宙に浮かないようにするため。
 * 中身は CardSetupPanel（ネイティブ/Webでファイルが分かれている）に委譲する。
 */
export default function CardSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const { backendEnabled, isAnonymous } = useAuth();
  const { goal } = useApp();

  const fromGoalSetup = params.onboarding === '1';
  // Webは Stripe の決済ページへ一度出るとURLの状態が消えるので、
  // 戻ってきたとき（?card=...）だけ、端末に残した印で続きだと判断する。
  const [returnedFromCheckout] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('card')
  );
  const [onboarding, setOnboarding] = useState(fromGoalSetup);
  const onboardingRef = useRef(fromGoalSetup);
  const [hasCard, setHasCard] = useState(false);

  useEffect(() => {
    const apply = (active: boolean) => {
      onboardingRef.current = active;
      setOnboarding(active);
    };
    if (fromGoalSetup) {
      apply(true);
      void saveCardOnboarding(true);
      return;
    }
    if (!returnedFromCheckout) {
      // 設定などから普通に開いたとき。中断したままの印が残っていれば消しておく
      void saveCardOnboarding(false);
      return;
    }
    let alive = true;
    void loadCardOnboarding().then((active) => {
      if (alive) apply(active);
    });
    return () => {
      alive = false;
    };
  }, [fromGoalSetup, returnedFromCheckout]);

  /** 登録ステップを終えてホーム（火がつく演出）へ */
  const finish = useCallback(() => {
    onboardingRef.current = false;
    void saveCardOnboarding(false);
    router.replace('/ignite');
  }, [router]);

  const onRegistered = useCallback(() => {
    if (onboardingRef.current) finish();
  }, [finish]);

  const onCardChange = useCallback((card: CardOnFile | null) => {
    setHasCard(!!card);
  }, []);

  const header = onboarding ? (
    <Stack.Screen
      options={{ title: 'あと1ステップ', headerBackVisible: false, gestureEnabled: false }}
    />
  ) : null;

  // 目標を作った直後だけ出す前置きと「あとで」の導線
  const intro = onboarding ? (
    <View style={styles.intro}>
      <View style={styles.introHead}>
        <Ionicons name="flame" size={18} color={colors.primary} />
        <Text style={styles.introTitle}>最後に、覚悟をカードに預ける</Text>
      </View>
      <Text style={styles.introText}>
        {goal
          ? `「${goal.name}」を4週間。達成した週は¥0、サボった週だけ ¥${weekStake(
              goal.deposit,
              goal.durationWeeks || 4
            ).toLocaleString()} が後から引き落とされます。`
          : '達成した週は¥0、サボった週ぶんだけ後から引き落とされます。'}
      </Text>
      <Text style={styles.introText}>いま登録しても、この時点では1円も課金されません。</Text>
    </View>
  ) : null;

  const footer = onboarding ? (
    <PrimaryButton
      label={hasCard ? 'この覚悟で始める' : 'あとで登録して始める'}
      icon={hasCard ? 'flame' : undefined}
      variant={hasCard ? 'primary' : 'ghost'}
      onPress={finish}
    />
  ) : null;

  if (!backendEnabled) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {header}
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.centerText}>
            この端末だけのモードで動いています。{'\n'}カード登録は利用できません。
          </Text>
        </View>
        {footer}
      </ScrollView>
    );
  }

  if (isAnonymous) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {header}
        {intro}
        <Card>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="person-circle" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>先にIDを登録してください</Text>
              <Text style={styles.desc}>
                カードを登録するには、IDが必要です。{'\n'}
                機種変更やアプリの再インストールをしても、記録と請求の状況が引き継がれます。
              </Text>
            </View>
          </View>
          <PrimaryButton
            label="IDを登録する"
            icon="shield-checkmark"
            onPress={() => router.push('/link-account')}
            style={{ marginTop: spacing.lg }}
          />
          <Text style={styles.helper}>
            ※ いまの勉強記録は、そのまま引き継がれます。
          </Text>
        </Card>
        {footer}
      </ScrollView>
    );
  }

  return (
    <>
      {header}
      <CardSetupPanel
        intro={intro}
        footer={footer}
        onRegistered={onRegistered}
        onCardChange={onCardChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centerText: { color: colors.textSub, fontSize: font.sub, textAlign: 'center', lineHeight: 21 },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: font.heading, fontWeight: '900', color: colors.text },
  desc: { fontSize: font.small, color: colors.textSub, marginTop: 4, lineHeight: 19 },
  helper: { marginTop: spacing.md, color: colors.textMuted, fontSize: font.small, lineHeight: 17 },

  intro: {
    backgroundColor: 'rgba(198,244,50,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.3)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  introTitle: { fontSize: font.body, fontWeight: '900', color: colors.text },
  introText: { fontSize: font.small, color: colors.textSub, lineHeight: 18 },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, NewGoalInput } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { colors, font, radius, spacing } from '@/theme';
import { weekStake } from '@/logic/billing';
import { notifyAsync } from '@/logic/confirm';
import { categoryOf } from '@/logic/category';
import { fetchCardOnFile, CardOnFile } from '@/lib/billingClient';
import { useCardRegistration } from '@/lib/cardRegistration';
import { GoalRegisterError } from '@/lib/sync';
import { loadPendingGoal, clearPendingGoal } from '@/storage';

/**
 * 「コミットして始める」画面。目標フォームの直後に通る、最後の1画面。
 *
 * ここで済ませるのは2つだけ。
 *  1. 復元用のメールアドレスを1つ（パスワードは作らない。iOSはAppleで1タップでも可）
 *  2. カードの登録（登録時は¥0）
 * 両方が済んだときに初めて目標を作る。カードなしで目標が始まる「漏れ」を、
 * 画面の順番とサーバー側（create-goal の card_required）の両方で防いでいる。
 *
 * すでに使われているメールだったら、その場でコードを送ってログインし、
 * 前のアカウント（登録済みのカードも）を引き継ぐ。
 */
export default function CommitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ card?: string }>();
  const { createGoal } = useApp();
  const { recoveryEmail, emailPending, setRecoveryEmail, sendLoginCode, verifyLoginCode } =
    useAuth();
  const { register } = useCardRegistration();

  const [pending, setPending] = useState<NewGoalInput | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [card, setCard] = useState<CardOnFile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Webで Stripe から戻ってきたときの結果（?card=success / ?card=cancel）
  const [checkoutResult] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = new URLSearchParams(window.location.search).get('card');
    if (v) window.history.replaceState({}, '', window.location.pathname);
    return v ?? params.card ?? null;
  });

  useEffect(() => {
    let alive = true;
    loadPendingGoal<NewGoalInput>().then((g) => {
      if (alive) setPending(g);
    });
    return () => {
      alive = false;
    };
  }, []);

  const loadCard = useCallback(async () => {
    const found = await fetchCardOnFile();
    setCard(found);
    return found;
  }, []);

  useEffect(() => {
    void loadCard();
  }, [loadCard, recoveryEmail]);

  /** 目標を作って「火がつく」演出へ。サーバーが断ったらここで止まる */
  const finalize = useCallback(
    async (input: NewGoalInput) => {
      try {
        await createGoal(input);
      } catch (e) {
        if (e instanceof GoalRegisterError && e.code === 'card_required') {
          setError('カードの登録がまだ確認できません。少し待ってから、もう一度お試しください。');
          void loadCard();
          return false;
        }
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
      await clearPendingGoal();
      router.replace('/ignite');
      return true;
    },
    [createGoal, loadCard, router]
  );

  // Webで Stripe の登録を終えて戻ってきたら、そのまま目標を作る
  useEffect(() => {
    if (!pending || checkoutResult !== 'success') return;
    setBusy(true);
    void finalize(pending).finally(() => setBusy(false));
    // finalize は pending が読めた最初の1回だけ走らせたい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, checkoutResult]);

  useEffect(() => {
    if (checkoutResult === 'cancel') setError('カード登録が中断されました。もう一度お試しください。');
  }, [checkoutResult]);

  /** メール → カード → 目標作成、を1本で進める */
  const onStart = async () => {
    if (!pending) return;
    setError(null);
    setBusy(true);
    try {
      if (!recoveryEmail) {
        const mail = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          setError('メールアドレスの形式が正しくありません。');
          return;
        }
        const result = await setRecoveryEmail(mail);
        if (result === 'EMAIL_TAKEN') {
          const sendErr = await sendLoginCode(mail);
          if (sendErr) {
            setError(sendErr);
            return;
          }
          setCodeSentTo(mail);
          return;
        }
        if (result) {
          setError(result);
          return;
        }
      }
      await continueWithCard();
    } finally {
      setBusy(false);
    }
  };

  /** 届いたコードでログインして、前のアカウントを引き継ぐ */
  const onVerifyCode = async () => {
    if (!codeSentTo) return;
    setError(null);
    setBusy(true);
    try {
      const err = await verifyLoginCode(codeSentTo, code);
      if (err) {
        setError(err);
        return;
      }
      setCodeSentTo(null);
      await continueWithCard();
    } finally {
      setBusy(false);
    }
  };

  /** カードがあれば目標作成、なければ登録してから目標作成 */
  const continueWithCard = async () => {
    if (!pending) return;
    const existing = await loadCard();
    if (existing) {
      await finalize(pending);
      return;
    }
    try {
      const result = await register('commit');
      if (result === 'registered') await finalize(pending);
      // canceled: 何もしない / redirected: Stripe の画面へ移動中
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onChangeCard = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await register('commit');
      if (result === 'registered') await loadCard();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (pending === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (pending === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'コミットして始める' }} />
        <Ionicons name="flag-outline" size={40} color={colors.textMuted} />
        <Text style={styles.centerText}>目標の入力から始めてください。</Text>
        <PrimaryButton
          label="目標を設定する"
          icon="flame"
          onPress={() => router.replace('/goal-setup')}
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const stake = weekStake(pending.deposit, pending.durationWeeks || 4);
  const startLabel = card ? 'この覚悟で始める' : 'カードを登録して始める（¥0）';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'コミットして始める' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 何にコミットするのか */}
        <View style={styles.summary}>
          <View style={styles.summaryHead}>
            <Ionicons name="flame" size={18} color={colors.primary} />
            <Text style={styles.summaryTitle}>{pending.name}</Text>
          </View>
          <Text style={styles.summaryMeta}>
            {categoryOf(pending.category).label}・4週間・コミット ¥{pending.deposit.toLocaleString()}
          </Text>
          <View style={styles.outcomeRow}>
            <View style={styles.outcome}>
              <Text style={[styles.outcomeAmount, { color: colors.success }]}>¥0</Text>
              <Text style={styles.outcomeLabel}>達成した週</Text>
            </View>
            <View style={styles.outcome}>
              <Text style={[styles.outcomeAmount, { color: colors.danger }]}>
                ¥{stake.toLocaleString()}
              </Text>
              <Text style={styles.outcomeLabel}>サボった週だけ</Text>
            </View>
          </View>
        </View>

        {/* 1. 復元用のメール */}
        <Card>
          <View style={styles.stepHead}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.label}>復元用のメールアドレス</Text>
            {recoveryEmail ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            ) : null}
          </View>
          {recoveryEmail ? (
            <>
              <Text style={styles.fixedValue}>{recoveryEmail}</Text>
              <Text style={styles.helper}>
                {emailPending
                  ? '確認メールを送りました。リンクを開くと、機種変更しても記録と請求を引き継げます。いまは開かなくても先に進めます。'
                  : '機種変更しても、このメールに届くコードで記録と請求を引き継げます。'}
              </Text>
            </>
          ) : codeSentTo ? (
            <>
              <Text style={styles.helper}>
                {codeSentTo} はすでに登録されています。届いた6桁のコードを入力すると、
                前の記録とカードを引き継げます。
              </Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={8}
              />
              <Pressable
                onPress={() => {
                  setCodeSentTo(null);
                  setCode('');
                  setError(null);
                }}
                hitSlop={8}
                style={{ marginTop: spacing.sm }}
              >
                <Text style={styles.link}>別のメールアドレスを使う</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.helper}>
                パスワードは要りません。機種変更やアプリの入れ直しのとき、
                このメールに届くコードで記録と請求の状況を引き継ぎます。
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <AppleSignInButton
                onLinked={() => setError(null)}
                onError={(m) => setError(m)}
              />
            </>
          )}
        </Card>

        {/* 2. カード */}
        <Card>
          <View style={styles.stepHead}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.label}>支払い方法（登録時は¥0）</Text>
            {card ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
          </View>
          {card === undefined ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.primary} />
          ) : card ? (
            <View style={styles.cardRow}>
              <Ionicons name="card-outline" size={20} color={colors.text} />
              <Text style={styles.cardText}>
                {(card.cardBrand ?? 'カード').toUpperCase()} •••• {card.cardLast4}
              </Text>
              <Pressable onPress={onChangeCard} hitSlop={8} disabled={busy}>
                <Text style={styles.link}>変更</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.helper}>
              {Platform.OS === 'web'
                ? 'ボタンを押すと Stripe の安全な決済ページでカードを登録し、この画面に戻ってきます。'
                : 'ボタンを押すとカード入力が開きます。'}
              {'\n'}未達の週だけ、このカードから自動で引き落とされます。
              カード情報は Stripe 社が保管し、このアプリでは保存しません。
            </Text>
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {codeSentTo ? (
          <PrimaryButton
            label="コードを確認して引き継ぐ"
            icon="shield-checkmark"
            onPress={onVerifyCode}
            loading={busy}
            disabled={code.trim().length < 6}
          />
        ) : (
          <PrimaryButton label={startLabel} icon="flame" onPress={onStart} loading={busy} />
        )}

        <Text style={styles.consent}>
          始めると、
          <Text style={styles.consentLink} onPress={() => router.push('/legal/terms')}>
            利用規約
          </Text>
          と
          <Text style={styles.consentLink} onPress={() => router.push('/legal/privacy')}>
            プライバシーポリシー
          </Text>
          に同意したものとみなします。未達の週にのみ料金が発生します。
        </Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centerText: { color: colors.textSub, fontSize: font.sub, textAlign: 'center', lineHeight: 21 },

  summary: {
    backgroundColor: 'rgba(198,244,50,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.3)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryTitle: { flex: 1, fontSize: font.heading, fontWeight: '900', color: colors.text },
  summaryMeta: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
  outcomeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  outcome: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  outcomeAmount: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  outcomeLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '700' },

  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: '900', color: colors.onAccent },
  label: { flex: 1, fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  helper: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  fixedValue: { marginTop: spacing.sm, fontSize: font.body, fontWeight: '800', color: colors.text },
  input: {
    marginTop: spacing.md,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: { color: colors.primary, fontSize: font.small, fontWeight: '800' },
  cardRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardText: { flex: 1, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  error: { color: colors.danger, fontSize: font.small, lineHeight: 18 },
  consent: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, textAlign: 'center' },
  consentLink: { color: colors.primary, fontWeight: '700' },
});

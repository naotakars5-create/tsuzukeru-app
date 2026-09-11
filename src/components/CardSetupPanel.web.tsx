import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, spacing } from '@/theme';
import { requestCardSetupSession, fetchCardOnFile, CardOnFile } from '@/lib/billingClient';
import { notifyAsync } from '@/logic/confirm';
import type { CardSetupPanelProps } from '@/components/CardSetupPanel.types';

/**
 * Web版のカード登録パネル。
 * ネイティブの PaymentSheet が使えないため、Stripe のホスト型 Checkout に遷移する。
 * どちらの経路でも、登録完了は setup_intent.succeeded の Webhook で反映される。
 *
 * ネイティブ版と同じく、前置き（intro）・下に置く操作（footer）・
 * 登録できたときの通知（onRegistered）を差し込める。
 */
export function CardSetupPanel({ intro, footer, onRegistered, onCardChange }: CardSetupPanelProps) {
  const [card, setCard] = useState<CardOnFile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // 呼び出し側が毎回新しい関数を渡しても読み込みが繰り返されないよう、参照で持つ
  const callbacks = useRef({ onRegistered, onCardChange });
  callbacks.current = { onRegistered, onCardChange };

  const load = useCallback(async () => {
    const found = await fetchCardOnFile();
    setCard(found);
    callbacks.current.onCardChange?.(found);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Checkout から戻ってきたときの表示（?card=success / ?card=cancel）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const status = new URLSearchParams(window.location.search).get('card');
    if (!status) return;
    // 同じ通知が再表示されないよう、クエリを消しておく
    window.history.replaceState({}, '', window.location.pathname);
    if (status === 'success') {
      notifyAsync('カードを登録しました', '未達の週だけ、このカードから自動で引き落とされます。');
      // Webhook の反映に少し間があるので、待ってから読み直す
      setTimeout(() => void load(), 1500);
      callbacks.current.onRegistered?.();
    }
  }, [load]);

  const onRegister = async () => {
    setBusy(true);
    try {
      const url = await requestCardSetupSession();
      window.location.href = url;
    } catch (e) {
      notifyAsync('エラーが発生しました', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {intro}
      <Card>
        <View style={styles.head}>
          <View style={styles.icon}>
            <Ionicons name="card" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>支払い方法</Text>
            <Text style={styles.desc}>
              達成した週は¥0（手数料免除）。未達の週だけ、登録したカードから自動で引き落とされます。
            </Text>
          </View>
        </View>

        {card === undefined ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />
        ) : card ? (
          <View style={styles.cardRow}>
            <Ionicons name="card-outline" size={20} color={colors.text} />
            <Text style={styles.cardText}>
              {(card.cardBrand ?? 'カード').toUpperCase()} •••• {card.cardLast4}
            </Text>
            <View style={styles.registeredTag}>
              <Text style={styles.registeredText}>登録済み</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noCard}>まだカードが登録されていません。</Text>
        )}

        <PrimaryButton
          label={card ? 'カードを変更する' : 'カードを登録する'}
          icon="card"
          onPress={onRegister}
          loading={busy}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={styles.helper}>
          ※ ここでは課金されません（¥0）。Stripeの安全な決済ページへ移動します。
          カード情報はStripe社が保管し、このアプリでは保存しません。
        </Text>
      </Card>
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
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
  desc: { fontSize: font.small, color: colors.textSub, marginTop: 3, lineHeight: 18 },
  cardRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: spacing.md,
  },
  cardText: { flex: 1, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  registeredTag: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  registeredText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  noCard: { marginTop: spacing.lg, color: colors.textSub, fontSize: font.sub },
  helper: { marginTop: spacing.md, color: colors.textMuted, fontSize: font.small, lineHeight: 17 },
});

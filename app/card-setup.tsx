import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, spacing } from '@/theme';
import { requestCardSetup, fetchCardOnFile, CardOnFile } from '@/lib/billingClient';
import { notifyAsync } from '@/logic/confirm';

/**
 * カード登録画面（案C: ここでは¥0。保存のみ）。
 * 達成した週は課金されず、未達の週だけ後からこのカードに自動課金される。
 */
export default function CardSetupScreen() {
  const [card, setCard] = useState<CardOnFile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setCard(await fetchCardOnFile());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Ionicons name="phone-portrait-outline" size={40} color={colors.textMuted} />
          <Text style={styles.webNote}>
            カード登録はスマホアプリ版でのみご利用いただけます。{'\n'}
            Web版では今のところ非対応です。
          </Text>
        </View>
      </View>
    );
  }

  return <NativeCardSetup card={card} busy={busy} setBusy={setBusy} reload={load} />;
}

function NativeCardSetup({
  card,
  busy,
  setBusy,
  reload,
}: {
  card: CardOnFile | null | undefined;
  busy: boolean;
  setBusy: (v: boolean) => void;
  reload: () => Promise<void>;
}) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const onRegister = async () => {
    setBusy(true);
    try {
      const { clientSecret } = await requestCardSetup();
      const initResult = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: '覚悟の勉強',
        style: 'alwaysDark',
      });
      if (initResult.error) {
        notifyAsync('準備に失敗しました', initResult.error.message);
        return;
      }
      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code !== 'Canceled') {
          notifyAsync('登録できませんでした', presentResult.error.message);
        }
        return;
      }
      notifyAsync('カードを登録しました', '未達の週だけ、このカードから自動で引き落とされます。');
      await reload();
    } catch (e) {
      notifyAsync('エラーが発生しました', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
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
          ※ ここでは課金されません（¥0）。カード情報はStripe社が安全に保管し、このアプリでは保存しません。
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  webNote: { color: colors.textSub, fontSize: font.sub, textAlign: 'center', lineHeight: 21 },
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

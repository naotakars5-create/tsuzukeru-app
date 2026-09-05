import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { CardOnFileRow } from '@/components/CardOnFileRow';
import { colors, font, spacing } from '@/theme';
import { requestCardSetupUrl, fetchCardOnFile, CardOnFile } from '@/lib/billingClient';
import { notifyAsync } from '@/logic/confirm';

/**
 * Web版のカード登録パネル。カード登録ができるのはここだけ。
 *
 * 入力自体は Stripe がホストする Checkout ページで行うため、このアプリはカード番号に触れない。
 * ネイティブ版に同じ画面を置いていないのは、App Store 審査ガイドライン 3.1.1 が
 * iOSアプリ内での外部決済手段の提供を認めていないため（ネイティブ版は状態表示のみ）。
 */
export function CardSetupPanel() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [card, setCard] = useState<CardOnFile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 登録直後は Stripe の Webhook が届くまで数秒かかる。
      // 「登録したのに未登録と出る」のを防ぐため、戻ってきた直後だけ数回やり直す。
      const attempts = status === 'success' ? 6 : 1;
      for (let i = 0; i < attempts; i++) {
        const found = await fetchCardOnFile();
        if (cancelled) return;
        setCard(found);
        if (found) return;
        if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const onRegister = async () => {
    setBusy(true);
    try {
      // Stripe のカード入力ページへ移動する（成功／中止どちらでもこの画面に戻ってくる）
      window.location.href = await requestCardSetupUrl();
    } catch (e) {
      notifyAsync('エラーが発生しました', e instanceof Error ? e.message : String(e));
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

        {status === 'cancel' && (
          <Text style={styles.canceled}>カードの登録は中止されました。</Text>
        )}

        <CardOnFileRow card={card} />

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
  canceled: { marginTop: spacing.md, color: colors.textSub, fontSize: font.small },
  helper: { marginTop: spacing.md, color: colors.textMuted, fontSize: font.small, lineHeight: 17 },
});

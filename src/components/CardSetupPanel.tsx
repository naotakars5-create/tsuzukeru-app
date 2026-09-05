import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { CardOnFileRow } from '@/components/CardOnFileRow';
import { colors, font, spacing } from '@/theme';
import { fetchCardOnFile, CardOnFile } from '@/lib/billingClient';

/**
 * ネイティブ版（iOS/Android）の支払い方法パネル。表示専用で、登録・変更はできない。
 *
 * App Store 審査ガイドライン 3.1.1 は、iOSアプリ内で外部の決済手段
 * （Stripe のカード入力画面など）を提供することを認めていない。
 * そのため実際の登録は Web 版（CardSetupPanel.web.tsx）だけに置き、
 * ここでは登録済みかどうかと、課金のルールだけを示す。
 */
export function CardSetupPanel() {
  const [card, setCard] = useState<CardOnFile | null | undefined>(undefined);

  const load = useCallback(async () => {
    setCard(await fetchCardOnFile());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

        <CardOnFileRow card={card} />

        <Text style={styles.helper}>
          支払い方法の登録・変更は、このアプリでは行えません。ウェブ版からお手続きいただけます。
        </Text>
        <Text style={styles.helper}>
          ※ カード情報はStripe社が安全に保管し、このアプリでは保存しません。
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
  helper: { marginTop: spacing.md, color: colors.textMuted, fontSize: font.small, lineHeight: 17 },
});

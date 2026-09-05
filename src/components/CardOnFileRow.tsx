import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '@/theme';
import { CardOnFile } from '@/lib/billingClient';

/**
 * 登録済みカードの表示行（読み込み中 / 未登録 / 登録済み）。
 * ネイティブ版とWeb版のカード画面で共通して使う。
 */
export function CardOnFileRow({ card }: { card: CardOnFile | null | undefined }) {
  if (card === undefined) {
    return <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />;
  }

  if (!card) {
    return <Text style={styles.noCard}>まだカードが登録されていません。</Text>;
  }

  return (
    <View style={styles.cardRow}>
      <Ionicons name="card-outline" size={20} color={colors.text} />
      <Text style={styles.cardText}>
        {(card.cardBrand ?? 'カード').toUpperCase()} •••• {card.cardLast4}
      </Text>
      <View style={styles.registeredTag}>
        <Text style={styles.registeredText}>登録済み</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

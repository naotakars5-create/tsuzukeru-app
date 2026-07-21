import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RankTier } from '@/types';
import { colors, font, radius, spacing } from '@/theme';

/** ランク（称号）を絵文字つきで表示するバッジ。 */
export function RankBadge({ rank, size = 'md' }: { rank: RankTier; size?: 'sm' | 'md' | 'lg' }) {
  const emojiSize = size === 'lg' ? 44 : size === 'sm' ? 20 : 28;
  const labelSize = size === 'lg' ? font.heading : size === 'sm' ? font.small : font.body;
  return (
    <View style={[styles.badge, { borderColor: rank.color }]}>
      <Text style={{ fontSize: emojiSize }}>{rank.emoji}</Text>
      <Text style={[styles.label, { fontSize: labelSize, color: rank.color }]}>
        {rank.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '800' },
});

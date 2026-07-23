import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RankTier } from '@/types';
import { colors, font, radius, spacing } from '@/theme';

/** ランク（称号）をベクターアイコンつきで表示するバッジ。 */
export function RankBadge({ rank, size = 'md' }: { rank: RankTier; size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 34 : size === 'sm' ? 16 : 22;
  const labelSize = size === 'lg' ? font.heading : size === 'sm' ? font.small : font.body;
  return (
    <View style={[styles.badge, { borderColor: rank.color }]}>
      <Ionicons name={rank.icon} size={iconSize} color={rank.color} />
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
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '800' },
});

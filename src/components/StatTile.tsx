import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

/** 数値を大きく見せる小さなタイル（連続日数・ポイント等）。 */
export function StatTile({
  value,
  label,
  emoji,
  accent = colors.primary,
}: {
  value: string | number;
  label: string;
  emoji?: string;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 20, marginBottom: 2 },
  value: { fontSize: font.title, fontWeight: '900' },
  label: { fontSize: font.small, color: colors.textSub, marginTop: 2, fontWeight: '600' },
});

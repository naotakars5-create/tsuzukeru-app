import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconName } from '@/types';
import { colors, font, radius, spacing } from '@/theme';

/**
 * 数値タイル。色付きの角丸スクエアにアイコンを載せる
 * （参考デザインの「カロリー/アクティブ時間」チップのテイスト）。
 */
export function StatTile({
  value,
  label,
  icon,
  accent = colors.primary,
}: {
  value: string | number;
  label: string;
  icon?: IconName;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      {icon ? (
        <View style={[styles.iconSquare, { backgroundColor: `${accent}1F` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      ) : null}
      <Text style={styles.value} numberOfLines={1}>
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
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconSquare: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: { fontSize: font.heading, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  label: { fontSize: font.small, color: colors.textSub, marginTop: 2, fontWeight: '600' },
});

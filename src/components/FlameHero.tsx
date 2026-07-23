import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconName } from '@/types';
import { radius, spacing, colors, shadow } from '@/theme';

/**
 * ヒーローカード。深いダークの面に、右上へうっすらライムの
 * ウォーターマークアイコンを重ねたモダンなカード。
 */
export function FlameHero({
  children,
  style,
  icon = 'flame',
  iconSize = 110,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  icon?: IconName | null;
  iconSize?: number;
}) {
  return (
    <View style={[styles.hero, style]}>
      {icon ? (
        <Ionicons name={icon} size={iconSize} color={colors.primary} style={styles.watermark} />
      ) : null}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  inner: { position: 'relative', zIndex: 2 },
  watermark: {
    position: 'absolute',
    right: -16,
    top: -18,
    opacity: 0.08,
    zIndex: 1,
    transform: [{ rotate: '12deg' }],
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IconName } from '@/types';
import { gradients, radius, spacing, colors, shadow } from '@/theme';

/**
 * 炎のグラデーションを敷いたヒーローカード（デザインの主役）。
 * 右上にうっすらベクターアイコンを重ねて熱量を演出する。
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
    <LinearGradient
      colors={gradients.flame}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.hero, style]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize}
          color={colors.onFlame}
          style={styles.watermark}
        />
      ) : null}
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.lg,
    ...shadow.glow,
  },
  inner: { position: 'relative', zIndex: 2 },
  watermark: {
    position: 'absolute',
    right: -14,
    top: -18,
    opacity: 0.16,
    zIndex: 1,
    transform: [{ rotate: '12deg' }],
  },
});

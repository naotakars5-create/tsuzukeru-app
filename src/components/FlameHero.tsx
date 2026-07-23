import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radius, spacing, colors, shadow } from '@/theme';

/**
 * 炎のグラデーションを敷いたヒーローカード（案Bの主役）。
 * 右上にうっすら炎の絵文字を重ねて熱量を演出する。
 */
export function FlameHero({
  children,
  style,
  showFlame = true,
  flameSize = 92,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  showFlame?: boolean;
  flameSize?: number;
}) {
  return (
    <LinearGradient
      colors={gradients.flame}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.hero, style]}
    >
      {showFlame && (
        <Text style={[styles.flame, { fontSize: flameSize }]} allowFontScaling={false}>
          🔥
        </Text>
      )}
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
  flame: {
    position: 'absolute',
    right: -8,
    top: -14,
    opacity: 0.16,
    color: colors.onFlame,
    zIndex: 1,
  },
});

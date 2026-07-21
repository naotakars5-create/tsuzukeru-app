import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius } from '@/theme';

/**
 * 進捗バー。値が変わると滑らかに伸びて「積み上がる」気持ちよさを演出。
 * ratio は 0..1。
 */
export function ProgressBar({
  ratio,
  height = 12,
  color = colors.primary,
  track = colors.track,
}: {
  ratio: number;
  height?: number;
  color?: string;
  track?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: track, borderRadius: height }]}>
      <Animated.View
        style={[styles.fill, { width, backgroundColor: color, borderRadius: height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});

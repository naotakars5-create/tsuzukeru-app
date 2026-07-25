import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/theme';

/**
 * 進捗バー。値が変わると滑らかに伸びて「積み上がる」気持ちよさを演出。
 * ratio は 0..1。塗りは炎のグラデーション。
 */
export function ProgressBar({
  ratio,
  height = 10,
  solidColor,
  track = colors.surfaceAlt,
}: {
  ratio: number;
  height?: number;
  /** 指定すると単色。未指定なら炎グラデ */
  solidColor?: string;
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
      <Animated.View style={[styles.fill, { width, borderRadius: height }]}>
        {solidColor ? (
          <View style={[styles.solid, { backgroundColor: solidColor, borderRadius: height }]} />
        ) : (
          <LinearGradient
            colors={gradients.flameSoft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.solid, { borderRadius: height }]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
  solid: { flex: 1 },
});

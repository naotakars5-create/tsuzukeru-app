import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * 円形プログレスリング（デザインの主役）。
 * ratio 0..1 をライムのリングで表示し、中央に children を重ねる。
 */
export function ProgressRing({
  ratio,
  size = 128,
  strokeWidth = 11,
  color = colors.primary,
  track = colors.surfaceAlt,
  children,
}: {
  ratio: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const anim = useRef(new Animated.Value(0)).current;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      setOffset(circumference * (1 - value));
    });
    Animated.timing(anim, {
      toValue: clamped,
      duration: 700,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [clamped, anim, circumference]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
});

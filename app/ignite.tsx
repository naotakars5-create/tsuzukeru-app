import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Art } from '@/components/Art';
import { colors, font, radius, spacing } from '@/theme';

const { width } = Dimensions.get('window');

/**
 * 目標作成直後の「火がつく」演出（最初の60秒の体験を強くする）。
 * ヒノコが弾けるように現れ、光の輪が広がり、火の粉が舞い上がる。数秒後にホームへ。
 */
export default function IgniteScreen() {
  const router = useRouter();
  const { goal } = useApp();

  const mascotScale = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(18)).current;
  const sparks = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 0.82,
      delay: Math.random() * 700,
      rise: 240 + Math.random() * 160,
      size: 5 + Math.random() * 6,
      warm: i % 3 === 0,
      progress: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mascotScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    ).start();

    sparks.forEach((s) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(s.progress, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(s.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    const t = setTimeout(() => router.replace('/'), 3000);
    return () => clearTimeout(t);
  }, []);

  const glowStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] }),
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
  };
  const burstStyle = {
    opacity: burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.3, 0] }),
    transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.2, 3.2] }) }],
  };

  return (
    <View style={styles.screen}>
      {/* 光の輪の広がり（一度だけ） */}
      <Animated.View style={[styles.burstRing, burstStyle]} pointerEvents="none" />

      {/* 火の粉 */}
      {sparks.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.warm ? colors.orange : colors.ember,
              transform: [
                { translateX: s.x },
                { translateY: s.progress.interpolate({ inputRange: [0, 1], outputRange: [60, -s.rise] }) },
                { scale: s.progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0.15] }) },
              ],
              opacity: s.progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.85, 0] }),
            },
          ]}
        />
      ))}

      {/* 発光 */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

      {/* 炎が弾けるように燃え上がる */}
      <Animated.View style={{ transform: [{ scale: mascotScale }] }}>
        <Art name="burst" size={260} />
      </Animated.View>

      {/* コピー */}
      <Animated.View style={{ opacity: textOp, transform: [{ translateY: textY }], alignItems: 'center' }}>
        <Text style={styles.title}>火がついた。</Text>
        {goal?.name ? <Text style={styles.goal}>{goal.name}</Text> : null}
        <Text style={styles.sub}>この火を、絶やすな。</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
    top: '50%',
    marginTop: -210,
  },
  burstRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.primary,
    top: '50%',
    marginTop: -170,
  },
  spark: { position: 'absolute', top: '50%' },
  title: { fontSize: font.hero - 6, fontWeight: '900', color: colors.text, marginTop: spacing.xl, letterSpacing: -1 },
  goal: { fontSize: font.heading, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  sub: { fontSize: font.body, color: colors.textSub, marginTop: spacing.md, fontWeight: '700' },
});

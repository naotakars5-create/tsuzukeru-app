import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { MatchIgnite } from '@/components/MatchIgnite';
import { colors, font, spacing } from '@/theme';

const { width } = Dimensions.get('window');

/**
 * 目標作成直後の「火がつく」演出（最初の60秒の体験を強くする）。
 * マッチが現れ、先端に炎が灯り、火の粉が舞い、コピーが浮かび上がる。数秒後にホームへ。
 */
export default function IgniteScreen() {
  const router = useRouter();
  const { goal } = useApp();

  const matchOp = useRef(new Animated.Value(0)).current;
  const matchY = useRef(new Animated.Value(24)).current;
  const flameScale = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;
  const sparks = useRef(
    Array.from({ length: 14 }, () => ({
      x: (Math.random() - 0.5) * width * 0.7,
      delay: Math.random() * 500,
      progress: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(matchOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(matchY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.spring(flameScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    sparks.forEach((s) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(s.progress, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(s.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    const t = setTimeout(() => router.replace('/'), 2800);
    return () => clearTimeout(t);
  }, []);

  const glowStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }),
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
  };

  return (
    <View style={styles.screen}>
      {/* 火の粉 */}
      {sparks.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              transform: [
                { translateX: s.x },
                { translateY: s.progress.interpolate({ inputRange: [0, 1], outputRange: [40, -260] }) },
                { scale: s.progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0.2] }) },
              ],
              opacity: s.progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
            },
          ]}
        />
      ))}

      {/* 光 */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* マッチ点火 */}
      <Animated.View style={{ opacity: matchOp, transform: [{ translateY: matchY }] }}>
        <MatchIgnite flameScale={flameScale} />
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primary,
    top: '50%',
    marginTop: -190,
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ember,
    top: '50%',
  },
  title: { fontSize: font.hero - 6, fontWeight: '900', color: colors.text, marginTop: spacing.xl },
  goal: { fontSize: font.heading, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  sub: { fontSize: font.body, color: colors.textSub, marginTop: spacing.md, fontWeight: '600' },
});

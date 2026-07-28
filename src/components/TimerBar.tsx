import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import { formatStopwatch } from '@/logic/time';

/**
 * 画面下部に常駐する「計測中」バー。
 * どの画面にいても勉強タイマーが動いていることが分かり、ここから停止できる。
 * タイマー画面(/today)にいるときは重複するので隠す。
 */
export function TimerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { timerStartedAt, stopTimer } = useApp();
  const [now, setNow] = useState(Date.now());
  const dot = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!timerStartedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timerStartedAt]);

  useEffect(() => {
    if (!timerStartedAt) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [timerStartedAt]);

  if (!timerStartedAt) return null;
  if (pathname === '/today') return null;

  const elapsedSec = Math.floor((now - timerStartedAt) / 1000);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.bar} onPress={() => router.push('/today')}>
        <Animated.View style={[styles.dot, { opacity: dot }]} />
        <Text style={styles.label}>勉強中</Text>
        <Text style={styles.time}>{formatStopwatch(elapsedSec)}</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.stopBtn} onPress={() => stopTimer()} hitSlop={8}>
          <Ionicons name="stop" size={14} color={colors.onAccent} />
          <Text style={styles.stopText}>停止</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'web' ? 84 : 92,
    alignItems: 'center',
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '92%',
    maxWidth: 520,
    backgroundColor: '#1C232C',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  time: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  stopText: { fontSize: 12, fontWeight: '900', color: colors.onAccent },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { FlameHero } from '@/components/FlameHero';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, font, spacing, radius } from '@/theme';
import { formatCountdown, formatDisplay, msUntilEndOfDay, todayStr } from '@/logic/date';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * レベル1: ボタン+タイマー方式の達成判定画面。
 * 残り時間を円形リングで表示し、「達成」ボタンで今日を done として記録する。
 */
export default function TodayScreen() {
  const router = useRouter();
  const { goal, isTodayScheduled, todayStatus, markTodayDone } = useApp();

  const [remain, setRemain] = useState(() => msUntilEndOfDay());
  const [celebrating, setCelebrating] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setRemain(msUntilEndOfDay()), 1000);
    return () => clearInterval(t);
  }, []);

  // 「達成」ボタンをふわっと脈動させて押したくなる演出
  useEffect(() => {
    if (todayStatus === 'done') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, todayStatus]);

  const onAchieve = async () => {
    await markTodayDone();
    setCelebrating(true);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    setTimeout(() => router.back(), 1400);
  };

  const alreadyDone = todayStatus === 'done';
  const remainRatio = remain / DAY_MS;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <FlameHero icon="time" iconSize={120} style={styles.hero}>
        <Text style={styles.date}>{formatDisplay(todayStr())}</Text>
        <Text style={styles.goalName}>{goal?.name ?? ''}</Text>

        {!isTodayScheduled ? (
          <View style={styles.notScheduledRow}>
            <Ionicons name="leaf" size={16} color={colors.textSub} />
            <Text style={styles.notScheduled}>今日は予定日ではありません</Text>
          </View>
        ) : (
          <View style={styles.ringWrap}>
            <ProgressRing ratio={remainRatio} size={190} strokeWidth={13}>
              <Text style={styles.timerLabel}>期限まで</Text>
              <Text style={styles.timer}>{formatCountdown(remain)}</Text>
            </ProgressRing>
          </View>
        )}
      </FlameHero>

      {isTodayScheduled && (
        <Text style={styles.hint}>
          日付が変わるまでに押さないと{'\n'}自動的に「未達」になります
        </Text>
      )}

      {isTodayScheduled &&
        (alreadyDone || celebrating ? (
          <Animated.View
            style={[
              styles.doneWrap,
              {
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
                opacity: celebrating ? pop : 1,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            <Text style={styles.doneTitle}>達成！</Text>
            <View style={styles.doneSubRow}>
              <Text style={styles.doneSub}>この積み上げを絶やさずに</Text>
              <Ionicons name="flame" size={14} color={colors.success} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale }], alignSelf: 'stretch' }}>
            <PrimaryButton label="達成する" icon="checkmark" onPress={onAchieve} style={styles.bigButton} />
          </Animated.View>
        ))}

      <PrimaryButton
        label="戻る"
        variant="ghost"
        onPress={() => router.back()}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingTop: spacing.xl },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  date: { fontSize: font.sub, color: colors.textSub, fontWeight: '700' },
  goalName: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  ringWrap: { marginTop: spacing.xl },
  timerLabel: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  timer: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  notScheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  notScheduled: { fontSize: font.body, color: colors.textSub, fontWeight: '700' },
  hint: {
    fontSize: font.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -spacing.xs,
  },
  bigButton: { height: 64 },
  doneWrap: {
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.success,
  },
  doneTitle: { fontSize: font.title, fontWeight: '900', color: colors.success, marginTop: spacing.sm },
  doneSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  doneSub: { fontSize: font.sub, color: colors.success },
});

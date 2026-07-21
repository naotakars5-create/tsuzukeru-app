import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, spacing, radius } from '@/theme';
import { formatCountdown, formatDisplay, msUntilEndOfDay, todayStr } from '@/logic/date';

/**
 * レベル1: ボタン+タイマー方式の達成判定画面。
 * 期限（当日23:59:59）までのカウントダウンを表示し、
 * 「達成」ボタンを押すと今日を done として記録する。
 */
export default function TodayScreen() {
  const router = useRouter();
  const { goal, isTodayScheduled, todayStatus, markTodayDone } = useApp();

  const [remain, setRemain] = useState(() => msUntilEndOfDay());
  const [celebrating, setCelebrating] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;

  // 1秒ごとにカウントダウン更新
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
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
    // 少し余韻を見せてからホームへ戻る
    setTimeout(() => router.back(), 1400);
  };

  const alreadyDone = todayStatus === 'done';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card}>
        <Text style={styles.dateText}>{formatDisplay(todayStr())}</Text>
        <Text style={styles.goalName}>{goal?.name ?? ''}</Text>

        {!isTodayScheduled ? (
          <View style={styles.info}>
            <Text style={styles.infoText}>今日は予定日ではありません 🌿</Text>
          </View>
        ) : (
          <>
            <Text style={styles.timerLabel}>今日の期限まで</Text>
            <Text style={styles.timer}>{formatCountdown(remain)}</Text>
            <Text style={styles.hint}>
              日付が変わるまでに押さないと{'\n'}自動的に「未達」になります
            </Text>
          </>
        )}
      </Card>

      {isTodayScheduled &&
        (alreadyDone || celebrating ? (
          <Animated.View
            style={[
              styles.doneWrap,
              {
                transform: [
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
                opacity: celebrating ? pop : 1,
              },
            ]}
          >
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>達成！</Text>
            <Text style={styles.doneSub}>continue the streak 🔥</Text>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale }], alignSelf: 'stretch' }}>
            <PrimaryButton
              label="達成する"
              onPress={onAchieve}
              style={styles.bigButton}
            />
          </Animated.View>
        ))}

      <PrimaryButton
        label="戻る"
        variant="ghost"
        onPress={() => router.back()}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingTop: spacing.xl },
  card: { alignItems: 'center', paddingVertical: spacing.xxl },
  dateText: { fontSize: font.sub, color: colors.textMuted, fontWeight: '600' },
  goalName: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  timerLabel: {
    marginTop: spacing.xl,
    fontSize: font.sub,
    color: colors.textSub,
  },
  timer: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 2,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: spacing.md,
    fontSize: font.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  info: { marginTop: spacing.xl },
  infoText: { fontSize: font.body, color: colors.textSub },

  bigButton: { height: 64 },

  doneWrap: {
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
  },
  doneEmoji: { fontSize: 56 },
  doneTitle: {
    fontSize: font.title,
    fontWeight: '900',
    color: colors.success,
    marginTop: spacing.sm,
  },
  doneSub: { fontSize: font.sub, color: colors.success, marginTop: 2 },
});

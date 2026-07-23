import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, font, spacing, radius } from '@/theme';
import { formatHM, msUntilEndOfDay } from '@/logic/date';
import { WEEKLY_STAKE } from '@/logic/billing';
import { POINTS_PER_DONE } from '@/logic/rank';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * レベル1: ボタン+タイマー方式の達成判定画面。
 * 締切に向けたカウントダウン（警告色リング）と課金予告で緊張感を出し、
 * 脈動する達成ボタンで即実行を促す。
 */
export default function TodayScreen() {
  const router = useRouter();
  const { goal, progress, weeks, isTodayScheduled, todayStatus, markTodayDone } = useApp();

  const [remain, setRemain] = useState(() => msUntilEndOfDay());
  const [celebrating, setCelebrating] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setRemain(msUntilEndOfDay()), 1000);
    return () => clearInterval(t);
  }, []);

  // 達成ボタンの脈動（1.8s ループ）
  useEffect(() => {
    if (todayStatus === 'done') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.035,
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
  // 今週すでに未達があるか（あれば今週の¥100は没収確定済み）
  const currentWeek = weeks.find((w) => w.isCurrent);
  const weekAlreadyCharged = (currentWeek?.missed ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: goal?.name ?? '今日の達成' }} />

      {/* 課金予告バナー（緊張感） */}
      {isTodayScheduled && !alreadyDone && !celebrating && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.bannerText}>
            {weekAlreadyCharged
              ? `今週の ¥${WEEKLY_STAKE} は没収確定。連続記録は今日から守れる`
              : `今日サボると、今週の積立 ¥${WEEKLY_STAKE} は返金されません`}
          </Text>
        </View>
      )}

      {/* カウントダウンリング（主役・警告色） */}
      <View style={styles.heroArea}>
        {!isTodayScheduled ? (
          <View style={styles.notScheduled}>
            <Ionicons name="leaf" size={40} color={colors.textMuted} />
            <Text style={styles.notScheduledText}>今日は予定日ではありません</Text>
          </View>
        ) : alreadyDone || celebrating ? (
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
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
            <Text style={styles.doneTitle}>達成！</Text>
            <Text style={styles.doneSub}>
              +{POINTS_PER_DONE} pt ・ 連続{progress.streak}日
            </Text>
          </Animated.View>
        ) : (
          <ProgressRing
            ratio={remainRatio}
            size={264}
            strokeWidth={10}
            color={colors.warning}
            track={colors.border}
          >
            <Text style={styles.timerLabel}>残り時間</Text>
            <Text style={styles.timer}>{formatHM(remain)}</Text>
            <Text style={styles.timerSub}>23:59 まで</Text>
          </ProgressRing>
        )}
      </View>

      {/* 達成ボタン（脈動） */}
      <View style={styles.bottom}>
        {isTodayScheduled && !alreadyDone && !celebrating && (
          <>
            <Animated.View style={{ transform: [{ scale }], alignSelf: 'stretch' }}>
              <PrimaryButton
                label="達成する"
                icon="checkmark-circle"
                onPress={onAchieve}
                style={styles.bigButton}
              />
            </Animated.View>
            <Text style={styles.caption}>
              達成で +{POINTS_PER_DONE} pt ・ 連続{progress.streak + 1}日目へ
            </Text>
          </>
        )}
        <PrimaryButton label="戻る" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 22 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    fontVariant: ['tabular-nums'],
  },

  heroArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, color: colors.textSub },
  timer: {
    fontSize: 60,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 62,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: 14,
    color: colors.textSub,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },

  notScheduled: { alignItems: 'center', gap: spacing.md },
  notScheduledText: { fontSize: font.body, color: colors.textSub, fontWeight: '700' },

  doneWrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.success,
  },
  doneTitle: { fontSize: font.title, fontWeight: '900', color: colors.success, marginTop: spacing.sm },
  doneSub: {
    fontSize: font.sub,
    color: colors.success,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  bottom: { paddingBottom: 34, gap: spacing.sm },
  bigButton: { height: 66 },
  caption: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});

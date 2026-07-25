import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, font, spacing, radius } from '@/theme';
import { formatStopwatch, formatMinutes } from '@/logic/time';
import { WEEKLY_PENALTY } from '@/logic/billing';

/**
 * 勉強タイマー画面。ストップウォッチで勉強時間を計測し、
 * 今日の合計が1日の目標時間に届いたら「達成」になる。
 */
export default function TodayScreen() {
  const router = useRouter();
  const { goal, progress, weeks, isTodayScheduled, addStudyMinutes } = useApp();

  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0); // 現在のセッションの経過秒
  const startRef = useRef<number>(0);
  const pulse = useRef(new Animated.Value(1)).current;

  const targetMin = goal?.dailyTargetMin ?? 120;
  const doneMin = progress.todayMinutes; // 既に記録済みの今日の分
  const sessionMin = elapsedSec / 60;
  const totalTodayMin = doneMin + sessionMin;
  const reached = totalTodayMin >= targetMin;
  const ratio = targetMin > 0 ? totalTodayMin / targetMin : 0;

  // 1秒ごとに経過を更新
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  // 計測中はボタンを脈動
  useEffect(() => {
    if (!running) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [running]);

  const onStart = () => {
    startRef.current = Date.now() - elapsedSec * 1000;
    setRunning(true);
  };

  const onStop = async () => {
    setRunning(false);
    const mins = elapsedSec / 60;
    if (mins > 0) await addStudyMinutes(mins);
    setElapsedSec(0);
  };

  // テスト/手動追加用
  const quickAdd = async (m: number) => {
    if (running) return;
    await addStudyMinutes(m);
  };

  const currentWeek = weeks.find((w) => w.isCurrent);
  const weekAlreadyCharged = (currentWeek?.missed ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: goal?.name ?? '勉強タイマー' }} />

      {!isTodayScheduled ? (
        <View style={styles.center}>
          <Ionicons name="leaf" size={40} color={colors.textMuted} />
          <Text style={styles.notSched}>今日は予定日ではありません</Text>
          <PrimaryButton label="戻る" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          {/* 課金予告 */}
          {!reached && (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.bannerText}>
                {weekAlreadyCharged
                  ? `今週は ¥${WEEKLY_PENALTY} 没収確定。記録は今日から立て直せる`
                  : `目標に届かない日が続くと、今週ぶんの ¥${WEEKLY_PENALTY} が没収されます`}
              </Text>
            </View>
          )}

          {/* リング＋ストップウォッチ */}
          <View style={styles.heroArea}>
            <ProgressRing
              ratio={ratio}
              size={260}
              strokeWidth={12}
              color={reached ? colors.success : colors.primary}
            >
              <Text style={styles.timerLabel}>{running ? '計測中' : '今日の勉強'}</Text>
              <Text style={styles.timer}>{formatStopwatch(elapsedSec)}</Text>
              <Text style={styles.todayTotal}>
                合計 {formatMinutes(totalTodayMin)} / 目標 {formatMinutes(targetMin)}
              </Text>
            </ProgressRing>

            {reached && (
              <View style={styles.doneTag}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.doneTagText}>今日の目標を達成！</Text>
              </View>
            )}
          </View>

          {/* スタート/ストップ */}
          <View style={styles.controls}>
            <Animated.View style={{ transform: [{ scale: pulse }], alignSelf: 'stretch' }}>
              {running ? (
                <PrimaryButton label="ストップ（記録する）" icon="stop" onPress={onStop} style={styles.bigBtn} />
              ) : (
                <PrimaryButton label="スタート" icon="play" onPress={onStart} style={styles.bigBtn} />
              )}
            </Animated.View>

            {!running && (
              <View style={styles.quickRow}>
                <Text style={styles.quickLabel}>手動で追加：</Text>
                {[15, 30, 60].map((m) => (
                  <Pressable key={m} style={styles.quickChip} onPress={() => quickAdd(m)}>
                    <Text style={styles.quickChipText}>+{m}分</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <PrimaryButton label="戻る" variant="ghost" onPress={() => router.back()} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  notSched: { fontSize: font.body, color: colors.textSub, fontWeight: '700' },

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
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.danger },

  heroArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  timerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, color: colors.textSub },
  timer: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
    lineHeight: 56,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  todayTotal: { fontSize: 13, color: colors.textSub, marginTop: 6, fontWeight: '600' },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  doneTagText: { fontSize: font.sub, fontWeight: '800', color: colors.success },

  controls: { paddingBottom: 34, gap: spacing.md },
  bigBtn: { height: 64 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  quickChip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quickChipText: { fontSize: 12, fontWeight: '800', color: colors.text },
});

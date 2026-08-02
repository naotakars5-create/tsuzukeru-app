import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, font, spacing, radius } from '@/theme';
import { formatStopwatch, formatMinutes } from '@/logic/time';
import { weekStake } from '@/logic/billing';
import { subjectsForCategory } from '@/logic/subjects';
import { notifyAsync, promptAsync } from '@/logic/confirm';

/** 集中モード1セットの長さ（分） */
const POMODORO_MIN = 25;

/**
 * 勉強タイマー画面。グローバルなストップウォッチで勉強時間を計測し、
 * 今日の合計が1日の目標時間に届いたら「達成」になる。
 * 計測はアプリ全体で継続する（他画面へ移動しても止まらない）。
 */
export default function TodayScreen() {
  const router = useRouter();
  const {
    goal,
    progress,
    weeks,
    isTodayScheduled,
    addStudyMinutes,
    addSubjectMinutes,
    timerStartedAt,
    startTimer,
    stopTimer,
  } = useApp();

  const running = timerStartedAt != null;
  const [now, setNow] = useState(Date.now());
  const pulse = useRef(new Animated.Value(1)).current;
  // 集中モード（ポモドーロ）と科目
  const [pomodoro, setPomodoro] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const notified = useRef(false);

  const targetMin = goal?.dailyTargetMin ?? 120;
  const doneMin = progress.todayMinutes;
  const sessionSec = running ? Math.floor((now - (timerStartedAt as number)) / 1000) : 0;
  const totalTodayMin = doneMin + sessionSec / 60;
  const reached = totalTodayMin >= targetMin;
  const ratio = targetMin > 0 ? totalTodayMin / targetMin : 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

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

  const quickAdd = async (m: number) => {
    if (running) return;
    await addStudyMinutes(m);
    if (subject) await addSubjectMinutes(subject, m);
  };

  // 計測を止めて、科目にも記録する
  const onStop = async () => {
    const min = await stopTimer();
    if (min > 0 && subject) await addSubjectMinutes(subject, min);
    setOnBreak(false);
    notified.current = false;
  };

  // ポモドーロ: 25分たったら知らせる（計測は続けられる）
  const pomoElapsedSec = running ? sessionSec : 0;
  const pomoLeftSec = Math.max(0, POMODORO_MIN * 60 - pomoElapsedSec);
  useEffect(() => {
    if (!pomodoro || !running || notified.current) return;
    if (pomoLeftSec === 0) {
      notified.current = true;
      notifyAsync('25分たちました', '5分休憩して、もう1セット行こう。');
    }
  }, [pomodoro, running, pomoLeftSec]);

  // 科目の候補（資格ごとのプリセット＋自分で足したもの）
  const [extraSubjects, setExtraSubjects] = useState<string[]>([]);
  const subjectOptions = [...subjectsForCategory(goal?.category), ...extraSubjects];

  const onAddSubject = async () => {
    const v = await promptAsync('科目を追加', '科目名を入力（例: 民法）', '');
    const t = v?.trim();
    if (!t) return;
    if (!subjectOptions.includes(t)) setExtraSubjects((prev) => [...prev, t]);
    setSubject(t);
  };

  const currentWeek = weeks.find((w) => w.isCurrent);
  const weekAlreadyCharged = (currentWeek?.missed ?? 0) > 0;
  const stake = goal ? weekStake(goal.deposit, goal.durationWeeks) : 0;

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
          {!reached && (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.bannerText}>
                {weekAlreadyCharged
                  ? `今週ぶん ¥${stake.toLocaleString()} は課金確定。記録は今日から立て直せる`
                  : `未達だと、今週ぶん ¥${stake.toLocaleString()} が後から課金されます`}
              </Text>
            </View>
          )}

          <View style={styles.heroArea}>
            <ProgressRing
              ratio={ratio}
              size={260}
              strokeWidth={12}
              color={reached ? colors.success : colors.primary}
            >
              <Text style={styles.timerLabel}>{running ? '計測中' : '今日の勉強'}</Text>
              <Text style={styles.timer}>{formatStopwatch(sessionSec)}</Text>
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

          {/* 科目と集中モード */}
          <View style={styles.optionArea}>
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>科目</Text>
              <View style={styles.subjWrap}>
                {subjectOptions.map((sName) => {
                  const active = subject === sName;
                  return (
                    <Pressable
                      key={sName}
                      onPress={() => setSubject(active ? '' : sName)}
                      style={[styles.subjChip, active && styles.subjChipActive]}
                    >
                      <Text style={[styles.subjText, active && styles.subjTextActive]}>{sName}</Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={onAddSubject} style={styles.subjChip}>
                  <Ionicons name="add" size={13} color={colors.textSub} />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.pomoRow} onPress={() => setPomodoro((v) => !v)}>
              <Ionicons
                name={pomodoro ? 'checkbox' : 'square-outline'}
                size={18}
                color={pomodoro ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.pomoText, pomodoro && { color: colors.text }]}>
                集中モード（{POMODORO_MIN}分ごとに休憩の合図）
              </Text>
              {pomodoro && running && (
                <Text style={styles.pomoLeft}>
                  あと {Math.floor(pomoLeftSec / 60)}:{String(pomoLeftSec % 60).padStart(2, '0')}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.controls}>
            <Animated.View style={{ transform: [{ scale: pulse }], alignSelf: 'stretch' }}>
              {running ? (
                <PrimaryButton
                  label="ストップ（記録する）"
                  icon="stop"
                  onPress={onStop}
                  style={styles.bigBtn}
                />
              ) : (
                <PrimaryButton label="スタート" icon="play" onPress={startTimer} style={styles.bigBtn} />
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

            {running && (
              <Text style={styles.runningHint}>
                計測中も、他の画面（ランキング等）を見に行けます。下のバーからいつでも停止できます。
              </Text>
            )}

            {!running && (
              <PrimaryButton
                label="今日の学習メモを書く"
                icon="create"
                variant="secondary"
                onPress={() => router.push('/journal')}
              />
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

  optionArea: { gap: spacing.md, marginBottom: spacing.md },
  optRow: { gap: spacing.sm },
  optLabel: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  subjWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subjChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjChipActive: { backgroundColor: 'rgba(198,244,50,0.14)', borderColor: colors.primary },
  subjText: { fontSize: font.small, fontWeight: '700', color: colors.textSub },
  subjTextActive: { color: colors.primary, fontWeight: '900' },
  pomoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pomoText: { fontSize: font.small, color: colors.textSub, fontWeight: '700', flex: 1 },
  pomoLeft: {
    fontSize: font.small,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },

  cheerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  speech: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  speechText: { fontSize: font.sub, fontWeight: '700', color: colors.text },

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
  runningHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});

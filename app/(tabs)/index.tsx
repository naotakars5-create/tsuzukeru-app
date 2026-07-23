import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { AchievementGrid } from '@/components/AchievementGrid';
import { colors, font, labelStyle, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { frequencyLabel } from '@/logic/schedule';
import { formatHM, msUntilEndOfDay } from '@/logic/date';
import { IconName } from '@/types';

/** 時間帯に合わせた挨拶 */
function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'おはよう';
  if (h >= 11 && h < 18) return 'こんにちは';
  return 'こんばんは';
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    ready,
    goal,
    records,
    progress,
    weeks,
    isTodayScheduled,
    todayStatus,
  } = useApp();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // 目標が未設定 → 消灯したリング＋点灯予告
  if (!goal) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.emptyWrap}>
          <ProgressRing ratio={0} size={150} strokeWidth={16} glow={false}>
            <Ionicons name="flame-outline" size={40} color={colors.textMuted} />
          </ProgressRing>
          <Text style={styles.emptyTitle}>ここが、点灯していく。</Text>
          <Text style={styles.emptyText}>
            サボると痛み、続けると報酬。{'\n'}
            仕組みで習慣を変えるアプリです。
          </Text>
          <PrimaryButton
            label="最初の習慣をつくる"
            icon="add"
            onPress={() => router.push('/goal-setup')}
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const category = categoryOf(goal.category);
  const currentWeek = weeks.find((w) => w.isCurrent) ?? weeks[0];
  const weekRatio = currentWeek.scheduled ? currentWeek.done / currentWeek.scheduled : 0;
  const weekPct = Math.round(weekRatio * 100);
  const remainHM = formatHM(msUntilEndOfDay());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 挨拶ヘッダー */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetSub}>{greeting()}</Text>
            <Text style={styles.greetMain}>今日の1歩、行こう。</Text>
          </View>
          <Pressable style={styles.bell} onPress={() => router.push('/settings')}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSub} />
          </Pressable>
        </View>

        {/* 進捗リングヒーロー（主役） */}
        <Card style={styles.heroCard}>
          <Text style={styles.sectionLabel}>今週の進捗</Text>
          <View style={styles.heroRow}>
            <ProgressRing ratio={weekRatio} size={150} strokeWidth={16}>
              <View style={styles.ringCenterRow}>
                <Text style={styles.ringPct}>{weekPct}</Text>
                <Text style={styles.ringPctUnit}>%</Text>
              </View>
              <Text style={styles.ringCount}>
                {currentWeek.done} / {currentWeek.scheduled} 日
              </Text>
            </ProgressRing>

            <View style={styles.chipCol}>
              <StatChip icon="flame" accent={colors.orange} label="連続" value={progress.streak} unit="日" />
              <StatChip
                icon="diamond"
                accent={colors.purple}
                label="ポイント"
                value={progress.points.toLocaleString()}
              />
            </View>
          </View>
        </Card>

        {/* 今日の習慣 */}
        <Card style={styles.todayCard}>
          <View style={styles.todayRow}>
            <View style={styles.todayIcon}>
              <Ionicons name={category.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayName}>{goal.name}</Text>
              <Text style={styles.todayMeta}>
                {frequencyLabel(goal)} ・ 残り {remainHM}
              </Text>
            </View>
          </View>

          {!isTodayScheduled ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="leaf" size={16} color={colors.textSub} />
              <Text style={[styles.pillText, { color: colors.textSub }]}>
                今日は予定日ではありません
              </Text>
            </View>
          ) : todayStatus === 'done' ? (
            <View style={[styles.pill, { backgroundColor: colors.successBg }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.pillText, { color: colors.success }]}>
                今日は達成済み！お見事です
              </Text>
            </View>
          ) : (
            <PrimaryButton
              label="達成する"
              icon="checkmark-circle"
              onPress={() => router.push('/today')}
              style={{ marginTop: spacing.md, height: 52 }}
            />
          )}
        </Card>

        {/* 達成グリッド（ヒートマップ） */}
        <Card style={styles.gridCard}>
          <View style={styles.gridHead}>
            <Text style={styles.sectionLabel}>この1ヶ月の積み上がり</Text>
            <Text style={styles.gridCount}>
              {progress.doneCount} / {progress.scheduledCount} 達成
            </Text>
          </View>
          <AchievementGrid goal={goal} records={records} />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.heatRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.heat1 }]} />
                <View style={[styles.legendDot, { backgroundColor: colors.heat2 }]} />
                <View style={[styles.legendDot, { backgroundColor: colors.heat3 }]} />
              </View>
              <Text style={styles.legendText}>連続するほど濃く</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gridMiss }]} />
              <Text style={styles.legendText}>未達</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gridEmpty }]} />
              <Text style={styles.legendText}>これから</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** リング右の縦チップ（連続・ポイント） */
function StatChip({
  icon,
  accent,
  label,
  value,
  unit,
}: {
  icon: IconName;
  accent: string;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipHead}>
        <Ionicons name={icon} size={14} color={accent} />
        <Text style={[styles.chipLabel, { color: accent }]}>{label}</Text>
      </View>
      <View style={styles.chipValueRow}>
        <Text style={styles.chipValue}>{value}</Text>
        {unit ? <Text style={styles.chipUnit}> {unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: spacing.sm, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.xl },
  emptyText: {
    fontSize: font.body,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },

  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  greetSub: { fontSize: 14, color: colors.textSub },
  greetMain: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: 2 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: { ...labelStyle },

  heroCard: { borderRadius: radius.xl, padding: 22 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: spacing.md },
  ringCenterRow: { flexDirection: 'row', alignItems: 'flex-start' },
  ringPct: {
    fontSize: 46,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 48,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  ringPctUnit: { fontSize: 20, fontWeight: '700', color: colors.textSub, marginTop: 6 },
  ringCount: {
    fontSize: 13,
    color: colors.textSub,
    fontWeight: '600',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },

  chipCol: { flex: 1, gap: 12 },
  chip: { backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  chipHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  chipValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  chipUnit: { fontSize: 13, color: colors.textSub, fontWeight: '600' },

  todayCard: { borderRadius: radius.xl, padding: 18 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayName: { fontSize: 16, fontWeight: '700', color: colors.text },
  todayMeta: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },

  pill: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillText: { fontSize: font.sub, fontWeight: '700' },

  gridCard: { borderRadius: radius.xl, padding: 18 },
  gridHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  gridCount: { fontSize: 12, color: colors.textSub, fontWeight: '600', fontVariant: ['tabular-nums'] },

  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heatRow: { flexDirection: 'row', gap: 3 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { FlameHero } from '@/components/FlameHero';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { AchievementGrid } from '@/components/AchievementGrid';
import { colors, font, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';

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

  // 目標が未設定 → 設定を促す
  if (!goal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.emptyWrap}>
          <Ionicons name="flame" size={72} color={colors.primary} />
          <Text style={styles.emptyTitle}>続ける第一歩</Text>
          <Text style={styles.emptyText}>
            まずは目標を設定しましょう。{'\n'}
            サボると痛み、続けると報酬。{'\n'}
            仕組みで習慣を変えます。
          </Text>
          <PrimaryButton
            label="目標を設定する"
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
  const toBest = Math.max(0, progress.bestStreak + 1 - progress.streak);

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 連続達成のヒーロー（主役） */}
      <FlameHero iconSize={130}>
        <Text style={styles.heroKicker}>連続達成</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroBig}>{progress.streak}</Text>
          <Text style={styles.heroUnit}>日</Text>
        </View>
        <Text style={styles.heroSub}>
          {progress.streak > 0 && progress.streak >= progress.bestStreak
            ? '自己ベスト更新中！この炎を絶やすな'
            : progress.streak === 0
            ? 'きょう達成して、炎をともそう'
            : `あと${toBest}日で自己ベスト更新！`}
        </Text>
      </FlameHero>

      {/* 今日やること */}
      <Card>
        <View style={styles.labelRow}>
          <Ionicons name={category.icon} size={14} color={category.color} />
          <Text style={styles.label}>きょうの習慣（{category.label}）</Text>
        </View>
        <Text style={styles.goalName}>{goal.name}</Text>
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
          <>
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.deadline}>期限 23:59 まで</Text>
            </View>
            <PrimaryButton
              label="達成する"
              onPress={() => router.push('/today')}
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </Card>

      {/* 数値サマリー */}
      <View style={styles.tileRow}>
        <StatTile value={progress.points} label="ポイント" icon="star" accent={colors.warning} />
        <View style={{ width: spacing.md }} />
        <StatTile
          value={progress.rank.label}
          label="現在のランク"
          icon={progress.rank.icon}
          accent={progress.rank.color}
        />
      </View>

      {/* 今週の進捗 */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>今週の進捗（{currentWeek.label}）</Text>
          <Text style={styles.weekCount}>
            {currentWeek.done}/{currentWeek.scheduled}
          </Text>
        </View>
        <View style={{ height: spacing.sm }} />
        <ProgressBar ratio={weekRatio} height={12} />
      </Card>

      {/* 積み上がりの可視化 */}
      <Card>
        <Text style={styles.label}>この1ヶ月の積み上がり</Text>
        <View style={{ height: spacing.md }} />
        <AchievementGrid goal={goal} records={records} />
        <View style={styles.legend}>
          <Legend color={colors.primary} label="達成" />
          <Legend color={colors.danger} label="未達" />
          <Legend color={colors.surface} label="これから" />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.lg },
  emptyText: {
    fontSize: font.body,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },

  heroKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.onFlame,
    opacity: 0.9,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  heroBig: {
    fontSize: font.hero,
    fontWeight: '900',
    color: colors.onFlame,
    lineHeight: font.hero,
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.onFlame,
    marginLeft: 6,
    marginBottom: 6,
  },
  heroSub: { fontSize: font.sub, fontWeight: '600', color: colors.onFlame, opacity: 0.95, marginTop: 4 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  goalName: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  deadline: { fontSize: font.sub, color: colors.textMuted },

  pill: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillText: { fontSize: font.body, fontWeight: '700' },

  tileRow: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekCount: { fontSize: font.body, fontWeight: '900', color: colors.primary },

  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 5 },
  legendText: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
});

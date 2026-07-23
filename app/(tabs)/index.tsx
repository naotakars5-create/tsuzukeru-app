import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { FlameHero } from '@/components/FlameHero';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressRing } from '@/components/ProgressRing';
import { StatTile } from '@/components/StatTile';
import { AchievementGrid } from '@/components/AchievementGrid';
import { colors, font, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { IconName } from '@/types';

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
          <View style={styles.emptyIcon}>
            <Ionicons name="flame" size={44} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>続ける第一歩</Text>
          <Text style={styles.emptyText}>
            まずは目標を設定しましょう。{'\n'}
            サボると痛み、続けると報酬。{'\n'}
            仕組みで習慣を変えます。
          </Text>
          <PrimaryButton
            label="目標を設定する"
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

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* あいさつ */}
      <View>
        <Text style={styles.hello}>こんにちは</Text>
        <Text style={styles.helloSub}>今日も積み上げていこう</Text>
      </View>

      {/* 今週の進捗リング（主役） */}
      <FlameHero icon={null}>
        <Text style={styles.heroLabel}>今週の進捗</Text>
        <View style={styles.heroRow}>
          <ProgressRing ratio={weekRatio} size={132}>
            <Text style={styles.ringPct}>{weekPct}%</Text>
            <Text style={styles.ringCount}>
              {currentWeek.done}/{currentWeek.scheduled}
            </Text>
          </ProgressRing>

          <View style={styles.chipCol}>
            <StatChip
              icon="flame"
              accent={colors.orange}
              value={`${progress.streak}日`}
              label="連続達成"
            />
            <StatChip
              icon="star"
              accent={colors.purple}
              value={`${progress.points}pt`}
              label="ポイント"
            />
          </View>
        </View>
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
              icon="play"
              onPress={() => router.push('/today')}
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </Card>

      {/* 数値サマリー */}
      <View style={styles.tileRow}>
        <StatTile
          value={progress.rank.label}
          label="現在のランク"
          icon={progress.rank.icon}
          accent={progress.rank.color}
        />
        <View style={{ width: spacing.md }} />
        <StatTile
          value={`${progress.bestStreak}日`}
          label="最高連続"
          icon="medal"
          accent={colors.warning}
        />
      </View>

      {/* 積み上がりの可視化 */}
      <Card>
        <Text style={styles.label}>この1ヶ月の積み上がり</Text>
        <View style={{ height: spacing.md }} />
        <AchievementGrid goal={goal} records={records} />
        <View style={styles.legend}>
          <Legend color={colors.primary} label="達成" />
          <Legend color={colors.danger} label="未達" />
          <Legend color={colors.surfaceAlt} label="これから" />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/** ヒーロー右側の色付きチップ（参考デザインのカロリーチップ風） */
function StatChip({
  icon,
  accent,
  value,
  label,
}: {
  icon: IconName;
  accent: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipIcon, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View>
        <Text style={styles.chipValue}>{value}</Text>
        <Text style={styles.chipLabel}>{label}</Text>
      </View>
    </View>
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
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(198,244,50,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.lg },
  emptyText: {
    fontSize: font.body,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },

  hello: { fontSize: font.title, fontWeight: '900', color: colors.text },
  helloSub: { fontSize: font.sub, color: colors.textSub, marginTop: 2 },

  heroLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  ringPct: { fontSize: 30, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  ringCount: { fontSize: font.small, fontWeight: '700', color: colors.textSub, marginTop: 2 },

  chipCol: { flex: 1, marginLeft: spacing.lg, gap: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  chipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: { fontSize: font.body, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  chipLabel: { fontSize: 11, color: colors.textSub, fontWeight: '600' },

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

  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 5 },
  legendText: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
});

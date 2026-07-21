import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { RankBadge } from '@/components/RankBadge';
import { AchievementGrid } from '@/components/AchievementGrid';
import { colors, font, spacing } from '@/theme';
import { formatDisplay, todayStr } from '@/logic/date';

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
          <Text style={styles.emptyEmoji}>🔥</Text>
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

  const currentWeek = weeks.find((w) => w.isCurrent) ?? weeks[0];
  const weekRatio = currentWeek.scheduled
    ? currentWeek.done / currentWeek.scheduled
    : 0;

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 今日やること */}
      <Card>
        <Text style={styles.sectionLabel}>今日やること</Text>
        <Text style={styles.goalName}>{goal.name}</Text>
        <Text style={styles.dateText}>{formatDisplay(todayStr())}</Text>

        {!isTodayScheduled ? (
          <View style={[styles.statusPill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.statusText, { color: colors.textSub }]}>
              今日は予定日ではありません 🌿
            </Text>
          </View>
        ) : todayStatus === 'done' ? (
          <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>
              今日は達成済み！お見事です 🎉
            </Text>
          </View>
        ) : (
          <PrimaryButton
            label="達成する（タイマー画面へ）"
            onPress={() => router.push('/today')}
            style={{ marginTop: spacing.md }}
          />
        )}
      </Card>

      {/* 数値サマリー */}
      <View style={styles.tileRow}>
        <StatTile value={progress.streak} label="連続達成" emoji="🔥" />
        <View style={{ width: spacing.md }} />
        <StatTile
          value={progress.points}
          label="ポイント"
          emoji="⭐"
          accent={colors.warning}
        />
      </View>

      {/* 今週の進捗 */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>今週の進捗（{currentWeek.label}）</Text>
          <Text style={styles.weekCount}>
            {currentWeek.done}/{currentWeek.scheduled}
          </Text>
        </View>
        <View style={{ height: spacing.sm }} />
        <ProgressBar ratio={weekRatio} height={14} />
      </Card>

      {/* 現在のランク */}
      <Card>
        <Text style={styles.sectionLabel}>現在のランク</Text>
        <View style={{ height: spacing.sm }} />
        <RankBadge rank={progress.rank} size="lg" />
        {progress.nextRank ? (
          <Text style={styles.nextRankText}>
            次の {progress.nextRank.emoji}
            {progress.nextRank.label} まであと {progress.pointsToNext}pt
          </Text>
        ) : (
          <Text style={styles.nextRankText}>最高ランクに到達！🏆</Text>
        )}
      </Card>

      {/* 積み上がりの可視化 */}
      <Card>
        <Text style={styles.sectionLabel}>この1ヶ月の積み上がり</Text>
        <View style={{ height: spacing.md }} />
        <AchievementGrid goal={goal} records={records} />
        <View style={styles.legend}>
          <Legend color={colors.primary} label="達成" />
          <Legend color={colors.dangerBg} label="未達" textColor={colors.danger} />
          <Legend color={colors.surfaceAlt} label="これから" />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Legend({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor?: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, textColor ? { color: textColor } : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.lg },
  emptyTitle: { fontSize: font.title, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: font.body,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },

  sectionLabel: { fontSize: font.sub, fontWeight: '700', color: colors.textSub },
  goalName: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  dateText: { fontSize: font.sub, color: colors.textMuted, marginTop: 2 },

  statusPill: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: { fontSize: font.body, fontWeight: '700' },

  tileRow: { flexDirection: 'row' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekCount: { fontSize: font.body, fontWeight: '800', color: colors.primary },

  nextRankText: {
    marginTop: spacing.md,
    fontSize: font.sub,
    color: colors.textSub,
    fontWeight: '600',
  },

  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: font.small, color: colors.textSub },
});

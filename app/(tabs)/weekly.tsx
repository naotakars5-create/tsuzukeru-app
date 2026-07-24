import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, font, labelStyle, spacing } from '@/theme';
import { compareDate, todayStr } from '@/logic/date';
import { MONTHLY_STAKE, WEEKLY_PENALTY } from '@/logic/billing';
import { WeekSummary } from '@/types';

type WeekState = 'done' | 'missed' | 'current' | 'future';

function stateOf(week: WeekSummary): WeekState {
  if (week.isCurrent) return 'current';
  if (compareDate(week.startDate, todayStr()) > 0) return 'future';
  return week.missed > 0 ? 'missed' : 'done';
}

/** 週次レポート: 4週の達成状況と、月¥500プールの状態（モック課金）を表示。 */
export default function WeeklyScreen() {
  const { goal, weeks, seasonResult } = useApp();

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>まず目標を設定してください。</Text>
      </View>
    );
  }

  const startCharge = goal.startCharge; // 0=無料月, 500=通常
  const forfeited = seasonResult.charged; // 没収済み
  const poolRemaining = seasonResult.poolRemaining;
  const anyMiss = weeks.some((w) => w.missed > 0 && !w.isCurrent);
  const isFreeMonth = startCharge === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 今月の積立プール */}
      {isFreeMonth ? (
        <View style={[styles.poolCard, { borderColor: colors.success }]}>
          <View style={styles.poolHead}>
            <Ionicons name="gift" size={18} color={colors.success} />
            <Text style={[styles.poolLabel, { color: colors.success }]}>今月は無料月</Text>
          </View>
          <Text style={styles.poolCopy}>前月パーフェクトの特典。今月の積立はありません。</Text>
        </View>
      ) : (
        <View style={styles.poolCard}>
          <View style={styles.poolHead}>
            <Ionicons name="wallet" size={18} color={colors.primary} />
            <Text style={styles.poolLabel}>今月の積立プール（モック）</Text>
          </View>
          <View style={styles.poolAmountRow}>
            <Text style={styles.poolRemaining}>¥{poolRemaining.toLocaleString()}</Text>
            <Text style={styles.poolTotal}>/ ¥{MONTHLY_STAKE} 中</Text>
          </View>
          <View style={styles.poolBar}>
            <View
              style={[
                styles.poolBarFill,
                { width: `${(poolRemaining / MONTHLY_STAKE) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.poolCopy}>
            {forfeited > 0
              ? `未達で ¥${forfeited.toLocaleString()} 没収。残りは死守しよう。`
              : anyMiss
              ? '未達あり。プールが削られていきます。'
              : 'このまま1ヶ月パーフェクトなら、翌月が無料！'}
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {weeks.map((w) => (
          <WeekCard key={w.weekIndex} week={w} freeMonth={isFreeMonth} />
        ))}
      </View>

      <Text style={styles.note}>
        ※ 月額 ¥{MONTHLY_STAKE} の積立と ¥{WEEKLY_PENALTY} 没収はすべてモックです。実際の決済は行いません。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function WeekCard({ week, freeMonth }: { week: WeekSummary; freeMonth: boolean }) {
  const state = stateOf(week);
  const ratio = week.scheduled ? week.done / week.scheduled : 0;
  const isMissed = state === 'missed';

  const badge = {
    done: { icon: 'checkmark-circle' as const, label: '達成', color: colors.success },
    missed: { icon: 'close-circle' as const, label: '未達', color: colors.danger },
    current: { icon: 'time' as const, label: '進行中', color: colors.warning },
    future: { icon: 'calendar-outline' as const, label: '予定', color: colors.textMuted },
  }[state];

  const barColor =
    state === 'done'
      ? colors.success
      : state === 'missed'
      ? colors.danger
      : state === 'current'
      ? colors.primary
      : colors.surfaceAlt;

  return (
    <View style={[styles.weekCard, isMissed && styles.weekCardMissed]}>
      <View style={styles.weekHead}>
        <Text style={styles.weekTitle}>{week.label}</Text>
        <View style={styles.badgeRow}>
          <Ionicons name={badge.icon} size={15} color={badge.color} />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <ProgressBar
        ratio={state === 'future' ? 0 : ratio}
        height={8}
        solidColor={barColor}
        track={isMissed ? '#2A1618' : colors.surfaceAlt}
      />

      <View style={styles.weekFoot}>
        <Text style={styles.weekStats}>
          {state === 'current'
            ? `達成 ${week.done} ・ 残り ${week.pending} ・ 目標 ${week.scheduled}`
            : `達成 ${week.done} ・ 目標 ${week.scheduled}`}
        </Text>
        {isMissed && !freeMonth && (
          <View style={styles.penaltyPill}>
            <Ionicons name="remove-circle" size={14} color={colors.danger} />
            <Text style={styles.penaltyText}>−¥{WEEKLY_PENALTY}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: spacing.md, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emptyText: { fontSize: font.body, color: colors.textSub },

  poolCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
  },
  poolHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolLabel: { ...labelStyle, color: colors.textSub },
  poolAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  poolRemaining: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  poolTotal: { fontSize: 14, color: colors.textSub, fontWeight: '600' },
  poolBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: 10,
  },
  poolBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  poolCopy: { fontSize: 12, color: colors.textSub, marginTop: 10, lineHeight: 17 },

  list: { gap: 10 },
  weekCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  weekCardMissed: { backgroundColor: colors.surfaceDanger, borderColor: colors.borderDanger },
  weekHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  weekFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  weekStats: { fontSize: 12, color: colors.textSub, fontVariant: ['tabular-nums'] },
  penaltyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,107,0.14)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  penaltyText: { fontSize: 13, fontWeight: '800', color: colors.danger, fontVariant: ['tabular-nums'] },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

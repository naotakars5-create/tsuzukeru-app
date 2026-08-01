import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, font, labelStyle, spacing } from '@/theme';
import { compareDate, todayStr } from '@/logic/date';
import { WeekSummary } from '@/types';

type WeekState = 'done' | 'missed' | 'current' | 'future';

function stateOf(week: WeekSummary): WeekState {
  if (week.isCurrent) return 'current';
  if (compareDate(week.startDate, todayStr()) > 0) return 'future';
  return week.missed > 0 ? 'missed' : 'done';
}

/** 週次レポート: 4週の達成状況と、コミット額の課金/免除（案C）を表示。 */
export default function WeeklyScreen() {
  const { goal, weeks, seasonResult } = useApp();

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>まず目標を設定してください。</Text>
      </View>
    );
  }

  const { charged, waived, pending } = seasonResult;
  const commit = goal.deposit;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* コミット額（案C: お金は預からない） */}
      <View style={styles.poolCard}>
        <View style={styles.poolHead}>
          <Ionicons name="flag" size={18} color={colors.primary} />
          <Text style={styles.poolLabel}>コミット額（お金は預かりません）</Text>
        </View>
        <View style={styles.poolAmountRow}>
          <Text style={styles.poolRemaining}>¥{commit.toLocaleString()}</Text>
          <Text style={styles.poolTotal}>達成すれば ¥0</Text>
        </View>
        <View style={styles.poolBreak}>
          <Break label="免除 (¥0)" value={waived} color={colors.success} />
          <Break label="進行中" value={pending} color={colors.textSub} />
          <Break label="課金予定" value={charged} color={colors.danger} />
        </View>
        <Text style={styles.poolCopy}>
          {charged > 0
            ? `未達の週ぶん ¥${charged.toLocaleString()} が課金予定（登録カードへ）。残りは達成して¥0で乗り切ろう。`
            : 'このまま完全達成すれば、1円も課金されません（続けた人は無料）。'}
        </Text>
      </View>

      <View style={styles.list}>
        {weeks.map((w) => (
          <WeekCard key={w.weekIndex} week={w} />
        ))}
      </View>

      <Text style={styles.note}>
        ※ コミット額・課金・免除はすべてモックです。実際の決済は行いません。開始時に預り金はなく、未達の週ぶんだけ後から課金される設計です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Break({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.breakItem}>
      <Text style={[styles.breakValue, { color }]}>¥{value.toLocaleString()}</Text>
      <Text style={styles.breakLabel}>{label}</Text>
    </View>
  );
}

function WeekCard({ week }: { week: WeekSummary }) {
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
        {week.chargedAmount > 0 ? (
          <View style={styles.penaltyPill}>
            <Ionicons name="card" size={14} color={colors.danger} />
            <Text style={styles.penaltyText}>課金 ¥{week.chargedAmount.toLocaleString()}</Text>
          </View>
        ) : week.refundedAmount > 0 ? (
          <View style={styles.returnPill}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.returnText}>免除 ¥0</Text>
          </View>
        ) : null}
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
  returnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74,222,128,0.14)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  returnText: { fontSize: 13, fontWeight: '800', color: colors.success, fontVariant: ['tabular-nums'] },
  poolBreak: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  breakItem: { flex: 1, alignItems: 'center' },
  breakValue: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  breakLabel: { fontSize: 10, color: colors.textSub, fontWeight: '600', marginTop: 2 },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

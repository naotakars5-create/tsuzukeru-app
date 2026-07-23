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

/**
 * 週次レポート: 4週の達成状況をひと目で。
 * 未達週のみ「請求書」トーンで課金（ダミー）を出し、達成週は静かなまま。
 */
export default function WeeklyScreen() {
  const { goal, weeks } = useApp();

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>まず目標を設定してください。</Text>
      </View>
    );
  }

  const totalCharged = weeks.reduce((s, w) => s + w.chargedAmount, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.list}>
        {weeks.map((w) => (
          <WeekCard key={w.weekIndex} week={w} />
        ))}
      </View>

      {/* 合計課金（最下部で一度だけ強調） */}
      {totalCharged > 0 ? (
        <LinearGradient
          colors={['#241315', '#170F11']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.totalCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>今月の合計課金（ダミー）</Text>
            <Text style={styles.totalCopy}>サボった分の積立。達成で相殺できます。</Text>
          </View>
          <Text style={styles.totalValue}>¥{totalCharged.toLocaleString()}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.totalCardOk}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.totalLabel, { color: colors.success }]}>
              今月の合計課金（ダミー）
            </Text>
            <Text style={styles.totalCopy}>未達なし。この調子で続けましょう。</Text>
          </View>
          <Text style={[styles.totalValue, { color: colors.success }]}>¥0</Text>
        </View>
      )}

      <Text style={styles.note}>
        ※ 実際の決済は行いません。仕組みを体験するためのダミー表示です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
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
        <View style={styles.badge}>
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
            ? `達成 ${week.done} ・ 残り ${week.pending} ・ 予定 ${week.scheduled}`
            : `達成 ${week.done} ・ 未達 ${week.missed} ・ 予定 ${week.scheduled}`}
        </Text>
        {isMissed && week.chargedAmount > 0 && (
          <View style={styles.chargePill}>
            <Ionicons name="card" size={14} color={colors.danger} />
            <Text style={styles.chargePillText}>
              課金 ¥{week.chargedAmount.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emptyText: { fontSize: font.body, color: colors.textSub },

  list: { gap: 10 },

  weekCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  weekCardMissed: {
    backgroundColor: colors.surfaceDanger,
    borderColor: colors.borderDanger,
  },
  weekHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  weekFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  weekStats: {
    fontSize: 12,
    color: colors.textSub,
    fontVariant: ['tabular-nums'],
  },
  chargePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.14)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chargePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
    fontVariant: ['tabular-nums'],
  },

  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDanger,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  totalCardOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  totalLabel: { ...labelStyle, color: '#FF9F9F', marginBottom: 6 },
  totalCopy: { fontSize: 12, color: colors.textSub },
  totalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: 14 },
});

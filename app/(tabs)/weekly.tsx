import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, font, gradients, radius, spacing } from '@/theme';
import { formatDisplay } from '@/logic/date';
import { WeekSummary } from '@/types';

/** 週次チェックポイント: 4週の達成/未達集計と、未達時の課金(モック)表示。 */
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
      <Text style={styles.intro}>
        1ヶ月を4週に分けて集計します。未達があった週は課金（ダミー）が発生します。
      </Text>

      {weeks.map((w) => (
        <WeekCard key={w.weekIndex} week={w} />
      ))}

      {/* 合計課金（モック） */}
      {totalCharged > 0 ? (
        <LinearGradient
          colors={gradients.flame}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.totalCard}
        >
          <Text style={[styles.totalLabel, { color: colors.onFlame, opacity: 0.9 }]}>
            合計課金（モック）
          </Text>
          <Text style={[styles.totalValue, { color: colors.onFlame }]}>
            ¥{totalCharged.toLocaleString()}
          </Text>
          <Text style={[styles.totalHint, { color: colors.onFlame, opacity: 0.85 }]}>
            ※ 実際の決済は行いません。仕組みを体験するためのダミー表示です。
          </Text>
        </LinearGradient>
      ) : (
        <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
          <Text style={[styles.totalLabel, { color: colors.success }]}>合計課金（モック）</Text>
          <Text style={[styles.totalValue, { color: colors.success }]}>¥0</Text>
          <Text style={styles.totalHint}>未達なし。この調子で続けましょう</Text>
        </Card>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function WeekCard({ week }: { week: WeekSummary }) {
  const ratio = week.scheduled ? week.done / week.scheduled : 0;
  const hasCharge = week.chargedAmount > 0;
  const perfect = week.scheduled > 0 && week.pending === 0 && week.missed === 0;

  return (
    <Card style={week.isCurrent ? styles.currentCard : undefined}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <Text style={styles.weekLabel}>{week.label}</Text>
          {week.isCurrent && (
            <View style={styles.nowBadge}>
              <Text style={styles.nowBadgeText}>今週</Text>
            </View>
          )}
        </View>
        <Text style={styles.weekRange}>
          {formatDisplay(week.startDate)}〜{formatDisplay(week.endDate)}
        </Text>
      </View>

      <View style={{ height: spacing.md }} />
      <ProgressBar ratio={ratio} height={10} solidColor={perfect ? colors.success : undefined} />

      <View style={styles.statsRow}>
        <Stat label="達成" value={week.done} color={colors.success} />
        <Stat label="未達" value={week.missed} color={colors.danger} />
        <Stat label="残り" value={week.pending} color={colors.textSub} />
        <Stat label="予定" value={week.scheduled} color={colors.text} />
      </View>

      {hasCharge ? (
        <View style={styles.chargeBox}>
          <Ionicons name="card" size={15} color={colors.danger} />
          <Text style={styles.chargeText}>
            課金が発生しました（ダミー）: ¥{week.chargedAmount.toLocaleString()}
          </Text>
        </View>
      ) : perfect ? (
        <View style={[styles.chargeBox, styles.perfectBox]}>
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <Text style={[styles.chargeText, { color: colors.success }]}>完全達成！課金なし</Text>
        </View>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emptyText: { fontSize: font.body, color: colors.textSub },
  intro: { fontSize: font.sub, color: colors.textSub, lineHeight: 20 },

  currentCard: { borderColor: colors.primary, borderWidth: 1.5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekLabel: { fontSize: font.heading, fontWeight: '900', color: colors.text },
  weekRange: { fontSize: font.small, color: colors.textMuted },
  nowBadge: {
    backgroundColor: colors.flame,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  nowBadgeText: { color: colors.onFlame, fontSize: font.small, fontWeight: '800' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: font.heading, fontWeight: '900' },
  statLabel: { fontSize: font.small, color: colors.textSub, marginTop: 2 },

  chargeBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  perfectBox: { backgroundColor: colors.successBg },
  chargeText: { fontSize: font.sub, fontWeight: '800', color: colors.danger },

  totalCard: { borderRadius: radius.lg, padding: spacing.lg },
  totalLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  totalValue: { fontSize: font.hero, fontWeight: '900', marginTop: spacing.xs },
  totalHint: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm },
});

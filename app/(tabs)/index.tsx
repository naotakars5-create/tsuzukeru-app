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
import { confirmAsync } from '@/logic/confirm';
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
import { formatMinutes, formatMinutesShort } from '@/logic/time';
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
    minutes,
    progress,
    weeks,
    seasonResult,
    seasonNumber,
    seasonComplete,
    startNextSeason,
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

  // 目標が未設定 → 世界観を伝える歓迎（オンボーディング）
  if (!goal) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.welcomeWrap} showsVerticalScrollIndicator={false}>
          <ProgressRing ratio={0} size={128} strokeWidth={14} glow={false}>
            <Ionicons name="flame" size={40} color={colors.primary} />
          </ProgressRing>
          <Text style={styles.emptyTitle}>心を燃やせ。</Text>
          <Text style={styles.welcomeLead}>
            意志じゃなく、仕組みで勉強を続ける。{'\n'}資格合格を、続く人のものにする。
          </Text>

          <View style={styles.pillars}>
            <Pillar icon="alert-circle" color={colors.danger} title="サボると、痛み" desc="未達の週は¥100没収（モック）。だから続く。" />
            <Pillar icon="gift" color={colors.success} title="続けると、報酬" desc="1ヶ月やり切れば翌月無料。ランクも上がる。" />
            <Pillar icon="people" color={colors.primary} title="仲間と、競う" desc="同じ資格を目指す人と月間ランキングで競争。" />
            <Pillar icon="timer" color={colors.purple} title="時間で、記録" desc="ストップウォッチで勉強時間を計測して積み上げ。" />
          </View>

          <PrimaryButton
            label="勉強を始める"
            icon="flame"
            onPress={() => router.push('/goal-setup')}
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
          <Text style={styles.welcomeNote}>目標設定は1分。いつでも変えられます。</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const category = categoryOf(goal.category);

  // ─────────── シーズン完了 ───────────
  if (seasonComplete) {
    const donePct =
      seasonResult.scheduled > 0
        ? Math.round((seasonResult.done / seasonResult.scheduled) * 100)
        : 0;

    const nextFree = seasonResult.allPerfect;
    const onNext = async () => {
      const ok = await confirmAsync(
        '次のシーズンを始める',
        `「${goal.name}」で新しい4週間を始めます。連続日数・ポイント・実績は引き継がれます。\n${
          nextFree ? '今月パーフェクト達成！次の月は無料です。' : '次の月も月額¥500の積立です（モック）。'
        }`,
        '始める'
      );
      if (ok) startNextSeason();
    };

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.completeHeadRow}>
            <View>
              <Text style={styles.sectionLabel}>シーズン {seasonNumber} 完了</Text>
              <Text style={styles.completeTitle}>4週間、走りきった。</Text>
            </View>
            <View style={styles.completeTrophy}>
              <Ionicons name="trophy" size={26} color={colors.primary} />
            </View>
          </View>

          {/* 成績サマリー */}
          <Card style={styles.heroCard}>
            <View style={styles.completeRingRow}>
              <ProgressRing
                ratio={seasonResult.scheduled ? seasonResult.done / seasonResult.scheduled : 0}
                size={132}
              >
                <View style={styles.ringCenterRow}>
                  <Text style={styles.ringPct}>{donePct}</Text>
                  <Text style={styles.ringPctUnit}>%</Text>
                </View>
                <Text style={styles.ringCount}>
                  {seasonResult.done} / {seasonResult.scheduled} 達成
                </Text>
              </ProgressRing>
              <View style={styles.chipCol}>
                <StatChip
                  icon="checkmark-done-circle"
                  accent={colors.primary}
                  label="完全達成の週"
                  value={`${seasonResult.perfectWeeks}`}
                  unit="/ 4"
                />
                {nextFree ? (
                  <StatChip icon="gift" accent={colors.success} label="ごほうび" value="翌月無料" />
                ) : (
                  <StatChip
                    icon="wallet"
                    accent={colors.warning}
                    label="積立の残り"
                    value={`¥${seasonResult.poolRemaining.toLocaleString()}`}
                  />
                )}
              </View>
            </View>
          </Card>

          {/* 積み上がりの最終盤面 */}
          <Card style={styles.gridCard}>
            <Text style={styles.sectionLabel}>このシーズンの積み上がり</Text>
            <View style={{ height: spacing.md }} />
            <AchievementGrid goal={goal} minutes={minutes} />
          </Card>

          <PrimaryButton
            label="次のシーズンを始める"
            icon="refresh"
            onPress={onNext}
            style={{ marginTop: spacing.xs }}
          />
          <PrimaryButton
            label="目標を変えて始める"
            variant="secondary"
            onPress={() => router.push('/goal-setup')}
          />
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────── 通常（シーズン進行中） ───────────
  const currentWeek = weeks.find((w) => w.isCurrent) ?? weeks[0];
  const weekRatio = currentWeek.scheduled ? currentWeek.done / currentWeek.scheduled : 0;
  const weekPct = Math.round(weekRatio * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 挨拶ヘッダー */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetSub}>
              {greeting()} ・ シーズン {seasonNumber}
            </Text>
            <Text style={styles.greetMain}>今日の1歩、行こう。</Text>
          </View>
          <Pressable style={styles.bell} onPress={() => router.push('/settings')}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSub} />
          </Pressable>
        </View>

        {/* 連続が途切れる危機のナッジ */}
        {isTodayScheduled && todayStatus !== 'done' && progress.streak > 0 && (
          <Pressable style={styles.riskCard} onPress={() => router.push('/today')}>
            <Ionicons name="flame" size={20} color={colors.danger} />
            <Text style={styles.riskText}>
              連続{progress.streak}日が今日で途切れます。あと{' '}
              <Text style={styles.riskStrong}>
                {formatMinutes(Math.max(0, goal.dailyTargetMin - progress.todayMinutes))}
              </Text>{' '}
              で今日達成。
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </Pressable>
        )}

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
                icon="time"
                accent={colors.purple}
                label="今月の勉強"
                value={formatMinutesShort(progress.studyMinutes)}
              />
            </View>
          </View>
        </Card>

        {/* 今日の勉強 */}
        <Card style={styles.todayCard}>
          <View style={styles.todayRow}>
            <View style={styles.todayIcon}>
              <Ionicons name={category.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayName}>{goal.name}</Text>
              <Text style={styles.todayMeta}>
                {frequencyLabel(goal)} ・ 今日 {formatMinutes(progress.todayMinutes)} / 目標{' '}
                {formatMinutes(goal.dailyTargetMin)}
              </Text>
            </View>
          </View>

          {/* 今日の勉強時間バー */}
          {isTodayScheduled && (
            <View style={styles.todayBar}>
              <View
                style={[
                  styles.todayBarFill,
                  {
                    width: `${Math.min(100, (progress.todayMinutes / goal.dailyTargetMin) * 100)}%`,
                    backgroundColor: todayStatus === 'done' ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          )}

          {!isTodayScheduled ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="leaf" size={16} color={colors.textSub} />
              <Text style={[styles.pillText, { color: colors.textSub }]}>
                今日は予定日ではありません
              </Text>
            </View>
          ) : todayStatus === 'done' ? (
            <PrimaryButton
              label="勉強を続ける（達成済み）"
              icon="checkmark-circle"
              variant="secondary"
              onPress={() => router.push('/today')}
              style={{ marginTop: spacing.md, height: 52 }}
            />
          ) : (
            <PrimaryButton
              label="勉強をはじめる"
              icon="play"
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
          <AchievementGrid goal={goal} minutes={minutes} />
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

/** リング右の縦チップ */
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

/** オンボーディングの価値提案カード */
function Pillar({
  icon,
  color,
  title,
  desc,
}: {
  icon: IconName;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.pillar}>
      <View style={[styles.pillarIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pillarTitle}>{title}</Text>
        <Text style={styles.pillarDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: spacing.sm, gap: spacing.lg },
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

  welcomeWrap: { alignItems: 'center', padding: 22, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  welcomeLead: {
    fontSize: font.sub,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  pillars: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xl },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pillarIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pillarTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  pillarDesc: { fontSize: font.small, color: colors.textSub, marginTop: 2, lineHeight: 16 },
  welcomeNote: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.md },

  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceDanger,
    borderWidth: 1,
    borderColor: colors.borderDanger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  riskText: { flex: 1, fontSize: font.sub, color: colors.text, fontWeight: '600', lineHeight: 19 },
  riskStrong: { color: colors.danger, fontWeight: '900' },

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

  // シーズン完了
  completeHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  completeTitle: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: 4 },
  completeTrophy: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(198,244,50,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeRingRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: spacing.sm },

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
  todayBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  todayBarFill: { height: '100%', borderRadius: 4 },

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

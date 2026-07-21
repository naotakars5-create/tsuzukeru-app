import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { colors, font, radius, spacing } from '@/theme';
import { RANK_TIERS } from '@/logic/rank';

/** ランク / ポイント画面。称号・進捗表示のみ（換金機能はない）。 */
export default function RankScreen() {
  const { goal, progress } = useApp();

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>まず目標を設定してください。</Text>
      </View>
    );
  }

  const nextRank = progress.nextRank;
  // 現在ランク帯の中での進捗率
  const spanStart = progress.rank.minPoints;
  const spanEnd = nextRank ? nextRank.minPoints : spanStart;
  const spanRatio = nextRank
    ? (progress.points - spanStart) / (spanEnd - spanStart)
    : 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 現在ランクのヒーロー表示 */}
      <Card style={styles.hero}>
        <Text style={styles.heroEmoji}>{progress.rank.emoji}</Text>
        <Text style={[styles.heroLabel, { color: progress.rank.color }]}>
          {progress.rank.label}
        </Text>
        <Text style={styles.heroPoints}>{progress.points} pt</Text>

        <View style={{ height: spacing.lg, alignSelf: 'stretch' }} />
        <ProgressBar ratio={spanRatio} height={12} color={progress.rank.color} />
        <Text style={styles.nextText}>
          {nextRank
            ? `次の ${nextRank.emoji}${nextRank.label} まであと ${progress.pointsToNext}pt`
            : '最高ランクに到達しました！🏆'}
        </Text>
      </Card>

      {/* サマリー数値 */}
      <View style={styles.tileRow}>
        <StatTile value={progress.streak} label="連続達成" emoji="🔥" />
        <View style={{ width: spacing.md }} />
        <StatTile value={progress.bestStreak} label="最高連続" emoji="🏅" accent={colors.warning} />
        <View style={{ width: spacing.md }} />
        <StatTile value={progress.doneCount} label="達成日数" emoji="✅" accent={colors.success} />
      </View>

      {/* ランク一覧 */}
      <Card>
        <Text style={styles.sectionLabel}>称号一覧</Text>
        <View style={{ height: spacing.sm }} />
        {RANK_TIERS.map((tier) => {
          const reached = progress.points >= tier.minPoints;
          const isCurrent = tier.key === progress.rank.key;
          return (
            <View
              key={tier.key}
              style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}
            >
              <Text style={[styles.tierEmoji, !reached && styles.dim]}>
                {tier.emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierLabel, !reached && styles.dim]}>
                  {tier.label}
                </Text>
                <Text style={styles.tierReq}>{tier.minPoints}pt〜</Text>
              </View>
              {isCurrent ? (
                <View style={styles.currentTag}>
                  <Text style={styles.currentTagText}>現在</Text>
                </View>
              ) : reached ? (
                <Text style={styles.check}>✓</Text>
              ) : (
                <Text style={styles.lock}>🔒</Text>
              )}
            </View>
          );
        })}
      </Card>

      <Text style={styles.note}>
        ※ ポイントはアプリ内の称号・進捗表示のみに使います。換金機能はありません。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
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

  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  heroEmoji: { fontSize: 72 },
  heroLabel: { fontSize: font.title, fontWeight: '900', marginTop: spacing.sm },
  heroPoints: { fontSize: font.heading, fontWeight: '800', color: colors.text, marginTop: 2 },
  nextText: {
    marginTop: spacing.md,
    fontSize: font.sub,
    color: colors.textSub,
    fontWeight: '600',
  },

  tileRow: { flexDirection: 'row' },

  sectionLabel: { fontSize: font.sub, fontWeight: '700', color: colors.textSub },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  tierRowCurrent: { backgroundColor: colors.surfaceAlt },
  tierEmoji: { fontSize: 30 },
  tierLabel: { fontSize: font.body, fontWeight: '800', color: colors.text },
  tierReq: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  dim: { opacity: 0.4 },
  check: { fontSize: font.heading, color: colors.success, fontWeight: '800' },
  lock: { fontSize: font.body },
  currentTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  currentTagText: { color: '#fff', fontSize: font.small, fontWeight: '700' },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

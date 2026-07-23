import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { FlameHero } from '@/components/FlameHero';
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
  const spanStart = progress.rank.minPoints;
  const spanEnd = nextRank ? nextRank.minPoints : spanStart;
  const spanRatio = nextRank ? (progress.points - spanStart) / (spanEnd - spanStart) : 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 現在ランクのヒーロー */}
      <FlameHero icon={progress.rank.icon} iconSize={130} style={styles.hero}>
        <View style={[styles.heroIconWrap, { backgroundColor: `${progress.rank.color}1F` }]}>
          <Ionicons name={progress.rank.icon} size={40} color={progress.rank.color} />
        </View>
        <Text style={styles.heroLabel}>{progress.rank.label}</Text>
        <Text style={styles.heroPoints}>{progress.points} pt</Text>
        <View style={{ height: spacing.lg, alignSelf: 'stretch' }} />
        <ProgressBar ratio={spanRatio} height={10} />
        <Text style={styles.nextText}>
          {nextRank
            ? `次の ${nextRank.label} まであと ${progress.pointsToNext}pt`
            : '最高ランクに到達しました！'}
        </Text>
      </FlameHero>

      {/* サマリー数値 */}
      <View style={styles.tileRow}>
        <StatTile value={progress.streak} label="連続達成" icon="flame" />
        <View style={{ width: spacing.md }} />
        <StatTile value={progress.bestStreak} label="最高連続" icon="medal" accent={colors.warning} />
        <View style={{ width: spacing.md }} />
        <StatTile
          value={progress.doneCount}
          label="達成日数"
          icon="checkmark-circle"
          accent={colors.success}
        />
      </View>

      {/* ランク一覧 */}
      <Card>
        <Text style={styles.sectionLabel}>称号一覧</Text>
        <View style={{ height: spacing.sm }} />
        {RANK_TIERS.map((tier) => {
          const reached = progress.points >= tier.minPoints;
          const isCurrent = tier.key === progress.rank.key;
          return (
            <View key={tier.key} style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}>
              <View style={[styles.tierIcon, { backgroundColor: reached ? `${tier.color}22` : colors.surfaceAlt }]}>
                <Ionicons
                  name={tier.icon}
                  size={22}
                  color={reached ? tier.color : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierLabel, !reached && styles.dim]}>{tier.label}</Text>
                <Text style={styles.tierReq}>{tier.minPoints}pt〜</Text>
              </View>
              {isCurrent ? (
                <View style={styles.currentTag}>
                  <Text style={styles.currentTagText}>現在</Text>
                </View>
              ) : reached ? (
                <Ionicons name="checkmark" size={20} color={colors.success} />
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
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
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { fontSize: font.title, fontWeight: '900', color: colors.onFlame, marginTop: spacing.sm },
  heroPoints: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.onFlame,
    opacity: 0.95,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  nextText: { marginTop: spacing.md, fontSize: font.sub, color: colors.onFlame, opacity: 0.95, fontWeight: '700' },

  tileRow: { flexDirection: 'row' },

  sectionLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  tierRowCurrent: { backgroundColor: colors.surfaceAlt },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: { fontSize: font.body, fontWeight: '800', color: colors.text },
  tierReq: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  dim: { opacity: 0.4 },
  currentTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  currentTagText: { color: colors.onAccent, fontSize: font.small, fontWeight: '800' },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

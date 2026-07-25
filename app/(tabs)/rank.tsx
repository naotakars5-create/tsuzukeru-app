import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { FlameHero } from '@/components/FlameHero';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { RANK_TIERS } from '@/logic/rank';

/** ランク / ポイント画面。称号・実績バッジ・通算スタッツを表示（換金機能はない）。 */
export default function RankScreen() {
  const router = useRouter();
  const { goal, progress, lifetime, badges, unlockedBadgeCount, seasonNumber } = useApp();

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

      <PrimaryButton
        label="成果をシェアする"
        icon="share-social"
        variant="secondary"
        onPress={() => router.push('/share-card')}
      />

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

      {/* 実績バッジ（コレクション） */}
      <Card>
        <View style={styles.badgeHead}>
          <Text style={styles.sectionLabel}>実績バッジ</Text>
          <Text style={styles.badgeCount}>
            {unlockedBadgeCount} / {badges.length} 獲得
          </Text>
        </View>
        <View style={styles.badgeGrid}>
          {badges.map((b) => {
            const unlocked = !!b.unlockedAt;
            return (
              <View key={b.key} style={styles.badgeItem}>
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: unlocked ? `${b.color}22` : colors.surfaceAlt },
                    unlocked && { borderColor: b.color, borderWidth: 1 },
                  ]}
                >
                  <Ionicons
                    name={unlocked ? b.icon : 'lock-closed'}
                    size={24}
                    color={unlocked ? b.color : colors.textMuted}
                  />
                  {b.isNew && (
                    <View style={styles.newTag}>
                      <Text style={styles.newTagText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.badgeLabel, !unlocked && styles.dim]} numberOfLines={1}>
                  {b.label}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {b.description}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 通算スタッツ（シーズンをまたいで積み上がる） */}
      <Card>
        <Text style={styles.sectionLabel}>通算スタッツ</Text>
        <View style={styles.lifeRow}>
          <LifeStat icon="albums" label="シーズン" value={seasonNumber} unit="季目" />
          <LifeStat icon="layers" label="通算達成" value={progress.totalDone} unit="回" />
        </View>
        <View style={styles.lifeRow}>
          <LifeStat
            icon="ribbon"
            label="完全達成シーズン"
            value={lifetime.perfectSeasons}
            unit="回"
            accent={colors.warning}
          />
          <LifeStat
            icon="remove-circle"
            label="通算没収"
            value={`¥${lifetime.totalCharged.toLocaleString()}`}
            accent={colors.danger}
          />
        </View>
      </Card>

      <Text style={styles.note}>
        ※ ポイントはアプリ内の称号・進捗表示のみに使います。換金機能はありません。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/** 通算スタッツの1マス */
function LifeStat({
  icon,
  label,
  value,
  unit,
  accent = colors.text,
}: {
  icon: import('@/types').IconName;
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <View style={styles.lifeStat}>
      <Ionicons name={icon} size={16} color={colors.textSub} />
      <View style={{ flex: 1 }}>
        <Text style={styles.lifeLabel}>{label}</Text>
        <View style={styles.lifeValueRow}>
          <Text style={[styles.lifeValue, { color: accent }]}>{value}</Text>
          {unit ? <Text style={styles.lifeUnit}> {unit}</Text> : null}
        </View>
      </View>
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

  // 実績バッジ
  badgeHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badgeCount: { fontSize: 12, color: colors.textSub, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeItem: { width: '31%', alignItems: 'center', marginBottom: spacing.lg },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTag: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newTagText: { fontSize: 8, fontWeight: '900', color: colors.onAccent, letterSpacing: 0.5 },
  badgeLabel: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 8, textAlign: 'center' },
  badgeDesc: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center', lineHeight: 13 },

  // 通算スタッツ
  lifeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  lifeStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  lifeLabel: { fontSize: 11, color: colors.textSub, fontWeight: '600' },
  lifeValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 1 },
  lifeValue: { fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  lifeUnit: { fontSize: 11, color: colors.textSub, fontWeight: '600' },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

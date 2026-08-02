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
import { RankMedal } from '@/components/RankMedal';
import { Art } from '@/components/Art';
import { colors, font, radius, spacing } from '@/theme';
import {
  RANK_TIERS,
  POINTS_PER_DONE,
  STREAK_BONUS_EVERY,
  STREAK_BONUS_POINTS,
} from '@/logic/rank';

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

  // ポイントの内訳（理屈を明示するため）
  const basePts = progress.totalDone * POINTS_PER_DONE;
  const streakBonusCount = Math.floor(progress.bestStreak / STREAK_BONUS_EVERY);
  const bonusPts = streakBonusCount * STREAK_BONUS_POINTS;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 現在ランクのヒーロー */}
      <FlameHero icon={null} style={styles.hero}>
        <Art name="medal" size={150} />
        <Text style={styles.heroLabel}>{progress.rank.label}</Text>
        <Text style={styles.heroPoints}>{progress.points} pt</Text>

        {/* 次ランクへの道のり（今→次を視覚化） */}
        <View style={styles.progWrap}>
          <View style={styles.progBarRow}>
            <View style={{ flex: 1 }}>
              <ProgressBar ratio={spanRatio} height={10} />
            </View>
            {nextRank && (
              <View style={styles.nextMedalWrap}>
                <RankMedal rank={nextRank} size={44} locked />
              </View>
            )}
          </View>
          {nextRank ? (
            <Text style={styles.nextText}>
              次の <Text style={styles.nextStrong}>{nextRank.label}</Text> まで あと{' '}
              <Text style={styles.nextStrong}>{progress.pointsToNext}pt</Text>
            </Text>
          ) : (
            <Text style={styles.nextText}>最高ランクに到達しました！</Text>
          )}
        </View>
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
        <StatTile value={progress.bestStreak} label="最高連続" icon="medal" accent={colors.silver} />
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
              <RankMedal rank={tier} size={46} locked={!reached} />
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
            icon="checkmark-circle"
            label="通算免除"
            value={`¥${lifetime.totalWaived.toLocaleString()}`}
            accent={colors.success}
          />
        </View>
      </Card>

      {/* ポイントの仕組み（参考・一番下） */}
      <Card>
        <View style={styles.ptHead}>
          <Ionicons name="help-circle" size={18} color={colors.textSub} />
          <Text style={styles.ptTitle}>ポイントの決まり方</Text>
        </View>
        <Text style={styles.ptLead}>
          ポイントは
          <Text style={styles.ptStrong}>勉強した「時間の長さ」ではなく</Text>、
          1日の目標時間に届いた
          <Text style={styles.ptStrong}>「達成日数」と「連続」</Text>
          で決まります。短時間でも毎日続けるほど伸びます。
        </Text>

        <View style={styles.formulaRow}>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaLabel}>達成ベース</Text>
            <Text style={styles.formulaCalc}>
              {progress.totalDone}日 × {POINTS_PER_DONE}pt
            </Text>
            <Text style={styles.formulaVal}>{basePts.toLocaleString()}pt</Text>
          </View>
          <Text style={styles.formulaPlus}>＋</Text>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaLabel}>連続ボーナス</Text>
            <Text style={styles.formulaCalc}>
              {STREAK_BONUS_EVERY}日連続 × {streakBonusCount}回
            </Text>
            <Text style={styles.formulaVal}>{bonusPts.toLocaleString()}pt</Text>
          </View>
          <Text style={styles.formulaPlus}>＝</Text>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaLabel}>合計</Text>
            <Text style={styles.formulaCalc}>あなたの</Text>
            <Text style={[styles.formulaVal, { color: colors.primary }]}>
              {progress.points.toLocaleString()}pt
            </Text>
          </View>
        </View>

        <View style={styles.ptBullets}>
          <PtBullet
            text={`「達成」= その日の勉強時間が1日の目標に届くこと（達成1日ごとに +${POINTS_PER_DONE}pt）`}
          />
          <PtBullet
            text={`${STREAK_BONUS_EVERY}日連続で達成するごとに、さらに +${STREAK_BONUS_POINTS}pt のボーナス`}
          />
          <PtBullet text="勉強時間そのものは別に記録され、ランキングやプロフィールに表示されます" />
          <PtBullet text="ポイントは称号・進捗の表示だけに使い、換金はできません" />
        </View>
      </Card>

      <Text style={styles.note}>
        ※ ポイントはアプリ内の称号・進捗表示のみに使います。換金機能はありません。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/** ポイント説明の箇条書き1行 */
function PtBullet({ text }: { text: string }) {
  return (
    <View style={styles.ptBulletRow}>
      <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginTop: 1 }} />
      <Text style={styles.ptBulletText}>{text}</Text>
    </View>
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
  progWrap: { alignSelf: 'stretch', marginTop: spacing.xl },
  progBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nextMedalWrap: { alignItems: 'center', justifyContent: 'center' },
  nextText: { marginTop: spacing.md, fontSize: font.sub, color: colors.onFlame, opacity: 0.95, fontWeight: '700' },
  nextStrong: { color: colors.primary, fontWeight: '900' },

  tileRow: { flexDirection: 'row' },

  sectionLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },

  ptHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ptTitle: { fontSize: font.body, fontWeight: '900', color: colors.text },
  ptLead: { fontSize: font.sub, color: colors.textSub, lineHeight: 21, marginTop: spacing.sm },
  ptStrong: { color: colors.text, fontWeight: '800' },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  formulaItem: { flex: 1, alignItems: 'center' },
  formulaLabel: { fontSize: 10, color: colors.textSub, fontWeight: '700' },
  formulaCalc: { fontSize: 10, color: colors.textMuted, marginTop: 3, fontVariant: ['tabular-nums'] },
  formulaVal: {
    fontSize: font.body,
    fontWeight: '900',
    color: colors.text,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  formulaPlus: { fontSize: font.body, color: colors.textMuted, fontWeight: '800', marginHorizontal: 2 },
  ptBullets: { marginTop: spacing.md, gap: spacing.sm },
  ptBulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  ptBulletText: { flex: 1, fontSize: font.small, color: colors.textSub, lineHeight: 17 },

  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  tierRowCurrent: {
    backgroundColor: 'rgba(198,244,50,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.4)',
  },
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

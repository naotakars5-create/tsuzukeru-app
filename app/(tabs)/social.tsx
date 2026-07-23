import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { FlameHero } from '@/components/FlameHero';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { buildLeaderboard, buildTeamMembers } from '@/logic/social';
import { LeaderboardEntry } from '@/types';

/**
 * 仲間タブ: 同じカテゴリのチーム（モック）とランキング（モック）。
 * サーバーが無いため、仲間はダミーデータ。将来ここをAPI連携に差し替える。
 */
export default function SocialScreen() {
  const { goal, progress } = useApp();

  const category = categoryOf(goal?.category);

  const leaderboard = useMemo(
    () => buildLeaderboard(category.key, progress.points, progress.streak),
    [category.key, progress.points, progress.streak]
  );
  const team = useMemo(
    () => buildTeamMembers(category.key, progress.points, progress.streak),
    [category.key, progress.points, progress.streak]
  );

  if (!goal) {
    return (
      <View style={styles.center}>
        <Ionicons name="people" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>目標を設定すると、同じカテゴリの{'\n'}仲間とつながれます。</Text>
      </View>
    );
  }

  const myRankIndex = leaderboard.findIndex((e) => e.isMe);
  const teamTotal = team.reduce((s, m) => s + m.points, 0);

  const onInvite = () => {
    Alert.alert('招待リンク（ダミー）', '招待リンクをコピーしました。\n※ 実際の共有機能は今後追加予定です。');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 自分の順位ヒーロー */}
      <FlameHero icon="podium" iconSize={120}>
        <View style={styles.catRow}>
          <Ionicons name={category.icon} size={14} color={colors.onFlame} />
          <Text style={styles.catText}>{category.label}カテゴリ</Text>
        </View>
        <View style={styles.heroRow}>
          <Text style={styles.heroBig}>{myRankIndex + 1}</Text>
          <Text style={styles.heroUnit}>位</Text>
          <Text style={styles.heroTotal}>/ {leaderboard.length}人中</Text>
        </View>
        <Text style={styles.heroSub}>
          {myRankIndex === 0
            ? 'カテゴリ1位！この座を守り抜こう'
            : `${leaderboard[myRankIndex - 1].name} まであと ${
                leaderboard[myRankIndex - 1].points - progress.points
              }pt`}
        </Text>
      </FlameHero>

      {/* チーム */}
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.titleRow}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{category.teamName}</Text>
          </View>
          <View style={styles.teamTotalPill}>
            <Ionicons name="flash" size={12} color={colors.warning} />
            <Text style={styles.teamTotalText}>{teamTotal.toLocaleString()}pt</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>同じカテゴリの仲間チーム（ダミー）</Text>

        <View style={{ height: spacing.sm }} />
        {team.map((m) => (
          <MemberRow key={m.id} entry={m} />
        ))}

        <PrimaryButton
          label="仲間を招待する"
          variant="secondary"
          onPress={onInvite}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* ランキング */}
      <Card>
        <View style={styles.titleRow}>
          <Ionicons name="podium" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>{category.label}ランキング</Text>
        </View>
        <Text style={styles.sectionSub}>同じカテゴリで頑張る人たちと競おう（ダミー）</Text>
        <View style={{ height: spacing.sm }} />

        {leaderboard.map((e, i) => (
          <RankRow key={e.id} entry={e} position={i + 1} />
        ))}
      </Card>

      <Text style={styles.note}>
        ※ 仲間・ランキングは試作用のダミーデータです。実際の友だち連携は今後追加予定です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/** チームメンバー行 */
function MemberRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View style={[styles.memberRow, entry.isMe && styles.meRow]}>
      <Avatar name={entry.name} isMe={entry.isMe} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, entry.isMe && { color: colors.primary }]}>
          {entry.name}
        </Text>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={12} color={colors.primary} />
          <Text style={styles.streakText}>連続{entry.streak}日</Text>
        </View>
      </View>
      <Text style={styles.memberPoints}>{entry.points.toLocaleString()}pt</Text>
    </View>
  );
}

/** ランキング行（上位3位はメダル色） */
const MEDAL_COLORS = ['#FFC24B', '#C9CDD6', '#D8956B'];

function RankRow({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const isTop3 = position <= 3;
  return (
    <View style={[styles.rankRow, entry.isMe && styles.meRow]}>
      <View style={styles.posWrap}>
        {isTop3 ? (
          <Ionicons name="medal" size={22} color={MEDAL_COLORS[position - 1]} />
        ) : (
          <Text style={styles.posText}>{position}</Text>
        )}
      </View>
      <Avatar name={entry.name} isMe={entry.isMe} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, entry.isMe && { color: colors.primary }]}>
          {entry.name}
        </Text>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={11} color={colors.textMuted} />
          <Text style={styles.streakText}>連続{entry.streak}日</Text>
        </View>
      </View>
      <Text style={[styles.memberPoints, entry.isMe && { color: colors.primary }]}>
        {entry.points.toLocaleString()}pt
      </Text>
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
    gap: spacing.lg,
  },
  emptyText: { fontSize: font.body, color: colors.textSub, textAlign: 'center', lineHeight: 24 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.onFlame,
    opacity: 0.9,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  heroBig: {
    fontSize: font.hero,
    fontWeight: '900',
    color: colors.onFlame,
    lineHeight: font.hero,
    letterSpacing: -1,
  },
  heroUnit: { fontSize: font.heading, fontWeight: '800', color: colors.onFlame, marginLeft: 4, marginBottom: 6 },
  heroTotal: {
    fontSize: font.sub,
    fontWeight: '700',
    color: colors.onFlame,
    opacity: 0.85,
    marginLeft: 8,
    marginBottom: 8,
  },
  heroSub: { fontSize: font.sub, fontWeight: '600', color: colors.onFlame, opacity: 0.95, marginTop: 4 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: font.body, fontWeight: '900', color: colors.text },
  sectionSub: { fontSize: font.small, color: colors.textMuted, marginTop: 4 },
  teamTotalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  teamTotalText: { fontSize: font.small, fontWeight: '800', color: colors.warning },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  meRow: {
    backgroundColor: 'rgba(240,71,46,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240,71,46,0.45)',
  },
  posWrap: { width: 26, alignItems: 'center' },
  posText: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  memberName: { fontSize: font.sub, fontWeight: '800', color: colors.text },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  streakText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  memberPoints: {
    fontSize: font.sub,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
});

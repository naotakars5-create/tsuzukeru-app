import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { colors, font, labelStyle, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import {
  buildLeaderboard,
  monthlyRankDelta,
  rankIndexOf,
  communityCount,
} from '@/logic/social';
import { POINTS_PER_DONE } from '@/logic/rank';
import { formatMinutesShort } from '@/logic/time';
import { LeaderboardEntry } from '@/types';

/**
 * 仲間タブ: 月間ランキング。自分の順位を主役に、近しいランクの相手と競う。
 * 「みんな（自動マッチング）」と「マイグループ」を切り替えられる。
 * サーバーが無いため仲間はダミー。将来API連携に差し替える。
 */
export default function SocialScreen() {
  const router = useRouter();
  const { goal, progress, seasonResult, group, profile } = useApp();

  const category = categoryOf(goal?.category);
  const myRankIndex = rankIndexOf(progress.points);
  const myMonthPoints = seasonResult.done * POINTS_PER_DONE;
  const myMonthMinutes = seasonResult.minutes;

  const leaderboard = useMemo(
    () =>
      buildLeaderboard(
        category.key,
        myRankIndex,
        myMonthPoints,
        progress.streak,
        myMonthMinutes,
        profile.motivation
      ),
    [category.key, myRankIndex, myMonthPoints, progress.streak, myMonthMinutes, profile.motivation]
  );
  const commCount = communityCount(category.key, leaderboard.length);

  if (!goal) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          目標を設定すると、同じカテゴリの{'\n'}仲間と月間ランキングで競えます。
        </Text>
      </View>
    );
  }

  const myIndex = leaderboard.findIndex((e) => e.isMe);
  const myPosition = myIndex + 1;
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null;
  const delta = monthlyRankDelta(category.key);

  const openProfile = (e: LeaderboardEntry) => {
    if (e.isMe) router.push('/profile-edit');
    else router.push({ pathname: '/rival/[id]', params: { id: e.id, category: category.key } });
  };

  const myPhoto = profile.photo ?? null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* コミュニティ（同じ資格） */}
      <View style={[styles.commCard, { borderColor: `${category.color}55` }]}>
        <View style={[styles.commIcon, { backgroundColor: `${category.color}22` }]}>
          <Ionicons name={category.icon} size={22} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.commName}>{category.label} コミュニティ</Text>
          <View style={styles.commMetaRow}>
            <Ionicons name="people" size={13} color={colors.textSub} />
            <Text style={styles.commMeta}>
              <Text style={[styles.commCount, { color: category.color }]}>{commCount}</Text> 人が挑戦中
            </Text>
          </View>
        </View>
      </View>

      {/* 自分の順位ヒーロー */}
      <LinearGradient
        colors={['#1C232C', '#141920']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>
          あなたの順位 ・ {group ? group.name : `${category.label}・今月`}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroNumRow}>
            <Text style={styles.heroNum}>{myPosition}</Text>
            <Text style={styles.heroNumUnit}>位</Text>
          </View>
          <Text style={styles.heroTotal}>/ {leaderboard.length}人中</Text>
          <View style={styles.deltaWrap}>
            {delta > 0 ? (
              <View style={styles.deltaRow}>
                <Ionicons name="arrow-up" size={14} color={colors.success} />
                <Text style={styles.deltaText}>先月から{delta}つ上昇</Text>
              </View>
            ) : (
              <Text style={styles.deltaSame}>先月と同じ順位</Text>
            )}
          </View>
        </View>
        <Text style={styles.heroNext}>
          {above ? (
            <>
              {myPosition - 1}位まであと{' '}
              <Text style={styles.heroNextNum}>
                {(above.points - myMonthPoints).toLocaleString()} pt
              </Text>
              （今月）
            </>
          ) : (
            '1位キープ中。今月も逃げ切ろう。'
          )}
        </Text>
      </LinearGradient>

      {/* コミュニティ（テーマ別・任意参加） */}
      {group ? (
        <Pressable style={styles.groupCard} onPress={() => router.push('/communities')}>
          <View style={styles.groupHead}>
            <View style={styles.titleRow}>
              <Ionicons name="people-circle" size={18} color={colors.primary} />
              <Text style={styles.groupName}>{group.name}</Text>
              {group.owner ? <Text style={styles.ownerTag}>作成者</Text> : null}
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.changeText}>探す/変更</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSub} />
            </View>
          </View>
          {group.tagline ? <Text style={styles.groupTagline}>{group.tagline}</Text> : null}
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>参加コード</Text>
            <Text style={styles.codeValue}>{group.code}</Text>
            {typeof group.members === 'number' ? (
              <Text style={styles.codeLabel}>・{group.members}人</Text>
            ) : null}
          </View>
        </Pressable>
      ) : (
        <View style={styles.groupJoin}>
          <Text style={styles.groupJoinText}>
            資格ランキングに加えて、テーマ別コミュニティにも参加できます（朝活・社会人など）。
          </Text>
          <View style={styles.groupBtnRow}>
            <Pressable style={styles.discoverBtn} onPress={() => router.push('/communities')}>
              <Ionicons name="search" size={16} color={colors.onAccent} />
              <Text style={styles.discoverBtnText}>コミュニティを探す・作る</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ランキング */}
      <View style={styles.rankHead}>
        <Text style={styles.sectionLabel}>月間ランキング</Text>
        <Text style={styles.rankPeriod}>今月</Text>
      </View>

      <View style={styles.list}>
        {leaderboard.map((e, i) => (
          <RankRow
            key={e.id}
            entry={e}
            position={i + 1}
            photo={e.isMe ? myPhoto : null}
            onPress={() => openProfile(e)}
          />
        ))}
      </View>

      <Text style={styles.note}>
        ※ 仲間・ランキングは試作用のダミーデータです（近しいランクの相手が集まります）。実際の友だち連携は今後追加予定です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const MEDAL_COLORS = [colors.gold, colors.silver, colors.bronze];

function RankRow({
  entry,
  position,
  photo,
  onPress,
}: {
  entry: LeaderboardEntry;
  position: number;
  photo?: string | null;
  onPress: () => void;
}) {
  const isTop3 = position <= 3;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        entry.isMe && styles.meRow,
        entry.broken && styles.brokenRow,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.posWrap}>
        {isTop3 ? (
          <Ionicons name="medal" size={22} color={MEDAL_COLORS[position - 1]} />
        ) : (
          <Text style={[styles.posText, entry.isMe && { color: colors.primary }]}>{position}</Text>
        )}
      </View>

      {entry.isMe && photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : entry.isMe ? (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="person" size={20} color={colors.onAccent} />
        </View>
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{entry.name.slice(0, 1)}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, entry.isMe && { fontWeight: '800' }]}>{entry.name}</Text>
        {/* ランク称号 ＋ 勉強時間 */}
        <View style={styles.rankTagRow}>
          <Ionicons name={entry.rank.icon} size={11} color={entry.rank.color} />
          <Text style={[styles.rankTagText, { color: entry.rank.color }]}>{entry.rank.label}</Text>
          <Ionicons name="time" size={11} color={colors.textMuted} style={{ marginLeft: 4 }} />
          <Text style={styles.streakText}>{formatMinutesShort(entry.studyMinutes)}</Text>
          {entry.broken && <Text style={styles.brokenText}>・連続0日</Text>}
        </View>
        {/* 意気込み */}
        <Text style={styles.motto} numberOfLines={1}>
          “{entry.motivation}”
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.points, entry.isMe && { color: colors.primary }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  emptyText: { fontSize: font.body, color: colors.textSub, textAlign: 'center', lineHeight: 24 },

  commCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  commIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  commName: { fontSize: 15, fontWeight: '900', color: colors.text },
  commMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  commMeta: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  commCount: { fontWeight: '900', fontVariant: ['tabular-nums'] },

  hero: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22 },
  heroLabel: { ...labelStyle, color: colors.textSub, marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroNumRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroNum: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 66,
    letterSpacing: -2,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  heroNumUnit: { fontSize: 26, fontWeight: '700', color: colors.textSub, marginBottom: 4 },
  heroTotal: { fontSize: 15, fontWeight: '600', color: colors.textSub, marginLeft: 12, marginBottom: 8 },
  deltaWrap: { marginLeft: 'auto', marginBottom: 8 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deltaText: { fontSize: 13, fontWeight: '700', color: colors.success },
  deltaSame: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  heroNext: { marginTop: 14, fontSize: 13, color: colors.textSub },
  heroNextNum: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },

  groupCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 15, fontWeight: '800', color: colors.text },
  ownerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onAccent,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  changeText: { fontSize: 12, color: colors.textSub, fontWeight: '700' },
  groupTagline: { fontSize: 12, color: colors.textSub, marginTop: 6 },
  leaveText: { fontSize: 13, color: colors.danger, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  codeLabel: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  codeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },

  groupJoin: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  groupJoinText: { fontSize: 13, color: colors.textSub, fontWeight: '600', lineHeight: 19 },
  groupBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  discoverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
  },
  discoverBtnText: { fontSize: 14, fontWeight: '800', color: colors.onAccent },

  rankHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionLabel: { ...labelStyle },
  rankPeriod: { fontSize: 12, color: colors.textSub },

  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
  },
  meRow: { backgroundColor: 'rgba(198,244,50,0.08)', borderColor: 'rgba(198,244,50,0.4)' },
  brokenRow: { opacity: 0.7 },
  posWrap: { width: 26, alignItems: 'center' },
  posText: { fontSize: 15, fontWeight: '700', color: colors.textSub, fontVariant: ['tabular-nums'] },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A3340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 15, fontWeight: '800', color: colors.textSub },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  rankTagRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rankTagText: { fontSize: 11, fontWeight: '800' },
  streakText: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  brokenText: { fontSize: 11, color: colors.danger },
  motto: { fontSize: 11, color: colors.textSub, marginTop: 2 },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  points: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: 18 },
});

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
  myRankInSample,
  RIVAL_SAMPLE_SIZE,
  LEADERBOARD_TOP_N,
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
  const { goal, progress, seasonResult, groups, profile, unreadByCode } = useApp();

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
  const commCount = communityCount(category.key);

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
  // 表示は上位10人＋自分だが、順位は抽出母数（30人＋自分）での本当の順位を出す
  const sample = myRankInSample(category.key, myRankIndex, myMonthPoints);
  const myPosition = sample.position;
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null;
  const delta = monthlyRankDelta(category.key);

  const openProfile = (e: LeaderboardEntry) => {
    if (e.isMe) router.push('/profile-edit');
    else router.push({ pathname: '/rival/[id]', params: { id: e.id, category: category.key } });
  };

  const myPhoto = profile.photo ?? null;

  const openCommunity = (g: (typeof groups)[number]) => {
    router.push({
      pathname: '/community/[code]',
      params: {
        code: g.code,
        name: g.name,
        category: g.category ?? '',
        tagline: g.tagline ?? '',
        members: g.members != null ? String(g.members) : '',
      },
    });
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const maxPoints = leaderboard[0]?.points || 1;

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

      {/* トップ3の表彰台（視覚的なランキングの主役） */}
      <Podium entries={top3} myPhoto={myPhoto} onPress={openProfile} />

      {/* 自分の順位ヒーロー */}
      <LinearGradient
        colors={['#1C232C', '#141920']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>
          あなたの順位 ・ {category.label}・今月
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroNumRow}>
            <Text style={styles.heroNum}>{myPosition}</Text>
            <Text style={styles.heroNumUnit}>位</Text>
          </View>
          <Text style={styles.heroTotal}>/ {sample.total}人中</Text>
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

      {/* コミュニティ（テーマ別・最大3つまで参加） */}
      {groups.length > 0 ? (
        <View style={styles.groupsWrap}>
          <View style={styles.groupsHead}>
            <Text style={styles.groupsTitle}>参加中のコミュニティ（{groups.length}/3）</Text>
            <Pressable style={styles.titleRow} onPress={() => router.push('/communities')} hitSlop={8}>
              <Text style={styles.changeText}>探す/追加</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSub} />
            </Pressable>
          </View>
          {groups.map((g) => {
            const unread = unreadByCode[g.code] ?? 0;
            return (
              <Pressable key={g.code} style={styles.groupCard} onPress={() => openCommunity(g)}>
                <View style={styles.groupHead}>
                  <View style={styles.titleRow}>
                    <Ionicons name="people-circle" size={18} color={colors.primary} />
                    <Text style={styles.groupName} numberOfLines={1}>
                      {g.name}
                    </Text>
                    {g.owner ? <Text style={styles.ownerTag}>作成者</Text> : null}
                  </View>
                  {unread > 0 ? (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>新着 {unread}件</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  )}
                </View>
                <View style={styles.codeRow}>
                  <Ionicons name="chatbubbles" size={12} color={colors.textSub} />
                  <Text style={styles.codeLabel}>ランキング・掲示板</Text>
                  {typeof g.members === 'number' ? (
                    <Text style={styles.codeLabel}>・{g.members}人</Text>
                  ) : null}
                  <Text style={styles.codeLabel}>・コード {g.code}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.groupJoin}>
          <Text style={styles.groupJoinText}>
            資格ランキングに加えて、テーマ別コミュニティにも参加できます（最大3つ・朝活・社会人など）。
          </Text>
          <View style={styles.groupBtnRow}>
            <Pressable style={styles.discoverBtn} onPress={() => router.push('/communities')}>
              <Ionicons name="search" size={16} color={colors.onAccent} />
              <Text style={styles.discoverBtnText}>コミュニティを探す・作る</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ランキング（4位以下） */}
      <View style={styles.rankHead}>
        <Text style={styles.sectionLabel}>
          {rest.length > 0 ? '4位以下' : '月間ランキング'}
        </Text>
        <Text style={styles.rankPeriod}>今月 ・ 上位{LEADERBOARD_TOP_N}人＋あなた</Text>
      </View>

      <View style={styles.list}>
        {(rest.length > 0 ? rest : leaderboard).map((e, i) => (
          <RankRow
            key={e.id}
            entry={e}
            position={rest.length > 0 ? i + 4 : i + 1}
            photo={e.isMe ? myPhoto : null}
            maxPoints={maxPoints}
            onPress={() => openProfile(e)}
          />
        ))}
      </View>

      <Text style={styles.note}>
        ※ 対戦相手は毎日、同じ資格の挑戦者から
        <Text style={styles.noteStrong}>ランダムに{RIVAL_SAMPLE_SIZE}人</Text>
        が選ばれます（近しいランクの相手が集まります）。ランキングにはそのうち
        <Text style={styles.noteStrong}>上位{LEADERBOARD_TOP_N}人とあなた</Text>
        を表示しています。試作用のダミーデータで、実際の友だち連携は今後追加予定です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const MEDAL_COLORS = [colors.gold, colors.silver, colors.bronze];

/** トップ3の表彰台 */
function Podium({
  entries,
  myPhoto,
  onPress,
}: {
  entries: LeaderboardEntry[];
  myPhoto: string | null;
  onPress: (e: LeaderboardEntry) => void;
}) {
  if (entries.length < 3) return null;
  const order = [entries[1], entries[0], entries[2]]; // 表示は 2位・1位・3位
  const positions = [2, 1, 3];
  const heights = [58, 84, 46];
  return (
    <View style={styles.podium}>
      {order.map((e, idx) => (
        <PodiumCol
          key={e.id}
          entry={e}
          position={positions[idx]}
          height={heights[idx]}
          photo={e.isMe ? myPhoto : null}
          onPress={() => onPress(e)}
        />
      ))}
    </View>
  );
}

function PodiumCol({
  entry,
  position,
  height,
  photo,
  onPress,
}: {
  entry: LeaderboardEntry;
  position: number;
  height: number;
  photo: string | null;
  onPress: () => void;
}) {
  const medal = MEDAL_COLORS[position - 1];
  const first = position === 1;
  const av = first ? 62 : 52;
  return (
    <Pressable style={styles.podCol} onPress={onPress}>
      {first ? (
        <Ionicons name="trophy" size={20} color={medal} style={{ marginBottom: 2 }} />
      ) : (
        <View style={{ height: 22 }} />
      )}
      <View
        style={[
          styles.podAvatar,
          { width: av, height: av, borderRadius: av / 2, borderColor: medal },
          entry.isMe && { borderColor: colors.primary },
        ]}
      >
        {entry.isMe && photo ? (
          <Image source={{ uri: photo }} style={styles.podAvatarImg} />
        ) : entry.isMe ? (
          <Ionicons name="person" size={first ? 26 : 22} color={colors.primary} />
        ) : (
          <Text style={[styles.podInitial, first && { fontSize: 22 }]}>{entry.name.slice(0, 1)}</Text>
        )}
      </View>
      <Text style={[styles.podName, entry.isMe && { color: colors.primary }]} numberOfLines={1}>
        {entry.isMe ? 'あなた' : entry.name}
      </Text>
      <Text style={styles.podPts}>
        {entry.points.toLocaleString()}
        <Text style={styles.podPtsUnit}> pt</Text>
      </Text>
      <View style={[styles.podBar, { height, backgroundColor: `${medal}22`, borderColor: `${medal}66` }]}>
        <Text style={[styles.podRank, { color: medal }]}>{position}</Text>
      </View>
    </Pressable>
  );
}

function RankRow({
  entry,
  position,
  photo,
  maxPoints,
  onPress,
}: {
  entry: LeaderboardEntry;
  position: number;
  photo?: string | null;
  maxPoints: number;
  onPress: () => void;
}) {
  const isTop3 = position <= 3;
  const barPct = Math.max(6, Math.round((entry.points / maxPoints) * 100));
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
        {/* ポイントの相対バー（1位比） */}
        <View style={styles.ptBarTrack}>
          <View
            style={[
              styles.ptBarFill,
              { width: `${barPct}%`, backgroundColor: entry.isMe ? colors.primary : '#3A4450' },
            ]}
          />
        </View>
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

  groupsWrap: { marginTop: 16, gap: 8 },
  groupsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupsTitle: { fontSize: 13, fontWeight: '800', color: colors.textSub },
  groupCard: {
    marginTop: 0,
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
  enterHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  enterHintText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  unreadPill: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadPillText: { fontSize: 10, fontWeight: '900', color: colors.onAccent },
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

  // 表彰台
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4, paddingHorizontal: 4 },
  podCol: { flex: 1, alignItems: 'center' },
  podAvatar: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    marginBottom: 6,
    overflow: 'hidden',
  },
  podAvatarImg: { width: '100%', height: '100%' },
  podInitial: { fontSize: 18, fontWeight: '900', color: colors.textSub },
  podName: { fontSize: 12, fontWeight: '800', color: colors.text, maxWidth: '100%' },
  podPts: { fontSize: 14, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 1 },
  podPtsUnit: { fontSize: 10, color: colors.textSub, fontWeight: '700' },
  podBar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    marginTop: 8,
    alignItems: 'center',
    paddingTop: 6,
  },
  podRank: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },

  ptBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    marginTop: 7,
    overflow: 'hidden',
  },
  ptBarFill: { height: '100%', borderRadius: 3 },

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
  noteStrong: { color: colors.textSub, fontWeight: '800' },
});

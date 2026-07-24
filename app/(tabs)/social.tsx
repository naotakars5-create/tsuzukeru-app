import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { colors, font, labelStyle, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { buildLeaderboard, monthlyRankDelta, rankIndexOf, generateGroupCode } from '@/logic/social';
import { POINTS_PER_DONE } from '@/logic/rank';
import { LeaderboardEntry } from '@/types';
import { promptAsync, confirmAsync, notifyAsync } from '@/logic/confirm';

/**
 * 仲間タブ: 月間ランキング。自分の順位を主役に、近しいランクの相手と競う。
 * 「みんな（自動マッチング）」と「マイグループ」を切り替えられる。
 * サーバーが無いため仲間はダミー。将来API連携に差し替える。
 */
export default function SocialScreen() {
  const router = useRouter();
  const { goal, progress, seasonResult, group, setGroup } = useApp();

  const category = categoryOf(goal?.category);
  const myRankIndex = rankIndexOf(progress.points);
  const myMonthPoints = seasonResult.done * POINTS_PER_DONE;

  const leaderboard = useMemo(
    () => buildLeaderboard(category.key, myRankIndex, myMonthPoints, progress.streak),
    [category.key, myRankIndex, myMonthPoints, progress.streak]
  );

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

  const onCreateGroup = async () => {
    const name = await promptAsync('グループを作成', 'グループ名を入力', `${category.label}仲間`);
    if (!name) return;
    const code = generateGroupCode(name + Date.now());
    await setGroup({ code, name: name.trim(), owner: true });
    notifyAsync('グループを作成しました', `参加コード: ${code}\n※ 共有機能は今後追加予定です`);
  };
  const onJoinGroup = async () => {
    const code = await promptAsync('グループに参加', '参加コードを入力', '');
    if (!code) return;
    await setGroup({ code: code.trim().toUpperCase(), name: `グループ ${code.trim().toUpperCase()}`, owner: false });
  };
  const onLeaveGroup = async () => {
    const ok = await confirmAsync('グループを抜けますか？', undefined, '抜ける');
    if (ok) await setGroup(null);
  };

  const openProfile = (e: LeaderboardEntry) => {
    if (e.isMe) router.push('/profile-edit');
    else router.push({ pathname: '/rival/[id]', params: { id: e.id, category: category.key } });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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

      {/* グループ */}
      {group ? (
        <View style={styles.groupCard}>
          <View style={styles.groupHead}>
            <View style={styles.titleRow}>
              <Ionicons name="people-circle" size={18} color={colors.primary} />
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            <Pressable onPress={onLeaveGroup} hitSlop={8}>
              <Text style={styles.leaveText}>抜ける</Text>
            </Pressable>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>参加コード</Text>
            <Text style={styles.codeValue}>{group.code}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.groupJoin}>
          <Text style={styles.groupJoinText}>仲間だけのグループで競うこともできます</Text>
          <View style={styles.groupBtnRow}>
            <Pressable style={styles.groupBtn} onPress={onCreateGroup}>
              <Ionicons name="add-circle" size={16} color={colors.primary} />
              <Text style={styles.groupBtnText}>グループを作る</Text>
            </Pressable>
            <Pressable style={styles.groupBtn} onPress={onJoinGroup}>
              <Ionicons name="enter" size={16} color={colors.primary} />
              <Text style={styles.groupBtnText}>コードで参加</Text>
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
          <RankRow key={e.id} entry={e} position={i + 1} onPress={() => openProfile(e)} />
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
  onPress,
}: {
  entry: LeaderboardEntry;
  position: number;
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

      {entry.isMe ? (
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
        {/* ランク称号 */}
        <View style={styles.rankTagRow}>
          <Ionicons name={entry.rank.icon} size={11} color={entry.rank.color} />
          <Text style={[styles.rankTagText, { color: entry.rank.color }]}>{entry.rank.label}</Text>
          {entry.broken ? (
            <Text style={styles.brokenText}>・連続0日</Text>
          ) : (
            <Text style={styles.streakText}>・連続{entry.streak}日</Text>
          )}
        </View>
      </View>

      <Text style={[styles.points, entry.isMe && { color: colors.primary }]}>
        {entry.points.toLocaleString()}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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

  hero: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22 },
  heroLabel: { ...labelStyle, color: colors.textSub, marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroNumRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroNum: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 66,
    letterSpacing: -2,
    color: colors.orange,
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
  groupJoinText: { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  groupBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  groupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingVertical: 10,
  },
  groupBtnText: { fontSize: 13, fontWeight: '800', color: colors.text },

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
  points: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: 18 },
});

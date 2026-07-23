import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { colors, font, labelStyle, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { buildLeaderboard, weeklyRankDelta } from '@/logic/social';
import { LeaderboardEntry } from '@/types';

/**
 * 仲間タブ: 自分の順位を主役に、チーム内での立ち位置と次の目標ptを示す。
 * サーバーが無いため仲間はダミーデータ。将来ここをAPI連携に差し替える。
 */
export default function SocialScreen() {
  const { goal, progress } = useApp();

  const category = categoryOf(goal?.category);

  const leaderboard = useMemo(
    () => buildLeaderboard(category.key, progress.points, progress.streak),
    [category.key, progress.points, progress.streak]
  );

  if (!goal) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          目標を設定すると、同じカテゴリの{'\n'}仲間とランキングで競えます。
        </Text>
      </View>
    );
  }

  const myIndex = leaderboard.findIndex((e) => e.isMe);
  const myPosition = myIndex + 1;
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null;
  const delta = weeklyRankDelta(category.key);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 自分の順位ヒーロー（主役） */}
      <LinearGradient
        colors={['#1C232C', '#141920']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>
          あなたの順位 ・ {category.teamName}
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
                <Text style={styles.deltaText}>先週から{delta}つ上昇</Text>
              </View>
            ) : (
              <Text style={styles.deltaSame}>先週と同じ順位</Text>
            )}
          </View>
        </View>
        <Text style={styles.heroNext}>
          {above ? (
            <>
              {myPosition - 1}位まであと{' '}
              <Text style={styles.heroNextNum}>
                {(above.points - progress.points).toLocaleString()} pt
              </Text>
            </>
          ) : (
            '1位キープ中。逃げ切ろう。'
          )}
        </Text>
      </LinearGradient>

      {/* ランキング */}
      <View style={styles.rankHead}>
        <Text style={styles.sectionLabel}>ランキング</Text>
        <Text style={styles.rankPeriod}>今週</Text>
      </View>

      <View style={styles.list}>
        {leaderboard.map((e, i) => (
          <RankRow key={e.id} entry={e} position={i + 1} />
        ))}
      </View>

      <Text style={styles.note}>
        ※ 仲間・ランキングは試作用のダミーデータです。実際の友だち連携は今後追加予定です。
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const MEDAL_COLORS = [colors.gold, colors.silver, colors.bronze];

function RankRow({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const isTop3 = position <= 3;
  return (
    <View
      style={[
        styles.row,
        entry.isMe && styles.meRow,
        entry.broken && styles.brokenRow,
      ]}
    >
      <View style={styles.posWrap}>
        {isTop3 ? (
          <Ionicons name="medal" size={22} color={MEDAL_COLORS[position - 1]} />
        ) : (
          <Text style={[styles.posText, entry.isMe && { color: colors.primary }]}>
            {position}
          </Text>
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
        {entry.broken ? (
          <Text style={styles.subBroken}>連続0日 ・ 昨日途切れ</Text>
        ) : (
          <Text style={[styles.sub, (entry.isMe || position <= 1) && { color: colors.orange }]}>
            連続{entry.streak}日
          </Text>
        )}
      </View>

      <Text style={[styles.points, entry.isMe && { color: colors.primary }]}>
        {entry.points.toLocaleString()}
      </Text>
    </View>
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

  hero: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
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
  heroTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSub,
    marginLeft: 12,
    marginBottom: 8,
  },
  deltaWrap: { marginLeft: 'auto', marginBottom: 8 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deltaText: { fontSize: 13, fontWeight: '700', color: colors.success },
  deltaSame: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  heroNext: { marginTop: 14, fontSize: 13, color: colors.textSub },
  heroNextNum: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },

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
    paddingHorizontal: 14,
  },
  meRow: {
    backgroundColor: 'rgba(198,244,50,0.08)',
    borderColor: 'rgba(198,244,50,0.4)',
  },
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
  sub: { fontSize: 12, color: colors.textSub, marginTop: 1, fontVariant: ['tabular-nums'] },
  subBroken: { fontSize: 12, color: colors.danger, marginTop: 1 },
  points: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: 18 },
});

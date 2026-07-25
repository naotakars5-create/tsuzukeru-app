import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import { buildLeaderboard, rankIndexOf } from '@/logic/social';
import { POINTS_PER_DONE } from '@/logic/rank';
import { notifyAsync } from '@/logic/confirm';

const APP_URL = 'https://tsuzukeru-app.expo.app';

/** SNSシェア用の成果カード。スクショ＆Shareで拡散する。 */
export default function ShareCardScreen() {
  const { goal, progress, profile, seasonResult } = useApp();
  const category = categoryOf(goal?.category);

  // 月間ランキングでの立ち位置 → 上位◯%
  const topPct = useMemo(() => {
    const myRankIndex = rankIndexOf(progress.points);
    const board = buildLeaderboard(
      category.key,
      myRankIndex,
      seasonResult.done * POINTS_PER_DONE,
      progress.streak
    );
    const pos = board.findIndex((e) => e.isMe) + 1;
    return Math.max(1, Math.round((pos / board.length) * 100));
  }, [category.key, progress.points, progress.streak, seasonResult.done]);

  const onShare = async () => {
    const message =
      `【継続】${category.label}を勉強中！\n` +
      `🔥 ${progress.streak}日連続 ・ ${progress.rank.label} ・ ${category.label}で上位${topPct}%\n` +
      `通算${progress.totalDone}回達成。サボると課金、続けると報酬で継続する勉強アプリ。\n` +
      `#継続 #${category.label} #勉強垢\n${APP_URL}`;
    try {
      await Share.share(Platform.OS === 'ios' ? { message, url: APP_URL } : { message });
    } catch {
      // Web等でShareが使えない場合はクリップボードへ
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          notifyAsync('コピーしました', 'テキストをコピーしました。SNSに貼り付けて投稿できます。');
        }
      } catch {
        notifyAsync('シェア', 'このカードをスクリーンショットして投稿してください。');
      }
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* シェアカード本体 */}
      <LinearGradient
        colors={['#161B22', '#0C1016']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={styles.brand}>
            <Ionicons name="flame" size={18} color={colors.primary} />
            <Text style={styles.brandText}>継続 つづける</Text>
          </View>
          <View style={styles.commBadge}>
            <Ionicons name={category.icon} size={12} color={category.color} />
            <Text style={[styles.commText, { color: category.color }]}>{category.label}</Text>
          </View>
        </View>

        {/* 主役: 連続日数 */}
        <View style={styles.streakWrap}>
          <Text style={styles.streakNum}>{progress.streak}</Text>
          <Text style={styles.streakUnit}>日連続</Text>
        </View>
        <View style={styles.flameRow}>
          {Array.from({ length: Math.min(7, Math.max(1, Math.ceil(progress.streak / 3))) }).map(
            (_, i) => (
              <Ionicons key={i} name="flame" size={16} color={colors.primary} />
            )
          )}
        </View>

        {/* スタッツ3つ */}
        <View style={styles.statsRow}>
          <Stat icon={progress.rank.icon} color={progress.rank.color} value={progress.rank.label} label="ランク" />
          <Stat icon="podium" color={colors.orange} value={`上位${topPct}%`} label={category.label} />
          <Stat icon="layers" color={colors.purple} value={`${progress.totalDone}`} label="通算達成" />
        </View>

        <Text style={styles.tagline}>サボると課金、続けると報酬。</Text>
        <Text style={styles.by}>@{profile.name}</Text>
      </LinearGradient>

      <PrimaryButton label="シェアする" icon="share-social" onPress={onShare} style={{ marginTop: spacing.xl }} />
      <Text style={styles.hint}>
        {Platform.OS === 'web'
          ? '※ ボタンでテキストをコピー、またはこのカードをスクショして X / Instagram に投稿できます。'
          : '※ このカードをスクショして投稿するのもおすすめです。'}
      </Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Stat({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 14, fontWeight: '900', color: colors.text },
  commBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  commText: { fontSize: 11, fontWeight: '800' },

  streakWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: spacing.xl },
  streakNum: {
    fontSize: 96,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 96,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  streakUnit: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12, marginLeft: 6 },
  flameRow: { flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: spacing.sm },

  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  statValue: { fontSize: 15, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSub, fontWeight: '600' },

  tagline: { textAlign: 'center', fontSize: 13, color: colors.textSub, marginTop: spacing.xl, fontWeight: '700' },
  by: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 4 },

  hint: { fontSize: font.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});

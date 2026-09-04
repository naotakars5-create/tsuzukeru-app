import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { colors, font, radius, spacing } from '@/theme';
import {
  searchCommunities,
  createCommunity,
  joinCommunityById,
  leaveCommunity,
  findCommunityByCode,
  fetchMyCommunities,
  Community,
  MAX_COMMUNITY_MEMBERS,
} from '@/lib/socialApi';
import { categoryOf } from '@/logic/category';
import { promptAsync, notifyAsync, confirmAsync } from '@/logic/confirm';

/** 同時に参加できるコミュニティ数 */
const MAX_JOINED = 3;

/**
 * コミュニティを探す・作る・参加する画面。
 * 資格ごとの自動ランキングとは別に、テーマ別コミュニティに参加できる。
 * データはすべて Supabase の communities / community_members から取得する。
 */
export default function CommunitiesScreen() {
  const router = useRouter();
  const { goal, communityLimit, communityCreationsThisMonth, recordCommunityCreation } = useApp();
  const { session, backendEnabled } = useAuth();
  const [query, setQuery] = useState('');
  const [joined, setJoined] = useState<Community[]>([]);
  const [results, setResults] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const createsLeft = Math.max(0, communityLimit - communityCreationsThisMonth);
  const canUse = backendEnabled && !!session;

  const reload = useCallback(async () => {
    if (!canUse) {
      setLoading(false);
      return;
    }
    const [mine, found] = await Promise.all([fetchMyCommunities(), searchCommunities(query)]);
    setJoined(mine);
    setResults(found);
    setLoading(false);
  }, [canUse, query]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await reload();
        if (!alive) return;
      })();
      return () => {
        alive = false;
      };
    }, [reload])
  );

  const openCommunity = (c: { code: string }) => {
    router.push({ pathname: '/community/[code]', params: { code: c.code } });
  };

  const join = async (c: Community) => {
    if ((c.members ?? 0) >= MAX_COMMUNITY_MEMBERS) {
      notifyAsync('満員です', `このコミュニティは定員${MAX_COMMUNITY_MEMBERS}人に達しています。`);
      return;
    }
    if (joined.length >= MAX_JOINED && !joined.some((g) => g.id === c.id)) {
      notifyAsync(
        `参加は${MAX_JOINED}つまでです`,
        `同時に参加できるのは${MAX_JOINED}つまでです。どれかを抜けてから参加してください。`
      );
      return;
    }
    const error = await joinCommunityById(c.id);
    if (error) {
      notifyAsync('参加できませんでした', error);
      return;
    }
    await reload();
    openCommunity(c);
  };

  const create = async () => {
    if (communityCreationsThisMonth >= communityLimit) {
      notifyAsync(
        '今月の作成上限に達しました',
        `コミュニティの作成は1か月に${communityLimit}個までです。来月またお試しください。`
      );
      return;
    }
    if (joined.length >= MAX_JOINED) {
      notifyAsync(
        `参加は${MAX_JOINED}つまでです`,
        `作ったコミュニティにも参加することになるため、先にどれかを抜けてください。`
      );
      return;
    }

    const name = await promptAsync('コミュニティを作る', '名前を入力（例: 朝5時起き部）', '');
    if (!name?.trim()) return;
    const tagline = (await promptAsync('ひとこと説明（任意）', 'どんな仲間を集める？', '')) ?? '';

    const { community, error } = await createCommunity({
      name,
      category: goal?.category ?? null,
      tagline: tagline.trim() || null,
    });
    if (error || !community) {
      notifyAsync('作成できませんでした', error ?? 'もう一度お試しください。');
      return;
    }
    await recordCommunityCreation();
    await reload();
    notifyAsync(
      '作成しました',
      `参加コード: ${community.code}\n今月の残り作成数: ${Math.max(0, createsLeft - 1)}個\nこのコードを伝えると、仲間が参加できます。`
    );
    openCommunity(community);
  };

  const leave = async (c: Community) => {
    const ok = await confirmAsync('このコミュニティを抜けますか？', undefined, '抜ける');
    if (!ok) return;
    await leaveCommunity(c.id);
    await reload();
  };

  const joinByCode = async () => {
    const input = await promptAsync('コードで参加', '6桁の参加コードを入力', '');
    if (!input?.trim()) return;
    const c = await findCommunityByCode(input);
    if (!c) {
      notifyAsync('見つかりません', 'そのコードのコミュニティは見つかりませんでした。');
      return;
    }
    await join(c);
  };

  if (!canUse) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'コミュニティを探す' }} />
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.centerText}>
            コミュニティを使うにはログインが必要です。{'\n'}
            いまはこの端末だけのモードで動いています。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'コミュニティを探す' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          資格ごとの自動ランキングに加えて、テーマ別コミュニティにも参加できます。
        </Text>

        {/* 参加中（最大3つ・タップで入室） */}
        {joined.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.joinedCount}>
              参加中 {joined.length}/{MAX_JOINED}
            </Text>
            {joined.map((g) => (
              <Pressable key={g.id} style={styles.joinedCard} onPress={() => openCommunity(g)}>
                <View style={styles.joinedHead}>
                  <Ionicons name="people-circle" size={18} color={colors.primary} />
                  <Text style={styles.joinedTitle} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <View style={styles.enterRow}>
                    <Text style={styles.enterText}>入る</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </View>
                {g.tagline ? <Text style={styles.joinedTag}>{g.tagline}</Text> : null}
                <View style={styles.joinedMetaRow}>
                  <Text style={styles.joinedMeta}>コード {g.code}</Text>
                  {g.owner ? <Text style={styles.ownerTag}>作成者</Text> : null}
                  <Pressable onPress={() => leave(g)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                    <Text style={styles.leaveText}>抜ける</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 作る / コードで参加 */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={create}>
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={styles.actionText}>新しく作る</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={joinByCode}>
            <Ionicons name="enter" size={18} color={colors.primary} />
            <Text style={styles.actionText}>コードで参加</Text>
          </Pressable>
        </View>

        {/* 作成の可否ステータス */}
        <View style={styles.createStatus}>
          <Ionicons name="information-circle" size={14} color={colors.textMuted} />
          <Text style={styles.createStatusText}>
            今月あと {createsLeft}/{communityLimit} 個 作成できます（参加は無制限に無料）
          </Text>
        </View>

        {/* 検索 */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="コミュニティ名・キーワードで検索"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionLabel}>
          {query ? `「${query}」の検索結果` : '人気のコミュニティ'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : results.length === 0 ? (
          <Text style={styles.noResult}>
            {query
              ? '一致するコミュニティがありません。'
              : 'まだコミュニティがありません。'}
            {'\n'}上の「新しく作る」で最初のひとつを作ってみましょう。
          </Text>
        ) : (
          results.map((c) => {
            const isJoined = joined.some((g) => g.id === c.id);
            const cat = c.category ? categoryOf(c.category) : null;
            return (
              <View key={c.id} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: `${cat?.color ?? colors.primary}22` }]}>
                  <Ionicons name={cat?.icon ?? 'people'} size={20} color={cat?.color ?? colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{c.name}</Text>
                  <Text style={styles.rowTag} numberOfLines={1}>
                    {c.tagline}
                  </Text>
                  <View style={styles.rowMetaRow}>
                    <Ionicons name="people" size={12} color={colors.textMuted} />
                    <Text style={styles.rowMeta}>{c.members}人</Text>
                    {cat ? <Text style={[styles.rowCat, { color: cat.color }]}>・{cat.label}</Text> : null}
                  </View>
                </View>
                {isJoined ? (
                  <Pressable style={styles.joinedPill} onPress={() => openCommunity(c)}>
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={styles.joinedPillText}>参加中</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.joinBtn} onPress={() => join(c)}>
                    <Text style={styles.joinBtnText}>参加</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.note}>
          ※ 同時に参加できるのは{MAX_JOINED}つまで、1コミュニティの上限は
          {MAX_COMMUNITY_MEMBERS}人です。参加コードを伝えると、仲間が同じコミュニティに入れます。
        </Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { fontSize: font.sub, color: colors.textSub, lineHeight: 21 },

  joinedCount: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  joinedCard: {
    backgroundColor: 'rgba(198,244,50,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.4)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  joinedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  enterRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  enterText: { fontSize: font.small, fontWeight: '800', color: colors.primary },
  joinedTitle: { fontSize: font.body, fontWeight: '900', color: colors.text },
  joinedTag: { fontSize: font.small, color: colors.textSub, marginTop: 4 },
  joinedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  joinedMeta: { fontSize: font.small, color: colors.textSub, fontVariant: ['tabular-nums'] },
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
  leaveText: { fontSize: font.small, color: colors.danger, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionText: { fontSize: font.sub, fontWeight: '800', color: colors.text },
  proTag: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  proTagText: { fontSize: 9, fontWeight: '900', color: colors.onAccent, letterSpacing: 0.5 },
  createStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  createStatusText: { flex: 1, fontSize: font.small, color: colors.textSub, lineHeight: 16 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginTop: spacing.xs,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },

  sectionLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub, marginTop: spacing.sm },
  noResult: { fontSize: font.sub, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingVertical: spacing.lg },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: font.body, fontWeight: '800', color: colors.text },
  rowTag: { fontSize: font.small, color: colors.textSub, marginTop: 2 },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rowMeta: { fontSize: font.small, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  rowCat: { fontSize: font.small, fontWeight: '700' },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  joinBtnText: { fontSize: font.sub, fontWeight: '800', color: colors.onAccent },
  joinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  joinedPillText: { fontSize: font.small, fontWeight: '800', color: colors.success },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centerText: {
    fontSize: font.sub,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.md },
});

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { searchCommunities, generateCode, CommunityInfo } from '@/logic/communities';
import { categoryOf } from '@/logic/category';
import { promptAsync, notifyAsync, confirmAsync } from '@/logic/confirm';

/**
 * コミュニティを探す・作る・参加する画面。
 * 資格ごとの自動ランキングとは別に、テーマ別コミュニティに参加できる。
 */
export default function CommunitiesScreen() {
  const router = useRouter();
  const {
    group,
    setGroup,
    goal,
    premium,
    setPremium,
    communityLimit,
    communityCreationsThisMonth,
    canCreateCommunity,
    recordCommunityCreation,
  } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchCommunities(query), [query]);
  const createsLeft = Math.max(0, communityLimit - communityCreationsThisMonth);

  const openCommunity = (c: {
    code: string;
    name: string;
    category?: string;
    tagline?: string;
    members?: number;
  }) => {
    router.push({
      pathname: '/community/[code]',
      params: {
        code: c.code,
        name: c.name,
        category: c.category ?? '',
        tagline: c.tagline ?? '',
        members: c.members != null ? String(c.members) : '',
      },
    });
  };

  const join = async (c: CommunityInfo) => {
    await setGroup({
      code: c.code,
      name: c.name,
      owner: false,
      category: c.category,
      members: c.members,
      tagline: c.tagline,
    });
    openCommunity(c);
  };

  const create = async () => {
    // プレミアム限定
    if (!premium) {
      const ok = await confirmAsync(
        'プレミアム限定の機能です',
        'コミュニティの作成はプレミアム会員だけの機能です（月3個まで）。プレミアムに登録しますか？（モック・実際の決済はしません）',
        'プレミアムに登録'
      );
      if (!ok) return;
      await setPremium(true);
      notifyAsync('プレミアムに登録しました', 'コミュニティを毎月3個まで作成できます（モック）。');
    }
    // 月間上限（プレミアムでも月3個まで）
    if (communityCreationsThisMonth >= communityLimit) {
      notifyAsync(
        '今月の作成上限に達しました',
        `コミュニティの作成は1か月に${communityLimit}個までです。来月またお試しください。`
      );
      return;
    }

    const name = await promptAsync('コミュニティを作る', '名前を入力（例: 朝5時起き部）', '');
    if (!name) return;
    const tagline = (await promptAsync('ひとこと説明（任意）', 'どんな仲間を集める？', '')) ?? '';
    const code = generateCode(name + Date.now());
    await setGroup({
      code,
      name: name.trim(),
      owner: true,
      category: goal?.category,
      members: 1,
      tagline: tagline.trim() || 'あなたが作ったコミュニティ',
    });
    await recordCommunityCreation();
    notifyAsync(
      '作成しました',
      `参加コード: ${code}\n今月の残り作成数: ${Math.max(0, createsLeft - 1)}個\nこのコードを共有すると仲間が参加できます（共有機能は今後追加）。`
    );
    openCommunity({ code, name: name.trim(), category: goal?.category, tagline: tagline.trim(), members: 1 });
  };

  const leave = async () => {
    await setGroup(null);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'コミュニティを探す' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          資格ごとの自動ランキングに加えて、テーマ別コミュニティにも参加できます。
        </Text>

        {/* 参加中（タップで入室） */}
        {group && (
          <Pressable style={styles.joinedCard} onPress={() => openCommunity(group)}>
            <View style={styles.joinedHead}>
              <Ionicons name="people-circle" size={18} color={colors.primary} />
              <Text style={styles.joinedTitle}>参加中: {group.name}</Text>
              <View style={styles.enterRow}>
                <Text style={styles.enterText}>入る</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </View>
            {group.tagline ? <Text style={styles.joinedTag}>{group.tagline}</Text> : null}
            <View style={styles.joinedMetaRow}>
              <Text style={styles.joinedMeta}>コード {group.code}</Text>
              {group.owner ? <Text style={styles.ownerTag}>作成者</Text> : null}
              <Pressable onPress={leave} hitSlop={8} style={{ marginLeft: 'auto' }}>
                <Text style={styles.leaveText}>抜ける</Text>
              </Pressable>
            </View>
          </Pressable>
        )}

        {/* 作る / コードで参加 */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={create}>
            <Ionicons name={premium ? 'add-circle' : 'lock-closed'} size={18} color={colors.primary} />
            <Text style={styles.actionText}>新しく作る</Text>
            {!premium && (
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>PRO</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={joinByCode(setGroup, router)}>
            <Ionicons name="enter" size={18} color={colors.primary} />
            <Text style={styles.actionText}>コードで参加</Text>
          </Pressable>
        </View>

        {/* 作成の可否ステータス */}
        <View style={styles.createStatus}>
          <Ionicons
            name={premium ? 'checkmark-circle' : 'information-circle'}
            size={14}
            color={premium ? colors.success : colors.textMuted}
          />
          <Text style={styles.createStatusText}>
            {premium
              ? `プレミアム会員 ・ 今月あと ${createsLeft}/${communityLimit} 個 作成できます`
              : `コミュニティ作成はプレミアム限定（月${communityLimit}個まで）。参加は誰でも無料です`}
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

        {results.length === 0 ? (
          <Text style={styles.noResult}>
            一致するコミュニティがありません。{'\n'}上の「新しく作る」で作ってみましょう。
          </Text>
        ) : (
          results.map((c) => {
            const joined = group?.code === c.code;
            const cat = c.category ? categoryOf(c.category) : null;
            return (
              <View key={c.code} style={styles.row}>
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
                {joined ? (
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
          ※ コミュニティは試作用のモックです。参加できるのは1つずつで、切り替えると前のコミュニティからは抜けます。実際の共有・メンバー同期は今後追加予定です。
        </Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

/** コードで参加（ハンドラを生成） */
function joinByCode(
  setGroup: (g: any) => Promise<void>,
  router: ReturnType<typeof useRouter>
) {
  return async () => {
    const code = await promptAsync('コードで参加', '6桁の参加コードを入力', '');
    if (!code) return;
    const c = code.trim().toUpperCase();
    const name = `コミュニティ ${c}`;
    await setGroup({ code: c, name, owner: false, members: undefined, tagline: 'コードで参加' });
    // 参加したらそのまま入室する
    router.push({
      pathname: '/community/[code]',
      params: { code: c, name, category: '', tagline: 'コードで参加', members: '' },
    });
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { fontSize: font.sub, color: colors.textSub, lineHeight: 21 },

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

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.md },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import {
  buildCommunityMembers,
  seedChat,
  pickReply,
  defaultMemberCount,
  MAX_COMMUNITY_MEMBERS,
  CommunityMember,
} from '@/logic/communities';
import { formatMinutesShort } from '@/logic/time';
import { addDays, todayStr } from '@/logic/date';
import { minutesOf } from '@/logic/schedule';
import { ChatMessage } from '@/types';

type Tab = 'rank' | 'chat';

/** ランキングに表示する上位の人数（＋自分） */
const RANK_VISIBLE_TOP = 50;
/** ランキングの指標: 通算ポイント / 今週の勉強時間 */
type Metric = 'points' | 'week';

/** 相対時刻（ざっくり） */
function ago(ms: number, now: number): string {
  const d = Math.max(0, now - ms);
  const m = Math.floor(d / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

/**
 * コミュニティ詳細。参加したコミュニティに入って、
 * ①メンバーのポイントランキング ②簡単なチャット掲示板 を切り替えて使う。
 */
export default function CommunityDetailScreen() {
  const params = useLocalSearchParams<{
    code: string;
    name?: string;
    category?: string;
    tagline?: string;
    members?: string;
  }>();
  const code = params.code ?? '';
  const name = params.name ?? 'コミュニティ';
  const cat = params.category ? categoryOf(params.category) : null;

  const { progress, profile, minutes, chats, postChatMessage, postChatReply, markChatRead } =
    useApp();
  const [tab, setTab] = useState<Tab>('rank');
  const [metric, setMetric] = useState<Metric>('points');
  const [draft, setDraft] = useState('');
  const [now] = useState(() => Date.now());

  // 自分の今週（直近7日）の勉強時間
  const myWeekMinutes = useMemo(() => {
    const today = todayStr();
    let total = 0;
    for (let i = 0; i < 7; i++) total += minutesOf(minutes, addDays(today, -i));
    return total;
  }, [minutes]);

  // 全参加者数（パラメータ優先。なければコードから安定生成・定員500）
  const totalMembers = useMemo(() => {
    const n = parseInt(params.members ?? '', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_COMMUNITY_MEMBERS) : defaultMemberCount(code);
  }, [params.members, code]);

  // 全参加者を指標順に並べた完全なランキング（順位計算はこちらを使う）
  const allRanked = useMemo(() => {
    const base = buildCommunityMembers(
      code,
      {
        name: profile.name,
        points: progress.points,
        streak: progress.streak,
        studyMinutes: progress.totalMinutes,
        weekMinutes: myWeekMinutes,
      },
      totalMembers
    );
    return metric === 'points'
      ? base
      : [...base].sort((a, b) => b.weekMinutes - a.weekMinutes);
  }, [code, profile.name, progress.points, progress.streak, progress.totalMinutes, myWeekMinutes, metric, totalMembers]);

  const myPos = allRanked.findIndex((m) => m.isMe) + 1;
  const totalCount = allRanked.length;

  // 表示は「上位50名＋自分」。自分が50位以内ならそのまま
  const shown = useMemo(() => {
    const top = allRanked.slice(0, RANK_VISIBLE_TOP);
    if (top.some((m) => m.isMe)) return top.map((m, i) => ({ member: m, position: i + 1 }));
    const me = allRanked[myPos - 1];
    return [
      ...top.map((m, i) => ({ member: m, position: i + 1 })),
      ...(me ? [{ member: me, position: myPos }] : []),
    ];
  }, [allRanked, myPos]);
  const meOutsideTop = myPos > RANK_VISIBLE_TOP;

  // 掲示板を開いている間は既読にする（新着が来ても既読化）
  const myMsgCount = (chats[code] ?? []).length;
  useEffect(() => {
    if (tab === 'chat' && code) markChatRead(code);
  }, [tab, code, myMsgCount, markChatRead]);

  const messages = useMemo(() => {
    const seeds = seedChat(code, now);
    const mine = chats[code] ?? [];
    return [...seeds, ...mine].sort((a, b) => a.at - b.at);
  }, [code, now, chats]);

  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    postChatMessage(code, t);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    // 少し間をおいて、他メンバーからの“返信”が届く（モック演出）
    const { author, text } = pickReply(code, t + Date.now());
    const delay = 4000 + Math.random() * 6000;
    setTimeout(() => postChatReply(code, author, text), delay);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: name }} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.headIcon, { backgroundColor: `${cat?.color ?? colors.primary}22` }]}>
          <Ionicons name={cat?.icon ?? 'people'} size={22} color={cat?.color ?? colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.headMeta} numberOfLines={1}>
            {params.tagline
              ? `${params.tagline} ・ ${totalCount}人`
              : `${totalCount}人が参加中（定員${MAX_COMMUNITY_MEMBERS}人）`}
          </Text>
        </View>
      </View>

      {/* タブ切り替え */}
      <View style={styles.tabs}>
        <TabBtn active={tab === 'rank'} icon="podium" label="ランキング" onPress={() => setTab('rank')} />
        <TabBtn active={tab === 'chat'} icon="chatbubbles" label="掲示板" onPress={() => setTab('chat')} />
      </View>

      {tab === 'rank' ? (
        <FlatList
          data={shown}
          keyExtractor={(row) => row.member.id}
          contentContainerStyle={styles.rankList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          windowSize={10}
          ListHeaderComponent={
            <View>
              {/* 指標の切り替え: 通算ポイント / 今週の勉強時間 */}
              <View style={styles.metricRow}>
                <MetricBtn
                  active={metric === 'points'}
                  label="ポイント"
                  onPress={() => setMetric('points')}
                />
                <MetricBtn
                  active={metric === 'week'}
                  label="今週の勉強時間"
                  onPress={() => setMetric('week')}
                />
              </View>
              <Text style={styles.myPosLine}>
                あなたは <Text style={styles.myPosNum}>{myPos}</Text> 位 / {totalCount}人中
                {metric === 'week' ? '（今週の勉強時間）' : ''}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={{ marginBottom: 8 }}>
              {/* 自分が上位50位圏外のときは区切りを入れる */}
              {meOutsideTop && index === shown.length - 1 && (
                <Text style={styles.gapLabel}>・・・</Text>
              )}
              <MemberRow member={item.member} position={item.position} metric={metric} />
            </View>
          )}
          ListFooterComponent={
            <View>
              <Text style={styles.note}>
                ※ ランキングは
                <Text style={styles.noteStrong}>上位{RANK_VISIBLE_TOP}名とあなた</Text>
                を表示しています（順位は全{totalCount}人での順位）。メンバー・ポイントは試作用のモックです。
              </Text>
              <View style={{ height: spacing.xl }} />
            </View>
          }
        />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} now={now} />
            ))}
            <View style={{ height: spacing.sm }} />
          </ScrollView>

          {/* 入力 */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="メッセージを書く…"
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={300}
            />
            <Pressable
              style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
              onPress={send}
              disabled={!draft.trim()}
            >
              <Ionicons name="send" size={18} color={colors.onAccent} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function TabBtn({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? colors.onAccent : colors.textSub} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricBtn({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.metricBtn, active && styles.metricBtnActive]} onPress={onPress}>
      <Text style={[styles.metricText, active && styles.metricTextActive]}>{label}</Text>
    </Pressable>
  );
}

const MEDAL = [colors.gold, colors.silver, colors.bronze];

function MemberRow({
  member,
  position,
  metric,
}: {
  member: CommunityMember;
  position: number;
  metric: Metric;
}) {
  const top3 = position <= 3;
  return (
    <View style={[styles.row, member.isMe && styles.meRow]}>
      <View style={styles.posWrap}>
        {top3 ? (
          <Ionicons name="medal" size={20} color={MEDAL[position - 1]} />
        ) : (
          <Text style={[styles.posText, member.isMe && { color: colors.primary }]}>{position}</Text>
        )}
      </View>
      <View style={[styles.avatar, member.isMe && { backgroundColor: colors.primary }]}>
        {member.isMe ? (
          <Ionicons name="person" size={18} color={colors.onAccent} />
        ) : (
          <Text style={styles.avatarInitial}>{member.name.slice(0, 1)}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, member.isMe && { fontWeight: '800' }]}>{member.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name={member.rank.icon} size={11} color={member.rank.color} />
          <Text style={[styles.rankTag, { color: member.rank.color }]}>{member.rank.label}</Text>
          <Ionicons name="time" size={11} color={colors.textMuted} style={{ marginLeft: 4 }} />
          <Text style={styles.minText}>{formatMinutesShort(member.studyMinutes)}</Text>
        </View>
      </View>
      {metric === 'points' ? (
        <Text style={[styles.points, member.isMe && { color: colors.primary }]}>
          {member.points.toLocaleString()}
        </Text>
      ) : (
        <Text style={[styles.points, member.isMe && { color: colors.primary }]}>
          {formatMinutesShort(member.weekMinutes)}
        </Text>
      )}
    </View>
  );
}

function ChatBubble({ msg, now }: { msg: ChatMessage; now: number }) {
  if (msg.mine) {
    return (
      <View style={styles.mineWrap}>
        <View style={styles.mineBubble}>
          <Text style={styles.mineText}>{msg.text}</Text>
        </View>
        <Text style={styles.time}>{ago(msg.at, now)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.otherWrap}>
      <View style={styles.otherAvatar}>
        <Text style={styles.avatarInitial}>{msg.author.slice(0, 1)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.otherAuthor}>{msg.author}</Text>
        <View style={styles.otherBubble}>
          <Text style={styles.otherText}>{msg.text}</Text>
        </View>
        <Text style={styles.time}>{ago(msg.at, now)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headName: { fontSize: font.heading, fontWeight: '900', color: colors.text },
  headMeta: { fontSize: font.small, color: colors.textSub, marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  tabTextActive: { color: colors.onAccent },

  // ランキング
  rankList: { paddingHorizontal: spacing.lg },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 6 },
  metricBtn: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricBtnActive: { backgroundColor: 'rgba(198,244,50,0.14)', borderColor: colors.primary },
  metricText: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  metricTextActive: { color: colors.primary },
  myPosLine: { fontSize: font.sub, color: colors.textSub, fontWeight: '600', marginBottom: 10 },
  myPosNum: { color: colors.primary, fontWeight: '900', fontSize: font.heading },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: spacing.lg,
  },
  meRow: { backgroundColor: 'rgba(198,244,50,0.08)', borderColor: 'rgba(198,244,50,0.4)' },
  posWrap: { width: 24, alignItems: 'center' },
  posText: { fontSize: 15, fontWeight: '700', color: colors.textSub, fontVariant: ['tabular-nums'] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A3340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 14, fontWeight: '800', color: colors.textSub },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rankTag: { fontSize: 11, fontWeight: '800' },
  minText: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  points: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.md },
  noteStrong: { color: colors.textSub, fontWeight: '800' },
  gapLabel: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.body,
    letterSpacing: 4,
    marginBottom: 6,
  },

  // チャット
  chatList: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  otherWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, maxWidth: '86%' },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A3340',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  otherAuthor: { fontSize: font.small, color: colors.textSub, fontWeight: '700', marginBottom: 3, marginLeft: 4 },
  otherBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  otherText: { fontSize: font.sub, color: colors.text, lineHeight: 20 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '86%' },
  mineBubble: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  mineText: { fontSize: font.sub, color: colors.onAccent, fontWeight: '600', lineHeight: 20 },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 3, marginHorizontal: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '@/theme';
import { categoryOf } from '@/logic/category';
import {
  findCommunityByCode,
  fetchCommunityRanking,
  fetchMessages,
  postMessage,
  markCommunityRead,
  Community,
  CommunityRanking,
  BoardMessage,
  CommunityMemberStats,
  MAX_COMMUNITY_MEMBERS,
  COMMUNITY_VISIBLE_TOP,
} from '@/lib/socialApi';
import { formatMinutesShort } from '@/logic/time';

type Tab = 'rank' | 'chat';
/** ランキングの指標: 今月のポイント / 今週の勉強時間 */
type Metric = 'points' | 'week';

/** 掲示板の新着を取りにいく間隔（ミリ秒） */
const CHAT_POLL_MS = 8000;

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
 * ①メンバーのランキング ②掲示板 を切り替えて使う。
 * どちらも Supabase の実データ。
 */
export default function CommunityDetailScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';

  const [community, setCommunity] = useState<Community | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('rank');
  const [metric, setMetric] = useState<Metric>('points');
  const [ranking, setRanking] = useState<CommunityRanking | null>(null);
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const scrollRef = useRef<ScrollView>(null);

  // コミュニティ本体を引く
  useEffect(() => {
    let alive = true;
    findCommunityByCode(code).then((c) => {
      if (alive) setCommunity(c);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  // ランキング（指標を切り替えるたびに引き直す）
  useEffect(() => {
    if (!community) return;
    let alive = true;
    fetchCommunityRanking(community.id, metric).then((r) => {
      if (alive) setRanking(r);
    });
    return () => {
      alive = false;
    };
  }, [community, metric]);

  const loadMessages = useCallback(async () => {
    if (!community) return;
    const list = await fetchMessages(community.id);
    setMessages(list);
    setNow(Date.now());
  }, [community]);

  // 掲示板タブを開いている間だけ、定期的に新着を取りにいく
  useEffect(() => {
    if (tab !== 'chat' || !community) return;
    let alive = true;
    void loadMessages();
    void markCommunityRead(community.id);
    const timer = setInterval(() => {
      if (alive) void loadMessages();
    }, CHAT_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      // 閉じるときにも既読にしておく
      void markCommunityRead(community.id);
    };
  }, [tab, community, loadMessages]);

  const send = async () => {
    const t = draft.trim();
    if (!t || !community || sending) return;
    setSending(true);
    setDraft('');
    const error = await postMessage(community.id, t);
    if (!error) await loadMessages();
    setSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  if (community === undefined) {
    return (
      <View style={styles.centerBox}>
        <Stack.Screen options={{ title: 'コミュニティ' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (community === null) {
    return (
      <View style={styles.centerBox}>
        <Stack.Screen options={{ title: 'コミュニティ' }} />
        <Ionicons name="people-outline" size={44} color={colors.textMuted} />
        <Text style={styles.centerText}>
          このコミュニティは見つかりませんでした。{'\n'}コードをもう一度確認してください。
        </Text>
      </View>
    );
  }

  const name = community.name;
  const cat = community.category ? categoryOf(community.category) : null;
  const totalCount = ranking?.total ?? community.members ?? 0;
  const myPos = ranking?.me?.position ?? 0;
  const meOutsideTop = !!ranking && !ranking.myInTop && !!ranking.me;
  const shown = ranking
    ? [...ranking.top, ...(ranking.myInTop || !ranking.me ? [] : [ranking.me])]
    : [];

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
            {community.tagline
              ? `${community.tagline} ・ ${totalCount}人`
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
                {myPos > 0 ? (
                  <>
                    あなたは <Text style={styles.myPosNum}>{myPos}</Text> 位 / {totalCount}人中
                    {metric === 'week' ? '（今週の勉強時間）' : ''}
                  </>
                ) : (
                  '勉強を記録すると、ランキングに載ります。'
                )}
              </Text>
            </View>
          }
          ListEmptyComponent={
            ranking ? (
              <Text style={styles.note}>まだメンバーの記録がありません。</Text>
            ) : (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
            )
          }
          renderItem={({ item, index }) => (
            <View style={{ marginBottom: 8 }}>
              {/* 自分が上位圏外のときは区切りを入れる */}
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
                <Text style={styles.noteStrong}>上位{COMMUNITY_VISIBLE_TOP}名とあなた</Text>
                を表示しています（順位は全{totalCount}人での順位）。
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
            {messages.length === 0 ? (
              <Text style={styles.note}>
                まだ投稿がありません。{'\n'}最初のひとことを書いてみましょう。
              </Text>
            ) : (
              messages.map((msg) => <ChatBubble key={msg.id} msg={msg} now={now} />)
            )}
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
  member: CommunityMemberStats;
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

function ChatBubble({ msg, now }: { msg: BoardMessage; now: number }) {
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
  centerBox: {
    flex: 1,
    backgroundColor: colors.bg,
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

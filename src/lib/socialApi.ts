/**
 * 仲間・ランキング・コミュニティ・掲示板の「本物」のデータアクセス。
 * これまでモックで生成していたライバル/メンバー/投稿を、実ユーザーのデータに置き換える。
 *
 * ポイントやランクの計算式はアプリ側（src/logic/rank.ts）に一本化してあるので、
 * ここでは計算せず、各ユーザーが書き込んだ user_stats を読むだけにする。
 */
import { CustomGroup, LeaderboardEntry, RankTier } from '@/types';
import { rankForPoints } from '@/logic/rank';
import { supabase, isBackendConfigured } from './supabase';

/** ランキングに表示する上位の人数（＋自分） */
export const LEADERBOARD_TOP_N = 10;
/** コミュニティ内ランキングで表示する上位の人数（＋自分） */
export const COMMUNITY_VISIBLE_TOP = 50;
/** 1コミュニティの上限人数（DBのトリガーと合わせる） */
export const MAX_COMMUNITY_MEMBERS = 500;

/** user_stats テーブルの1行 */
interface StatsRow {
  user_id: string;
  display_name: string;
  icon: string | null;
  color: string | null;
  motivation: string | null;
  photo_url: string | null;
  category: string | null;
  points: number;
  month_points: number;
  month_minutes: number;
  week_minutes: number;
  streak: number;
}

const STATS_COLUMNS =
  'user_id, display_name, icon, color, motivation, photo_url, category, points, month_points, month_minutes, week_minutes, streak';

/** 自分の集計値をサーバーに書き込む（ランキングに載せるため） */
export interface MyStats {
  displayName: string;
  icon: string | null;
  color: string | null;
  motivation: string | null;
  photoUrl: string | null;
  category: string | null;
  points: number;
  monthPoints: number;
  monthMinutes: number;
  weekMinutes: number;
  streak: number;
}

export async function syncUserStats(stats: MyStats): Promise<void> {
  try {
    if (!isBackendConfigured) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('user_stats').upsert({
      user_id: userData.user.id,
      display_name: stats.displayName,
      icon: stats.icon,
      color: stats.color,
      motivation: stats.motivation,
      photo_url: stats.photoUrl,
      category: stats.category,
      points: stats.points,
      month_points: stats.monthPoints,
      month_minutes: stats.monthMinutes,
      week_minutes: stats.weekMinutes,
      streak: stats.streak,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('ランキング情報の同期に失敗しました', e);
  }
}

function toEntry(row: StatsRow, position: number, myId: string | null): LeaderboardEntry {
  return {
    id: row.user_id,
    name: row.display_name,
    position,
    points: row.month_points,
    streak: row.streak,
    studyMinutes: row.month_minutes,
    motivation: row.motivation ?? '',
    rank: rankForPoints(row.points),
    isMe: row.user_id === myId,
  };
}

export interface Leaderboard {
  /** 上位 LEADERBOARD_TOP_N 人（自分が上位ならその行も含む） */
  top: LeaderboardEntry[];
  /** 自分の行。まだ集計が無いときは null */
  me: LeaderboardEntry | null;
  /** 自分が上位に入っているか */
  myInTop: boolean;
  /** 自分のすぐ上の人（1位なら null） */
  above: LeaderboardEntry | null;
  /** 同カテゴリの総人数 */
  total: number;
}

const EMPTY_LEADERBOARD: Leaderboard = {
  top: [],
  me: null,
  myInTop: false,
  above: null,
  total: 0,
};

/**
 * 同じ資格カテゴリの月間ランキング。
 * 上位 LEADERBOARD_TOP_N 人と、自分の「全体の中での本当の順位」を返す。
 */
export async function fetchLeaderboard(category: string): Promise<Leaderboard> {
  if (!isBackendConfigured) return EMPTY_LEADERBOARD;
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id ?? null;
  if (!myId) return EMPTY_LEADERBOARD;

  const [topRes, meRes, totalRes] = await Promise.all([
    supabase
      .from('user_stats')
      .select(STATS_COLUMNS)
      .eq('category', category)
      .order('month_points', { ascending: false })
      .limit(LEADERBOARD_TOP_N),
    supabase.from('user_stats').select(STATS_COLUMNS).eq('user_id', myId).maybeSingle(),
    supabase
      .from('user_stats')
      .select('user_id', { count: 'exact', head: true })
      .eq('category', category),
  ]);

  const topRows = (topRes.data ?? []) as StatsRow[];
  const meRow = meRes.data as StatsRow | null;
  const total = totalRes.count ?? topRows.length;

  // 自分の本当の順位＝自分より上の人数＋1
  let myPosition = 0;
  if (meRow) {
    const { count } = await supabase
      .from('user_stats')
      .select('user_id', { count: 'exact', head: true })
      .eq('category', category)
      .gt('month_points', meRow.month_points);
    myPosition = (count ?? 0) + 1;
  }

  const top = topRows.map((r, i) => toEntry(r, i + 1, myId));
  const me = meRow ? toEntry(meRow, myPosition, myId) : null;
  const myInTop = top.some((e) => e.isMe);

  // すぐ上の人（順位が自分の1つ上）
  let above: LeaderboardEntry | null = null;
  if (meRow && myPosition > 1) {
    const { data } = await supabase
      .from('user_stats')
      .select(STATS_COLUMNS)
      .eq('category', category)
      .gt('month_points', meRow.month_points)
      .order('month_points', { ascending: true })
      .limit(1);
    const row = (data ?? [])[0] as StatsRow | undefined;
    if (row) above = toEntry(row, myPosition - 1, myId);
  }

  return { top, me, myInTop, above, total };
}

/** 同じ資格カテゴリで挑戦している人数 */
export async function fetchCategoryCount(category: string): Promise<number> {
  if (!isBackendConfigured) return 0;
  const { count } = await supabase
    .from('user_stats')
    .select('user_id', { count: 'exact', head: true })
    .eq('category', category);
  return count ?? 0;
}

/** 相手のプロフィール（ランキングからタップして見る） */
export interface RivalStats {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  motivation: string;
  category: string | null;
  points: number;
  monthMinutes: number;
  streak: number;
  rank: RankTier;
}

export async function fetchRival(userId: string): Promise<RivalStats | null> {
  if (!isBackendConfigured) return null;
  const { data } = await supabase
    .from('user_stats')
    .select(STATS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as StatsRow | null;
  if (!row) return null;
  return {
    id: row.user_id,
    name: row.display_name,
    icon: row.icon,
    color: row.color,
    motivation: row.motivation ?? '',
    category: row.category,
    points: row.points,
    monthMinutes: row.month_minutes,
    streak: row.streak,
    rank: rankForPoints(row.points),
  };
}

/* ---------------- コミュニティ ---------------- */

interface CommunityRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  tagline: string | null;
  owner_id: string | null;
}

export interface Community extends CustomGroup {
  id: string;
}

function toCommunity(row: CommunityRow, myId: string | null, members?: number): Community {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    owner: row.owner_id === myId,
    category: row.category ?? undefined,
    tagline: row.tagline ?? undefined,
    members,
  };
}

/** 参加中のコミュニティ一覧 */
export async function fetchMyCommunities(): Promise<Community[]> {
  if (!isBackendConfigured) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id ?? null;
  if (!myId) return [];

  // 結合よりも2クエリに分けたほうが型が素直なので、参加IDを引いてから本体を引く
  const { data: memberRows } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', myId);
  const ids = (memberRows ?? []).map((r) => (r as { community_id: string }).community_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('communities')
    .select('id, code, name, category, tagline, owner_id')
    .in('id', ids);
  const rows = (data ?? []) as CommunityRow[];

  return Promise.all(
    rows.map(async (row) => toCommunity(row, myId, await fetchMemberCount(row.id)))
  );
}

/** コミュニティを探す（名前・ひとこと・コードの部分一致） */
export async function searchCommunities(query: string): Promise<Community[]> {
  if (!isBackendConfigured) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id ?? null;

  let q = supabase
    .from('communities')
    .select('id, code, name, category, tagline, owner_id')
    .order('created_at', { ascending: false })
    .limit(30);

  const term = query.trim();
  if (term) q = q.or(`name.ilike.%${term}%,tagline.ilike.%${term}%,code.ilike.%${term}%`);

  const { data } = await q;
  const rows = (data ?? []) as CommunityRow[];
  return Promise.all(
    rows.map(async (row) => toCommunity(row, myId, await fetchMemberCount(row.id)))
  );
}

export async function fetchMemberCount(communityId: string): Promise<number> {
  const { count } = await supabase
    .from('community_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('community_id', communityId);
  return count ?? 0;
}

/** コードでコミュニティを引く（参加フロー用） */
export async function findCommunityByCode(code: string): Promise<Community | null> {
  if (!isBackendConfigured) return null;
  const { data: userData } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('communities')
    .select('id, code, name, category, tagline, owner_id')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  const row = data as CommunityRow | null;
  if (!row) return null;
  return toCommunity(row, userData.user?.id ?? null, await fetchMemberCount(row.id));
}

/** コミュニティを作る（作成者は自動で参加者になる） */
export async function createCommunity(input: {
  name: string;
  category?: string | null;
  tagline?: string | null;
}): Promise<{ community: Community | null; error: string | null }> {
  if (!isBackendConfigured) return { community: null, error: 'サーバーが未設定です' };
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return { community: null, error: 'ログインが必要です' };

  const code = randomCode();
  const { data, error } = await supabase
    .from('communities')
    .insert({
      code,
      name: input.name.trim(),
      category: input.category ?? null,
      tagline: input.tagline ?? null,
      owner_id: myId,
    })
    .select('id, code, name, category, tagline, owner_id')
    .single();

  if (error || !data) return { community: null, error: error?.message ?? '作成に失敗しました' };

  const row = data as CommunityRow;
  const joinError = await joinCommunityById(row.id);
  if (joinError) return { community: null, error: joinError };

  return { community: toCommunity(row, myId, 1), error: null };
}

/** コミュニティに参加する。エラーメッセージ（満員など）を返す */
export async function joinCommunityById(communityId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return 'ログインが必要です';

  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: myId });

  if (!error) return null;
  // 参加済みは成功扱い（重複キー）
  if (error.code === '23505') return null;
  if (error.message.includes('満員')) return 'このコミュニティは満員です（上限500人）。';
  return error.message;
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return;
  await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', myId);
}

/** コミュニティ内のメンバー（ランキング用・ポイント降順） */
export interface CommunityMemberStats {
  id: string;
  name: string;
  points: number;
  streak: number;
  studyMinutes: number;
  weekMinutes: number;
  rank: RankTier;
  isMe: boolean;
}

export interface CommunityRanking {
  /** 上位 COMMUNITY_VISIBLE_TOP 人（順位つき） */
  top: { member: CommunityMemberStats; position: number }[];
  /** 自分（上位圏外のときだけ使う） */
  me: { member: CommunityMemberStats; position: number } | null;
  myInTop: boolean;
  total: number;
}

export async function fetchCommunityRanking(
  communityId: string,
  metric: 'points' | 'week'
): Promise<CommunityRanking> {
  const empty: CommunityRanking = { top: [], me: null, myInTop: false, total: 0 };
  if (!isBackendConfigured) return empty;
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id ?? null;

  // 参加者のIDを取り、その人たちの集計値を引く
  const { data: memberRows } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId);
  const ids = (memberRows ?? []).map((r) => (r as { user_id: string }).user_id);
  if (ids.length === 0) return empty;

  const orderColumn = metric === 'points' ? 'month_points' : 'week_minutes';
  const { data } = await supabase
    .from('user_stats')
    .select(STATS_COLUMNS)
    .in('user_id', ids)
    .order(orderColumn, { ascending: false });

  const rows = (data ?? []) as StatsRow[];
  const all = rows.map((row, i) => ({
    member: {
      id: row.user_id,
      name: row.display_name,
      points: row.month_points,
      streak: row.streak,
      studyMinutes: row.month_minutes,
      weekMinutes: row.week_minutes,
      rank: rankForPoints(row.points),
      isMe: row.user_id === myId,
    },
    position: i + 1,
  }));

  const top = all.slice(0, COMMUNITY_VISIBLE_TOP);
  const myInTop = top.some((e) => e.member.isMe);
  const me = all.find((e) => e.member.isMe) ?? null;
  return { top, me, myInTop, total: all.length };
}

/* ---------------- 掲示板 ---------------- */

export interface BoardMessage {
  id: string;
  author: string;
  text: string;
  at: number;
  mine: boolean;
}

export async function fetchMessages(communityId: string): Promise<BoardMessage[]> {
  if (!isBackendConfigured) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id ?? null;

  const { data } = await supabase
    .from('community_messages')
    .select('id, user_id, body, created_at')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true })
    .limit(200);

  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
  }[];
  if (rows.length === 0) return [];

  // 投稿者の表示名をまとめて引く
  const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: names } = await supabase
    .from('user_stats')
    .select('user_id, display_name')
    .in('user_id', authorIds);
  const nameById = new Map(
    ((names ?? []) as { user_id: string; display_name: string }[]).map((n) => [
      n.user_id,
      n.display_name,
    ])
  );

  return rows.map((r) => ({
    id: r.id,
    author: nameById.get(r.user_id) ?? '名無し',
    text: r.body,
    at: new Date(r.created_at).getTime(),
    mine: r.user_id === myId,
  }));
}

export async function postMessage(communityId: string, text: string): Promise<string | null> {
  const body = text.trim();
  if (!body) return null;
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return 'ログインが必要です';
  const { error } = await supabase
    .from('community_messages')
    .insert({ community_id: communityId, user_id: myId, body });
  return error?.message ?? null;
}

/** 掲示板を既読にする */
export async function markCommunityRead(communityId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return;
  await supabase.from('community_reads').upsert({
    community_id: communityId,
    user_id: myId,
    last_read_at: new Date().toISOString(),
  });
}

/** 参加中コミュニティごとの未読件数 */
export async function fetchUnreadCounts(communityIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!isBackendConfigured || communityIds.length === 0) return out;
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId) return out;

  const { data: reads } = await supabase
    .from('community_reads')
    .select('community_id, last_read_at')
    .eq('user_id', myId);
  const readAt = new Map(
    ((reads ?? []) as { community_id: string; last_read_at: string }[]).map((r) => [
      r.community_id,
      r.last_read_at,
    ])
  );

  await Promise.all(
    communityIds.map(async (cid) => {
      let q = supabase
        .from('community_messages')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', cid)
        .neq('user_id', myId);
      const since = readAt.get(cid);
      if (since) q = q.gt('created_at', since);
      const { count } = await q;
      out[cid] = count ?? 0;
    })
  );
  return out;
}

/** 共有用の参加コード（6文字） */
function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

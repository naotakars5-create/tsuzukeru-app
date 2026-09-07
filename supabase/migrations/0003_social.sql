-- 仲間・ランキング・コミュニティ・掲示板を「本物」にするためのスキーマ。
-- これまでモックで生成していたライバル/メンバー/投稿を、実ユーザーのデータに置き換える。
--
-- 設計方針:
--   ポイントやランクの計算式はアプリ側（src/logic/rank.ts）に一本化したいので、
--   SQL では再実装せず、クライアントが自分の集計値を user_stats に書き込む。
--   他人の行は読めるが書けない（RLSで own row のみ更新可）。

-- ランキングに出す公開ステータス（1ユーザー1行）
create table if not exists user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '名無し',
  icon text,
  color text,
  motivation text,
  photo_url text,
  -- 目指している資格カテゴリ（同じカテゴリの人とランキングで競う）
  category text,
  points integer not null default 0, -- 通算ポイント（ランク称号の算出用）
  month_points integer not null default 0, -- 今月のポイント
  month_minutes integer not null default 0, -- 今月の勉強時間（分）
  week_minutes integer not null default 0, -- 今週の勉強時間（分）
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 同カテゴリの月間ランキングを引くためのインデックス
create index if not exists user_stats_category_month_idx
  on user_stats (category, month_points desc);

-- コミュニティ（テーマ別。コードで参加する）
create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  tagline text,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists community_members (
  community_id uuid not null references communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_members_user_idx on community_members (user_id);

create table if not exists community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_messages_community_idx
  on community_messages (community_id, created_at desc);

-- 掲示板の既読位置（未読バッジ用）
create table if not exists community_reads (
  community_id uuid not null references communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- 参加判定のヘルパー。
-- ポリシーの中から community_members を直接参照すると再帰するため、
-- security definer の関数に逃がす。
create or replace function is_community_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from community_members
    where community_id = cid and user_id = auth.uid()
  );
$$;

-- 1コミュニティの上限人数（500人）を超える参加を拒否する
create or replace function check_community_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from community_members where community_id = new.community_id) >= 500 then
    raise exception 'このコミュニティは満員です（上限500人）';
  end if;
  return new;
end;
$$;

drop trigger if exists community_capacity_trigger on community_members;
create trigger community_capacity_trigger
  before insert on community_members
  for each row execute function check_community_capacity();

alter table user_stats enable row level security;
alter table communities enable row level security;
alter table community_members enable row level security;
alter table community_messages enable row level security;
alter table community_reads enable row level security;

-- ランキングに出すため、他人の集計値は誰でも読める。書けるのは自分の行だけ。
create policy "stats are readable by all users" on user_stats
  for select using (auth.role() = 'authenticated');
create policy "own stats insert" on user_stats
  for insert with check (auth.uid() = user_id);
create policy "own stats update" on user_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- コミュニティは検索できるよう全員が読める。作成者だけが編集・削除できる。
create policy "communities are readable by all users" on communities
  for select using (auth.role() = 'authenticated');
create policy "create own community" on communities
  for insert with check (auth.uid() = owner_id);
create policy "owner can update community" on communities
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner can delete community" on communities
  for delete using (auth.uid() = owner_id);

-- 参加者一覧はランキング表示に使うので読み取りは全員可。参加/脱退は自分のぶんだけ。
create policy "members are readable by all users" on community_members
  for select using (auth.role() = 'authenticated');
create policy "join by self" on community_members
  for insert with check (auth.uid() = user_id);
create policy "leave by self" on community_members
  for delete using (auth.uid() = user_id);

-- 掲示板は参加者だけが読み書きできる。編集は不可、自分の投稿だけ削除できる。
create policy "members read messages" on community_messages
  for select using (is_community_member(community_id));
create policy "members post messages" on community_messages
  for insert with check (auth.uid() = user_id and is_community_member(community_id));
create policy "delete own message" on community_messages
  for delete using (auth.uid() = user_id);

create policy "own reads" on community_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 覚悟の勉強: 課金（Stripe連携）に必要な最小スキーマ
-- 方針（案C）: 開始時は課金しない（カード登録のみ）。達成週は¥0、未達週だけ後から課金する。

-- プロフィール（auth.users を拡張する形。1ユーザー1行）
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  motivation text,
  photo_url text,
  premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- Stripe の顧客情報（カードはStripe側に保存。ここにはIDだけ持つ）
create table if not exists stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  default_payment_method_id text,
  card_brand text,
  card_last4 text,
  updated_at timestamptz not null default now()
);

-- 目標（=挑戦する資格・コミット額）
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  exam_date date,
  target_total_hours numeric,
  commit_amount integer not null, -- 400 / 1200 / 4000 / 12000
  weeks_total integer not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);

-- 週ごとの実績と課金状態（judge-weeks が毎週これを埋める）
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_index integer not null,
  start_date date not null,
  end_date date not null,
  scheduled_days integer not null,
  done_days integer not null default 0,
  stake_amount integer not null, -- その週のコミット額（commit_amount / weeks_total）
  outcome text not null default 'pending' check (outcome in ('pending', 'achieved', 'missed')),
  charge_status text not null default 'none' check (charge_status in ('none', 'waived', 'charged', 'failed')),
  stripe_payment_intent_id text,
  charged_at timestamptz,
  unique (goal_id, week_index)
);

-- 日々の学習分数（週の判定に使う。ローカルの minutes と同期する）
create table if not exists daily_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  minutes integer not null default 0,
  primary key (user_id, date)
);

-- RLS: 本人のデータしか読み書きできない
alter table profiles enable row level security;
alter table stripe_customers enable row level security;
alter table goals enable row level security;
alter table weeks enable row level security;
alter table daily_logs enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own stripe customer (read only)" on stripe_customers for select using (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weeks (read only)" on weeks for select using (auth.uid() = user_id);
create policy "own daily logs" on daily_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stripe_customers / weeks の書き込みは Edge Function（service_role）からのみ行う。
-- クライアントから直接カードIDや課金結果を書き換えられないようにするため、
-- 上のポリシーではこの2テーブルに insert/update/delete を許可していない。

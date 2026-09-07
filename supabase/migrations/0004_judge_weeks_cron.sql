-- 週次判定（judge-weeks）の自動実行。
--
-- これまでダッシュボードで手作業に設定する前提だったが、設定が消えたり
-- 環境を作り直したときに気づけないため、マイグレーションに寄せる。
-- pg_cron が Postgres 内から pg_net で Edge Function を叩く。
--
-- 実行時刻は UTC 日曜 15:10 = 日本時間 月曜 00:10。
-- 週（月〜日）が終わった直後に、前週ぶんをまとめて判定する。

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 呼び出しを関数に包んでおく。cron.schedule に長いSQLを直接書くと、
-- あとから中身を直すのに再スケジュールが必要になるため。
create or replace function public.trigger_judge_weeks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- judge-weeks は verify_jwt = false（supabase/config.toml）なので認証ヘッダは不要。
  -- 二重課金は Edge Function 側の冪等キー（week-charge-<week id>）で防いでいる。
  perform net.http_post(
    url := 'https://psrhlrphivkopltedtps.supabase.co/functions/v1/judge-weeks',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
end;
$$;

-- 誰でも呼べる必要はない。cron（postgres ロール）だけが実行する。
revoke execute on function public.trigger_judge_weeks() from public, anon, authenticated;

-- 再実行しても重複登録されないよう、既存のジョブがあれば消してから登録する。
do $$
begin
  if exists (select 1 from cron.job where jobname = 'judge-weeks-weekly') then
    perform cron.unschedule('judge-weeks-weekly');
  end if;

  perform cron.schedule(
    'judge-weeks-weekly',
    '10 15 * * 0',
    'select public.trigger_judge_weeks();'
  );
end;
$$;

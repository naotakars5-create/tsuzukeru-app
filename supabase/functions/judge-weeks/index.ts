// 毎週月曜の朝に実行するスケジュール実行関数（Supabase Scheduled Functions で cron 設定）。
// 前週が終わった goal を集計し、達成週は免除・未達週だけ自動課金する。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date().toISOString().slice(0, 10);

  // 終了しているのにまだ判定していない週をすべて取得
  const { data: pendingWeeks, error } = await supabase
    .from('weeks')
    .select('id, goal_id, user_id, start_date, end_date, scheduled_days, stake_amount')
    .eq('outcome', 'pending')
    .lt('end_date', today);

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: Record<string, string> = {};

  for (const week of pendingWeeks ?? []) {
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('date, minutes')
      .eq('user_id', week.user_id)
      .gte('date', week.start_date)
      .lte('date', week.end_date);

    const doneDays = (logs ?? []).filter((l) => l.minutes > 0).length;
    const achieved = doneDays >= week.scheduled_days;

    if (achieved) {
      await supabase
        .from('weeks')
        .update({ outcome: 'achieved', done_days: doneDays, charge_status: 'waived' })
        .eq('id', week.id);
      results[week.id] = 'achieved-waived';
      continue;
    }

    // 未達 -> カード情報を取って自動課金
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('user_id', week.user_id)
      .maybeSingle();

    await supabase.from('weeks').update({ outcome: 'missed', done_days: doneDays }).eq('id', week.id);

    if (!customer?.default_payment_method_id) {
      // カード未登録（例: 無料プランで課金機能を使っていない等）。ここでは何もしない。
      results[week.id] = 'missed-no-card';
      continue;
    }

    try {
      const pi = await stripe.paymentIntents.create({
        amount: week.stake_amount,
        currency: 'jpy',
        customer: customer.stripe_customer_id,
        payment_method: customer.default_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { week_id: week.id, goal_id: week.goal_id, user_id: week.user_id },
      });
      await supabase
        .from('weeks')
        .update({ stripe_payment_intent_id: pi.id })
        .eq('id', week.id);
      results[week.id] = `missed-charge-${pi.status}`;
      // 最終的な charge_status は payment_intent.succeeded / payment_failed の
      // Webhook で確定させる（ここでの pi.status はまだ確定前の可能性があるため）。
    } catch (e) {
      const err = e as Stripe.errors.StripeError;
      await supabase.from('weeks').update({ charge_status: 'failed' }).eq('id', week.id);
      results[week.id] = `missed-charge-error-${err.code ?? 'unknown'}`;
      // authentication_required の場合はアプリ側で再認証が必要。
      // TODO: push通知でユーザーに知らせる。
    }
  }

  return new Response(JSON.stringify({ processed: Object.keys(results).length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

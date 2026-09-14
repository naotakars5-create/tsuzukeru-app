// カードを「登録だけ」する（¥0、案C: 開始時は課金しない）。
// アプリの PaymentSheet(setup mode) に渡す client_secret を返す。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveStripeCustomer } from '../_shared/stripeCustomer.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 呼び出し元の JWT からユーザーを特定（なりすまし防止）
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: '未ログインです' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // カード登録の入口はアプリ版とWeb版の2つあるため、
    // Customer が重複しないよう共通ヘルパーに寄せている
    const customerId = await resolveStripeCustomer(
      stripe,
      supabase,
      userData.user.id,
      // 確認待ちの復元用メール（new_email）も、領収メールの宛先として使う
      userData.user.email ?? userData.user.new_email ?? undefined
    );

    // usage: off_session -> あとで本人不在でも自動課金できるようにするための設定
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ clientSecret: setupIntent.client_secret, customerId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

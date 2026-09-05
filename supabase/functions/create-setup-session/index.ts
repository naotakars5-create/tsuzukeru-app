// Web版のカード登録用に、Stripe のホスト型 Checkout（setupモード）を作る。
//
// アプリ版は PaymentSheet（ネイティブ）を使うが、Webではネイティブモジュールが
// 使えないため、Stripe が用意している決済ページへ遷移させる方式にする。
// どちらの経路でも、登録の完了は setup_intent.succeeded の Webhook で
// stripe_customers に反映されるので、保存処理はここには書かない。
//
// mode: 'setup' なので、この時点では課金されない（案C: 開始時は0円）。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

interface Payload {
  /** 登録後に戻ってくるURL（アプリのカード登録画面） */
  returnUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
    const userId = userData.user.id;
    const email = userData.user.email ?? undefined;

    const payload = (await req.json()) as Payload;
    // 任意のURLへ飛ばされないよう、https のみ受け付ける
    if (!payload.returnUrl || !payload.returnUrl.startsWith('https://')) {
      return new Response(JSON.stringify({ error: '戻り先URLが不正です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 既存の Stripe Customer があれば使い回す（アプリ版と同じ顧客に紐づける）
    const { data: existing } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase
        .from('stripe_customers')
        .insert({ user_id: userId, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      // あとで本人不在でも自動課金できるようにする
      payment_method_types: ['card'],
      success_url: `${payload.returnUrl}?card=success`,
      cancel_url: `${payload.returnUrl}?card=cancel`,
      locale: 'ja',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

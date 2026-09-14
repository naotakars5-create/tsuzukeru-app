// Web版のカード登録用に、Stripe のホスト型 Checkout（setupモード）を作る。
//
// アプリ版は PaymentSheet（ネイティブ）を使うが、Webではネイティブモジュールが
// 使えないため、Stripe が用意している決済ページへ遷移させる。
// どちらの経路でも、登録の完了は setup_intent.succeeded の Webhook で
// stripe_customers に反映されるので、保存処理はここには書かない。
//
// mode: 'setup' なので、この時点では課金されない（案C: 開始時は0円）。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveStripeCustomer } from '../_shared/stripeCustomer.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

// 戻り先URLはサーバー側の設定だけから組み立てる。
// クライアントから受け取った値をそのまま Stripe に渡すと、
// 任意のサイトへ飛ばせるオープンリダイレクトになるため。
// クライアントが選べるのは、下の決まったパスのどれかだけ。
const appWebUrl = Deno.env.get('APP_WEB_URL')?.replace(/\/$/, '');
const RETURN_PATHS: Record<string, string> = {
  commit: '/commit', // 目標作成の「コミットして始める」から
  settings: '/card-setup', // 設定の「支払い方法」から
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (!appWebUrl) {
      console.error('APP_WEB_URL が未設定のため Checkout の戻り先を決められない');
      return json({ error: 'サーバー設定が未完了です' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 呼び出し元の JWT からユーザーを特定（なりすまし防止）
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) return json({ error: '未ログインです' }, 401);

    const customerId = await resolveStripeCustomer(
      stripe,
      supabase,
      userData.user.id,
      // 確認待ちの復元用メール（new_email）も、領収メールの宛先として使う
      userData.user.email ?? userData.user.new_email ?? undefined
    );

    let flow = 'settings';
    try {
      const body = await req.json();
      if (typeof body?.flow === 'string' && Object.hasOwn(RETURN_PATHS, body.flow)) flow = body.flow;
    } catch {
      // 本文なしは設定からの登録として扱う
    }
    const returnUrl = `${appWebUrl}${RETURN_PATHS[flow]}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: `${returnUrl}?card=success`,
      cancel_url: `${returnUrl}?card=cancel`,
      locale: 'ja',
    });

    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

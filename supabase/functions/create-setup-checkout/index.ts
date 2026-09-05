// カード登録用の Stripe Checkout セッション（setup モード）を発行する。
//
// カード番号の入力は Stripe がホストするページで行うため、このアプリは番号に一切触れない
// （カード情報の非保持化。EMV 3-D セキュアの要否判定も Stripe 側で行われる）。
//
// 呼び出せるのは Web 版だけ。iOSアプリ内に外部決済の導線を置くことは
// App Store 審査ガイドライン 3.1.1 で認められていないため。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveStripeCustomer } from '../_shared/stripeCustomer.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

// 戻り先URLはサーバー側の設定だけから組み立てる。
// クライアントから受け取った値をそのまま Stripe に渡すと、オープンリダイレクトに使われるため。
const appWebUrl = Deno.env.get('APP_WEB_URL')?.replace(/\/$/, '');

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
      userData.user.email ?? undefined
    );

    // setup モードの Checkout は usage=off_session の SetupIntent を作る。
    // これにより、未達の週ぶんを本人不在でも後から自動課金できる。
    // 登録結果の DB 反映は stripe-webhook の setup_intent.succeeded が担当する。
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: 'jpy',
      payment_method_types: ['card'],
      locale: 'ja',
      success_url: `${appWebUrl}/card-setup?status=success`,
      cancel_url: `${appWebUrl}/card-setup?status=cancel`,
      setup_intent_data: { metadata: { supabase_user_id: userData.user.id } },
    });

    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

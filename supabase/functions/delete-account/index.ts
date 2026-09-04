// アカウントを完全に削除する。
// App Store のガイドライン 5.1.1(v) により、アカウントを作れるアプリには
// アプリ内から削除できる導線が必須のため用意している。
//
// auth.users を消せば、各テーブルは on delete cascade で一緒に消える。
// 未払いがある場合は、支払いが確定するまで削除を断る。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

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

    // 支払いが済んでいない週が残っているうちは削除させない
    const { data: unpaid } = await supabase
      .from('weeks')
      .select('id')
      .eq('user_id', userId)
      .eq('charge_status', 'failed')
      .limit(1);

    if (unpaid && unpaid.length > 0) {
      return new Response(
        JSON.stringify({
          error:
            'お支払いが完了していない請求があります。お手数ですが、支払い方法を更新してからもう一度お試しください。',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stripe の顧客も消して、カード情報を残さない
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (customer?.stripe_customer_id) {
      try {
        await stripe.customers.del(customer.stripe_customer_id);
      } catch (e) {
        // すでに削除済みなどはそのまま進める
        console.warn('Stripe顧客の削除に失敗:', e);
      }
    }

    // auth.users を消すと、各テーブルは cascade で一緒に消える
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ deleted: true }), {
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

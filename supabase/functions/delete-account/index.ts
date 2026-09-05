// アカウントと、それに紐づくデータをすべて削除する。
//
// App Store 審査ガイドライン 5.1.1(v) は、アカウントを作成できるアプリに対して
// アプリ内からアカウントを完全に削除できることを求めている（無効化だけでは足りない）。
//
// profiles / goals / weeks / daily_logs / stripe_customers はいずれも
// auth.users(id) への on delete cascade を持つため、認証ユーザーを消せば連鎖して消える。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 呼び出し元の JWT からユーザーを特定する。
    // 他人のアカウントを消せてはならないので、消す対象はここで決めた本人だけ。
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) return json({ error: '未ログインです' }, 401);
    const userId = userData.user.id;

    // 先に Stripe 側の顧客を削除して、カードが残らないようにする。
    // 失敗しても中断しない（アカウント削除の要求に応えることを優先する）。
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (customer?.stripe_customer_id) {
      try {
        await stripe.customers.del(customer.stripe_customer_id);
      } catch (e) {
        console.error('Stripe顧客の削除に失敗（アカウント削除は続行）:', e);
      }
    }

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error('ユーザー削除に失敗:', deleteErr);
      return json({ error: 'アカウントを削除できませんでした' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

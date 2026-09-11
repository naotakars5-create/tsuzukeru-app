import Stripe from 'https://esm.sh/stripe@17?target=deno';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase のユーザーに対応する Stripe Customer を返す。無ければ作って紐づける。
 * カード登録の入口が複数あっても Customer が重複しないよう、ここに一本化している。
 *
 * メールアドレスは Customer にも入れておく。課金のたびに Stripe から領収メールが届くので、
 * アプリを消した人でも請求に気づける（復元用メールが後から付いた場合も追いつかせる）。
 */
export async function resolveStripeCustomer(
  stripe: Stripe,
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined
): Promise<string> {
  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    if (email) {
      const customer = await stripe.customers.retrieve(existing.stripe_customer_id);
      if (!customer.deleted && customer.email !== email) {
        await stripe.customers.update(existing.stripe_customer_id, { email });
      }
    }
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  await supabase
    .from('stripe_customers')
    .insert({ user_id: userId, stripe_customer_id: customer.id });

  return customer.id;
}

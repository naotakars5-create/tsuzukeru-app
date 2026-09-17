import Stripe from 'https://esm.sh/stripe@17?target=deno';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase のユーザーに対応する Stripe Customer を返す。無ければ作って紐づける。
 * カード登録の入口が複数あっても Customer が重複しないよう、ここに一本化している。
 *
 * メールアドレスは Customer にも入れておく。課金のたびに Stripe から領収メールが届くので、
 * アプリを消した人でも請求に気づける（復元用メールが後から付いた場合も追いつかせる）。
 *
 * DBに残っている Customer が Stripe 側に無いことがある（テストモードで作った顧客のまま
 * 本番モードの鍵に切り替えた、Stripeの画面で顧客を削除した、など）。
 * その場合は作り直して紐づけ直す。放っておくとカード登録が何度やっても失敗し、
 * 原因も分かりにくいため。
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

  if (existing?.stripe_customer_id && (await customerExists(stripe, existing.stripe_customer_id, email))) {
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // 作り直したときは、古い顧客IDとカード情報を新しいもので置き換える
  await supabase.from('stripe_customers').upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      default_payment_method_id: null,
      card_brand: null,
      card_last4: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  return customer.id;
}

/** Stripe側にその顧客が生きているか。ついでにメールアドレスを最新にそろえる。 */
async function customerExists(
  stripe: Stripe,
  customerId: string,
  email: string | undefined
): Promise<boolean> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return false;
    if (email && customer.email !== email) {
      await stripe.customers.update(customerId, { email });
    }
    return true;
  } catch (e) {
    const err = e as Stripe.errors.StripeError;
    if (err.code === 'resource_missing' || err.statusCode === 404) return false;
    throw e;
  }
}

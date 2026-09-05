import { supabase } from './supabase';

/**
 * カード登録用の Stripe Checkout ページ（setup モード）のURLをサーバーに発行してもらう。
 * カード番号の入力は Stripe 側のページで行うため、このアプリは番号に触れない。
 *
 * Web版専用。iOSアプリ内に外部決済の導線を置くことは
 * App Store 審査ガイドライン 3.1.1 で認められていない。
 */
export async function requestCardSetupUrl(): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('ログインが必要です');

  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'create-setup-checkout',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'カード登録ページを開けませんでした');
  }
  return data.url;
}

export interface CardOnFile {
  cardBrand: string | null;
  cardLast4: string | null;
}

/** 登録済みカードの情報（ブランド・下4桁）を取得。未登録なら null。 */
export async function fetchCardOnFile(): Promise<CardOnFile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('stripe_customers')
    .select('card_brand, card_last4')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error || !data || !data.card_last4) return null;
  return { cardBrand: data.card_brand, cardLast4: data.card_last4 };
}

import { supabase } from './supabase';

/**
 * カード登録用の SetupIntent をサーバー（Edge Function）に発行してもらう。
 * ここでは¥0。実際のカード入力・保存は呼び出し側で PaymentSheet を開いて行う。
 */
export async function requestCardSetup(): Promise<{ clientSecret: string; customerId: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('ログインが必要です');

  const { data, error } = await supabase.functions.invoke<{
    clientSecret: string;
    customerId: string;
  }>('create-setup-intent', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error || !data) throw new Error(error?.message ?? 'カード登録の準備に失敗しました');
  return data;
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

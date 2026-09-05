import { supabase, isBackendConfigured } from './supabase';

const NOT_CONFIGURED =
  'サーバーが未設定のため、カード登録は利用できません（.env に Supabase の鍵を設定してください）。';

/**
 * カード登録用の SetupIntent をサーバー（Edge Function）に発行してもらう。
 * ここでは¥0。実際のカード入力・保存は呼び出し側で PaymentSheet を開いて行う。
 */
export async function requestCardSetup(): Promise<{ clientSecret: string; customerId: string }> {
  if (!isBackendConfigured) throw new Error(NOT_CONFIGURED);
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

/**
 * Web版のカード登録。Stripe のホスト型 Checkout（setupモード）のURLを取得する。
 * ネイティブの PaymentSheet が使えないWeb用の経路で、ここでも課金は発生しない（0円）。
 */
export async function requestCardSetupSession(returnUrl: string): Promise<string> {
  if (!isBackendConfigured) throw new Error(NOT_CONFIGURED);
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('ログインが必要です');

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'create-setup-session',
    {
      headers: { Authorization: `Bearer ${token}` },
      body: { returnUrl },
    }
  );

  if (data?.error) throw new Error(data.error);
  if (error || !data?.url) throw new Error(error?.message ?? 'カード登録の準備に失敗しました');
  return data.url;
}

export interface CardOnFile {
  cardBrand: string | null;
  cardLast4: string | null;
}

/** 登録済みカードの情報（ブランド・下4桁）を取得。未登録なら null。 */
export async function fetchCardOnFile(): Promise<CardOnFile | null> {
  if (!isBackendConfigured) return null;
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

/**
 * アカウントを完全に削除する（App Store ガイドライン 5.1.1(v) の必須要件）。
 * 成功したら null、失敗したらエラーメッセージを返す。
 */
export async function deleteAccount(): Promise<string | null> {
  if (!isBackendConfigured) return 'サーバーが未設定のため、削除できません。';
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return 'ログインが必要です';

  const { data, error } = await supabase.functions.invoke<{ deleted?: boolean; error?: string }>(
    'delete-account',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (data?.error) return data.error;
  if (error) return error.message;
  if (!data?.deleted) return '削除できませんでした。時間をおいてお試しください。';
  await supabase.auth.signOut();
  return null;
}

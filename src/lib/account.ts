import { supabase } from './supabase';

/**
 * アカウントと、サーバー上のデータをすべて削除する。
 * 取り消せないので、呼ぶ前に必ず確認を取ること。
 */
export async function deleteAccount(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('ログインが必要です');

  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>(
    'delete-account',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'アカウントを削除できませんでした');
  }
}

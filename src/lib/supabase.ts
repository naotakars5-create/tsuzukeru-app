import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * サーバー（Supabase）が使える状態かどうか。
 *
 * 鍵が未設定のときは false になり、アプリは「ローカル専用モード」で動く
 * （ログイン不要・記録は端末内のみ・カード登録と課金は使えない）。
 * ここで例外を投げるとアプリ自体が起動できず画面が真っ白になるため、投げない。
 */
export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isBackendConfigured) {
  console.warn(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が未設定のため、' +
      'ローカル専用モードで起動します（ログイン・カード登録・課金は無効）。' +
      '有効にするには .env を設定してください（.env.example を参照）。'
  );
}

// anon key はクライアントに埋め込んでよい鍵（RLSで保護される）。秘密鍵はサーバー側にのみ置く。
// 未設定でもクライアント自体は生成し、実際に通信する側が isBackendConfigured で分岐する。
export const supabase = createClient(
  supabaseUrl ?? 'https://unconfigured.supabase.co',
  supabaseAnonKey ?? 'unconfigured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

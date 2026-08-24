/**
 * ログイン状態（Supabase Auth）を管理する Context。
 * 課金（カード登録・週次の自動判定）にはアカウントが必須なため、
 * アプリ全体をこの状態でゲートする（未ログインならログイン画面のみ表示）。
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Supabaseのエラーメッセージを日本語の目安に変換（完全網羅ではない） */
function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが違います。';
  if (message.includes('User already registered')) return 'このメールアドレスは登録済みです。ログインしてください。';
  if (message.includes('Password should be at least')) return 'パスワードは6文字以上にしてください。';
  if (message.includes('Unable to validate email')) return 'メールアドレスの形式が正しくありません。';
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? translateAuthError(error.message) : null;
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return translateAuthError(error.message);
    if (!data.session) {
      // メール確認が有効なプロジェクト設定の場合はここに入る
      return 'CONFIRM_EMAIL';
    }
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

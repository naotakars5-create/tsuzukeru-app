/**
 * ログイン状態（Supabase Auth）を管理する Context。
 *
 * 起動時は「匿名アカウント」で始める（登録画面は出さない）。
 * 勉強の記録・ランキング・コミュニティはそのまま使え、
 * コミット（カード登録）のときに初めて「復元用のメールアドレス」を1つ紐付けてもらう。
 * パスワードは作らない。機種変更のときはメールに届くコードでログインして戻る。
 *
 * これは App Store のガイドライン 5.1.1(i)（機能に不可欠でない限り
 * アカウント登録を強制してはならない）への対応でもある。
 *
 * Supabase の鍵が未設定のときは認証を行わず、
 * 端末内だけで完結するローカル専用モードで動く（backendEnabled = false）。
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isBackendConfigured } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  /** サーバー（Supabase）が設定されているか。false ならローカル専用モード。 */
  backendEnabled: boolean;
  /** 匿名アカウントで使っているか（＝まだIDを紐付けていない） */
  isAnonymous: boolean;
  /**
   * 復元用のメールアドレス。確認待ちのものも含む（null なら未登録）。
   * カード登録にはこれが必要で、パスワードは要らない。
   */
  recoveryEmail: string | null;
  /** メールは登録したが、確認メールのリンクをまだ開いていない */
  emailPending: boolean;
  /**
   * 匿名アカウントに復元用のメールアドレスだけを紐付ける（パスワードなし）。
   * すでに他のアカウントで使われているメールなら 'EMAIL_TAKEN' を返す。
   */
  setRecoveryEmail: (email: string) => Promise<string | null>;
  /** メールに6桁のログインコードを送る（既存アカウントの復元用） */
  sendLoginCode: (email: string) => Promise<string | null>;
  /** 届いたコードでログインする */
  verifyLoginCode: (email: string, code: string) => Promise<string | null>;
  /** 匿名アカウントにメールアドレスとパスワードを紐付ける（記録は引き継がれる） */
  linkEmail: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Supabaseのエラーメッセージを日本語の目安に変換（完全網羅ではない） */
function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが違います。';
  if (message.includes('User already registered') || message.includes('already been registered'))
    return 'このメールアドレスは登録済みです。ログインしてください。';
  if (message.includes('Password should be at least')) return 'パスワードは6文字以上にしてください。';
  if (message.includes('Unable to validate email')) return 'メールアドレスの形式が正しくありません。';
  if (message.includes('Anonymous sign-ins are disabled'))
    return '匿名利用が無効になっています（Supabaseの設定を確認してください）。';
  if (message.includes('Signups not allowed for otp'))
    return 'このメールアドレスのアカウントが見つかりません。';
  if (message.includes('Token has expired') || message.includes('otp_expired'))
    return 'コードの有効期限が切れました。もう一度送ってください。';
  if (message.includes('Invalid') && message.toLowerCase().includes('otp'))
    return 'コードが違います。';
  if (message.includes('rate limit') || message.includes('Rate limit'))
    return '送信が多すぎます。少し待ってからお試しください。';
  return message;
}

/** すでに登録済みのメールアドレスか（Supabaseのメッセージから判定） */
function isEmailTaken(message: string): boolean {
  return message.includes('already') && message.toLowerCase().includes('registered');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 鍵が未設定のときは認証を行わない（ローカル専用モード）
    if (!isBackendConfigured) {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session) {
        setSession(data.session);
      } else {
        // まだ誰でもないなら、画面を出さずに匿名で開始する。
        // 失敗しても止めない（サーバー機能が使えないだけで、記録は端末内に残る）。
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (!alive) return;
        if (error) {
          console.warn('匿名サインインに失敗しました。ローカル中心の動作になります。', error.message);
        }
        setSession(anon.session ?? null);
      }
      setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * 匿名アカウントにメール／パスワードを紐付ける。
   * updateUser を使うのでユーザーIDは変わらず、それまでの記録がそのまま残る。
   */
  const linkEmail = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  /**
   * 復元用のメールアドレスだけを匿名アカウントに紐付ける。パスワードは作らない。
   * Supabase の設定でメール確認が有効なら、確認リンクを開くまで new_email に留まる
   * （カード登録と課金には影響しない。確認前は、このメールでの復元だけができない）。
   */
  const setRecoveryEmail = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (!error) return null;
    if (isEmailTaken(error.message)) return 'EMAIL_TAKEN';
    return translateAuthError(error.message);
  }, []);

  const sendLoginCode = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // 復元専用。ここで新しいアカウントは作らない
      options: { shouldCreateUser: false },
    });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const verifyLoginCode = useCallback(
    async (email: string, code: string): Promise<string | null> => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      return error ? translateAuthError(error.message) : null;
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // サインアウト後もアプリは使えるように、また匿名で開始する
    if (isBackendConfigured) await supabase.auth.signInAnonymously();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        backendEnabled: isBackendConfigured,
        isAnonymous: session?.user.is_anonymous ?? false,
        recoveryEmail: session?.user.email || session?.user.new_email || null,
        emailPending: !!session?.user.new_email && !session?.user.email,
        setRecoveryEmail,
        sendLoginCode,
        verifyLoginCode,
        linkEmail,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

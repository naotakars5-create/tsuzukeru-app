import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius, font, spacing } from '@/theme';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import type { GoogleSignInButtonProps } from '@/components/GoogleSignInButton.types';

/**
 * Web版の「Googleで続ける」。メールもパスワードも入力せずにIDが決まる。
 *
 * mode='link' は linkIdentity を使う。ユーザーIDが変わらないので、
 * それまでの勉強記録・登録済みカード・ランキングの順位がそのまま残る。
 * （Supabaseの Authentication → Sign In / Providers で
 *  「Allow manual linking」をオンにしておく必要がある）
 *
 * Googleの画面へ一度出て戻ってくる。戻り先は redirectPath で、
 * 目標の入力内容は端末に保存してあるので、戻ってから続きを進められる。
 * すでに他のアカウントで使われているGoogleアカウントだった場合は、
 * 戻り先のURLにエラーが付いて返る（呼び出し側で拾って案内する）。
 */
export function GoogleSignInButton({
  mode,
  redirectPath,
  label = 'Googleで続ける',
  onError,
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);

  if (!isBackendConfigured) return null;

  const onPress = async () => {
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}${redirectPath}`;
      const options = { redirectTo };
      const { error } =
        mode === 'link'
          ? await supabase.auth.linkIdentity({ provider: 'google', options })
          : await supabase.auth.signInWithOAuth({ provider: 'google', options });
      if (error) {
        onError?.(error.message);
        setBusy(false);
      }
      // 成功時はGoogleの画面へ移動するので、ここで戻すことはない
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color="#3C4043" />
      ) : (
        <View style={styles.row}>
          <GoogleMark />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Googleのロゴ（4色のG） */
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 000 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Googleのブランド規定に沿った白いボタン
  button: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#1F1F1F', fontSize: font.body, fontWeight: '700' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
});

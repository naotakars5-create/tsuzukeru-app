import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { radius } from '@/theme';
import { supabase } from '@/lib/supabase';

/**
 * 「Appleでサインイン」ボタン（iOSのみ表示）。
 *
 * メールアドレスの入力もパスワードも要らず、ワンタップで済む。
 * Appleがメールアドレスを隠す設定を選んでも、リレー用のアドレスが渡るので動く。
 *
 * 注意: 匿名アカウントからの引き継ぎについて。
 * Supabase 側の挙動によっては、サインイン後にユーザーIDが変わることがある。
 * 変わった場合は onLinked に changedUser=true を渡すので、
 * 呼び出し側で「記録の引き継ぎ」を案内する。
 * （カード登録より前にしか通らない導線なので、請求が宙に浮くことはない）
 */
export function AppleSignInButton({
  onLinked,
  onError,
}: {
  onLinked: (result: { changedUser: boolean }) => void;
  onError: (message: string) => void;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const onPress = async () => {
    try {
      // サインイン前のユーザーIDを控えて、あとで変わったか確かめる
      const { data: before } = await supabase.auth.getUser();
      const beforeId = before.user?.id ?? null;

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        onError('Appleから認証情報を取得できませんでした。');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        onError(error.message);
        return;
      }

      const afterId = data.user?.id ?? null;
      onLinked({ changedUser: beforeId != null && afterId != null && beforeId !== afterId });
    } catch (e) {
      // ユーザーが自分でキャンセルしたときは、何も言わない
      if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={radius.full}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  button: { width: '100%', height: 52 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

type Mode = 'code' | 'password';

/**
 * 既存アカウントに戻るためのログイン画面。
 * 起動時に強制されることはなく、設定タブから開く（機種変更・アプリの入れ直しのとき用）。
 *
 * 新しいアカウントはここでは作らない。目標にコミットするときにメールを1つ登録する流れが
 * 入口なので、ここは「メールに届くコードで戻る」が基本。パスワードを作った人向けに
 * パスワードでのログインも残している。
 */
export function AuthScreen() {
  const { signIn, sendLoginCode, verifyLoginCode } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mail = email.trim();

  const onSendCode = async () => {
    setError(null);
    if (!mail) {
      setError('メールアドレスを入力してください。');
      return;
    }
    setLoading(true);
    const result = await sendLoginCode(mail);
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    setCodeSent(true);
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    const result = await verifyLoginCode(mail, code);
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    router.back();
  };

  const onPasswordSignIn = async () => {
    setError(null);
    if (!mail || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    const result = await signIn(mail, password);
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.center}>
          <Logo size={100} />
          <Text style={styles.appName}>覚悟の勉強</Text>
          <Text style={styles.desc}>
            機種変更やアプリの入れ直しのあと、{'\n'}前の記録と請求の状況に戻ります。
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setCodeSent(false);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          {mode === 'code' ? (
            codeSent ? (
              <>
                <Text style={styles.label}>メールに届いた6桁のコード</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={8}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label="ログイン"
                  onPress={onVerify}
                  loading={loading}
                  disabled={code.trim().length < 6}
                  style={{ marginTop: spacing.lg }}
                />
                <Pressable onPress={onSendCode} style={styles.switchRow} hitSlop={8}>
                  <Text style={styles.switchText}>コードを再送する</Text>
                </Pressable>
              </>
            ) : (
              <>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label="ログインコードを送る"
                  icon="mail"
                  onPress={onSendCode}
                  loading={loading}
                  style={{ marginTop: spacing.lg }}
                />
              </>
            )
          ) : (
            <>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="パスワード"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label="ログイン"
                onPress={onPasswordSignIn}
                loading={loading}
                style={{ marginTop: spacing.lg }}
              />
            </>
          )}

          <Pressable
            onPress={() => {
              setMode(mode === 'code' ? 'password' : 'code');
              setError(null);
              setCodeSent(false);
            }}
            style={styles.switchRow}
            hitSlop={8}
          >
            <Text style={styles.switchText}>
              {mode === 'code' ? 'パスワードでログインする' : 'メールに届くコードでログインする'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.sm },
  appName: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.sm },
  desc: { fontSize: font.sub, color: colors.textSub, textAlign: 'center', lineHeight: 21 },
  form: { marginTop: spacing.xxl, gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSub, marginTop: spacing.md },
  input: {
    marginTop: 6,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: font.body,
  },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm },
  switchRow: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  switchText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
});

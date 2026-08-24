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

type Mode = 'signIn' | 'signUp';

/**
 * ログイン/新規登録画面。未ログインのときアプリ全体をこれに差し替える。
 * カード登録・週次の自動課金判定にはアカウントが必須なため、最初に必ず通る。
 */
export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const mail = email.trim();
    if (!mail || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    const result = mode === 'signIn' ? await signIn(mail, password) : await signUp(mail, password);
    setLoading(false);
    if (result === 'CONFIRM_EMAIL') {
      setConfirmSent(true);
      return;
    }
    if (result) setError(result);
  };

  if (confirmSent) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Logo size={96} />
          <Text style={styles.title}>確認メールを送りました</Text>
          <Text style={styles.desc}>
            {email} 宛に届いた確認メールのリンクを開いてから、{'\n'}ログインしてください。
          </Text>
          <PrimaryButton
            label="ログイン画面に戻る"
            variant="secondary"
            onPress={() => {
              setConfirmSent(false);
              setMode('signIn');
            }}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </View>
    );
  }

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
            サボると課金、続けると報酬。{'\n'}
            {mode === 'signIn' ? 'アカウントにログインしてください。' : 'アカウントを作成してください。'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6文字以上"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={mode === 'signIn' ? 'ログイン' : 'アカウントを作成'}
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
            }}
            style={styles.switchRow}
            hitSlop={8}
          >
            <Text style={styles.switchText}>
              {mode === 'signIn' ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方はこちら'}
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
  title: { fontSize: font.heading, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
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

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { notifyAsync } from '@/logic/confirm';

/**
 * 匿名で使っているユーザーに、IDを紐付けてもらう画面。
 * カード登録の直前にだけ通る（起動時には出さない）。
 *
 * updateUser でメールを設定するのでユーザーIDは変わらず、
 * それまでの勉強記録・ランキングの順位はそのまま引き継がれる。
 */
export default function LinkAccountScreen() {
  const router = useRouter();
  const { linkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください。');
      return;
    }
    setLoading(true);
    const result = await linkEmail(email, password);
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    notifyAsync('IDを登録しました', 'これで機種変更しても記録が引き継がれます。');
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'IDの登録' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>記録を守るためのID</Text>
              <Text style={styles.desc}>
                カードを登録する前に、IDを作ってください。{'\n'}
                機種変更やアプリの再インストールをしても、記録と請求の状況が引き継がれます。
              </Text>
            </View>
          </View>

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
            autoComplete="password-new"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="このIDで登録する"
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />

          <Text style={styles.consent}>
            登録すると、
            <Text style={styles.consentLink} onPress={() => router.push('/legal/terms')}>
              利用規約
            </Text>
            と
            <Text style={styles.consentLink} onPress={() => router.push('/legal/privacy')}>
              プライバシーポリシー
            </Text>
            に同意したものとみなします。
          </Text>
        </Card>

        <Pressable style={styles.switchRow} onPress={() => router.replace('/login')} hitSlop={8}>
          <Text style={styles.switchText}>すでにアカウントをお持ちの方はこちら</Text>
        </Pressable>

        <Text style={styles.note}>
          ※ いまの記録は、この端末の一時的なアカウントに保存されています。
          IDを登録しないままアプリを削除すると、記録は失われます。
        </Text>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: font.heading, fontWeight: '900', color: colors.text },
  desc: { fontSize: font.small, color: colors.textSub, marginTop: 4, lineHeight: 19 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSub, marginTop: spacing.lg },
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
  consent: {
    fontSize: font.small,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  consentLink: { color: colors.primary, fontWeight: '700' },
  switchRow: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  switchText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.md },
});

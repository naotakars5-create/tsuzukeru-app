import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CardSetupPanel } from '@/components/CardSetupPanel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, font, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';

/**
 * カード登録画面（案C: ここでは¥0。保存のみ）。
 *
 * 匿名のまま使っている人には、先にIDの登録をお願いする。
 * 請求先を確定させるためと、機種変更で請求の状況が宙に浮かないようにするため。
 * 中身は CardSetupPanel（ネイティブ/Webでファイルが分かれている）に委譲する。
 */
export default function CardSetupScreen() {
  const router = useRouter();
  const { backendEnabled, isAnonymous } = useAuth();

  if (!backendEnabled) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.centerText}>
            この端末だけのモードで動いています。{'\n'}カード登録は利用できません。
          </Text>
        </View>
      </View>
    );
  }

  if (isAnonymous) {
    return (
      <View style={styles.screen}>
        <Card>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="person-circle" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>先にIDを登録してください</Text>
              <Text style={styles.desc}>
                カードを登録するには、IDが必要です。{'\n'}
                機種変更やアプリの再インストールをしても、記録と請求の状況が引き継がれます。
              </Text>
            </View>
          </View>
          <PrimaryButton
            label="IDを登録する"
            icon="shield-checkmark"
            onPress={() => router.push('/link-account')}
            style={{ marginTop: spacing.lg }}
          />
          <Text style={styles.helper}>
            ※ いまの勉強記録は、そのまま引き継がれます。
          </Text>
        </Card>
      </View>
    );
  }

  return <CardSetupPanel />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centerText: { color: colors.textSub, fontSize: font.sub, textAlign: 'center', lineHeight: 21 },
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
  helper: { marginTop: spacing.md, color: colors.textMuted, fontSize: font.small, lineHeight: 17 },
});

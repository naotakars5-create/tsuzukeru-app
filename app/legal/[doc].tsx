import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, font, spacing } from '@/theme';
import { LEGAL_DOCS, LegalKey, LEGAL_UPDATED } from '@/logic/legal';

/**
 * 法務ページ（プライバシーポリシー / 利用規約 / 特定商取引法に基づく表記）。
 * Web版でも同じURLで開けるため、App Store 提出用のURLとしても使える。
 */
export default function LegalScreen() {
  const params = useLocalSearchParams<{ doc: string }>();
  const key = String(params.doc ?? '') as LegalKey;
  const doc = LEGAL_DOCS[key];

  if (!doc) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '規約' }} />
        <Text style={styles.body}>ページが見つかりませんでした。</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: doc.title }} />
      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.updated}>最終更新: {LEGAL_UPDATED}</Text>
      {doc.intro ? <Text style={styles.intro}>{doc.intro}</Text> : null}

      {doc.sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontSize: font.title, fontWeight: '900', color: colors.text },
  updated: { fontSize: font.small, color: colors.textMuted, marginTop: 4 },
  intro: {
    fontSize: font.sub,
    color: colors.textSub,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  section: { marginTop: spacing.xl },
  heading: { fontSize: font.body, fontWeight: '800', color: colors.text },
  body: {
    fontSize: font.sub,
    color: colors.textSub,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});

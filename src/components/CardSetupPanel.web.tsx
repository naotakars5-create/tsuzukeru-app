import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '@/theme';

/**
 * Web版のカード登録パネル。
 * StripeのPaymentSheetはネイティブ専用のため、Webでは案内だけを出す。
 */
export function CardSetupPanel() {
  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <Ionicons name="phone-portrait-outline" size={40} color={colors.textMuted} />
        <Text style={styles.webNote}>
          カード登録はスマホアプリ版でのみご利用いただけます。{'\n'}
          Web版では今のところ非対応です。
        </Text>
      </View>
    </View>
  );
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
  webNote: { color: colors.textSub, fontSize: font.sub, textAlign: 'center', lineHeight: 21 },
});

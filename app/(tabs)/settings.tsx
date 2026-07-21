import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { formatDisplay } from '@/logic/date';

export default function SettingsScreen() {
  const router = useRouter();
  const { goal, resetAll } = useApp();

  const onReset = () => {
    Alert.alert(
      'データをリセット',
      '目標と達成記録をすべて削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: () => resetAll() },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 現在の目標 */}
      <Card>
        <Text style={styles.sectionLabel}>現在の目標</Text>
        {goal ? (
          <>
            <Text style={styles.goalName}>{goal.name}</Text>
            <Text style={styles.goalMeta}>
              {goal.frequency === 'daily' ? '毎日' : '特定の曜日'}・4週間・積立 ¥
              {goal.stakeAmount.toLocaleString()}
            </Text>
            <Text style={styles.goalMeta}>開始日: {formatDisplay(goal.startDate)}</Text>
            <PrimaryButton
              label="目標を編集 / 作り直す"
              variant="secondary"
              onPress={() => router.push('/goal-setup')}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <>
            <Text style={styles.goalMeta}>目標が未設定です。</Text>
            <PrimaryButton
              label="目標を設定する"
              onPress={() => router.push('/goal-setup')}
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </Card>

      {/* 将来の機能（仲間/チーム）— 今回はスコープ外。入口だけ用意。 */}
      <Card>
        <Text style={styles.sectionLabel}>これからの機能</Text>
        <FutureRow icon="people" title="仲間 / チーム" desc="みんなで続ける（今後追加予定）" />
        <FutureRow icon="notifications" title="リマインド通知" desc="押し忘れ防止（今後追加予定）" />
        <FutureRow icon="card" title="実際の積立・返還" desc="本番の決済連携（今後追加予定）" />
      </Card>

      {/* データ管理 */}
      <Card>
        <Text style={styles.sectionLabel}>データ管理</Text>
        <Text style={styles.goalMeta}>
          データはこの端末内にのみ保存されます（サーバーなし）。
        </Text>
        <PrimaryButton
          label="すべてのデータをリセット"
          variant="ghost"
          onPress={onReset}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <Text style={styles.version}>継続 つづける — MVP v1.0.0</Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function FutureRow({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.futureRow}>
      <View style={styles.futureIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.futureTitle}>{title}</Text>
        <Text style={styles.futureDesc}>{desc}</Text>
      </View>
      <View style={styles.soonTag}>
        <Text style={styles.soonText}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionLabel: { fontSize: font.sub, fontWeight: '700', color: colors.textSub },
  goalName: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  goalMeta: { fontSize: font.sub, color: colors.textSub, marginTop: 4 },

  futureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  futureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  futureDesc: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  soonTag: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  soonText: { fontSize: 10, color: colors.textSub, fontWeight: '700' },

  version: {
    textAlign: 'center',
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { Frequency } from '@/types';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DURATION_WEEKS = 4; // MVPは4週固定

export default function GoalSetupScreen() {
  const router = useRouter();
  const { goal, createGoal } = useApp();

  const [name, setName] = useState(goal?.name ?? '');
  const [frequency, setFrequency] = useState<Frequency>(goal?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(
    goal?.weekdays ?? [1, 2, 3, 4, 5]
  );
  const [stake, setStake] = useState<string>(
    goal ? String(goal.stakeAmount) : '3000'
  );

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('目標名を入力してください');
      return;
    }
    const stakeNum = Number(stake);
    if (!Number.isFinite(stakeNum) || stakeNum < 0) {
      Alert.alert('積立額は0以上の数値で入力してください');
      return;
    }
    if (frequency === 'weekdays' && weekdays.length === 0) {
      Alert.alert('曜日を1つ以上選んでください');
      return;
    }

    const doSave = async () => {
      await createGoal({
        name: trimmed,
        frequency,
        weekdays: frequency === 'weekdays' ? weekdays : [],
        stakeAmount: Math.round(stakeNum),
        durationWeeks: DURATION_WEEKS,
      });
      router.back();
    };

    // 既存の目標がある場合は記録がリセットされる旨を確認
    if (goal) {
      Alert.alert(
        '目標を作り直しますか？',
        'これまでの達成記録はリセットされ、今日から新しい4週間が始まります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '作り直す', style: 'destructive', onPress: doSave },
        ]
      );
    } else {
      await doSave();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 目標名 */}
        <Card>
          <Text style={styles.label}>目標名</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 毎日10分ランニング"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </Card>

        {/* 頻度 */}
        <Card>
          <Text style={styles.label}>頻度</Text>
          <View style={styles.segment}>
            <SegmentButton
              active={frequency === 'daily'}
              label="毎日"
              onPress={() => setFrequency('daily')}
            />
            <SegmentButton
              active={frequency === 'weekdays'}
              label="特定の曜日"
              onPress={() => setFrequency('weekdays')}
            />
          </View>

          {frequency === 'weekdays' && (
            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((w, i) => {
                const active = weekdays.includes(i);
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleWeekday(i)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text
                      style={[styles.dayChipText, active && styles.dayChipTextActive]}
                    >
                      {w}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* 期間 */}
        <Card>
          <Text style={styles.label}>期間</Text>
          <Text style={styles.fixedValue}>4週間（1ヶ月）</Text>
          <Text style={styles.helper}>今日から4週間、続けていきます。</Text>
        </Card>

        {/* 積立額 */}
        <Card>
          <Text style={styles.label}>積立額（モック・実際の決済はしません）</Text>
          <View style={styles.amountRow}>
            <Text style={styles.yen}>¥</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="3000"
              placeholderTextColor={colors.textMuted}
              value={stake}
              onChangeText={(t) => setStake(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={7}
            />
          </View>
          <Text style={styles.helper}>
            未達があると、この積立から「課金（ダミー）」が発生します。
          </Text>
        </Card>

        <PrimaryButton
          label={goal ? '目標を作り直す' : 'この目標で始める'}
          onPress={onSave}
          style={{ marginTop: spacing.sm }}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  label: { fontSize: font.sub, fontWeight: '700', color: colors.textSub },
  input: {
    marginTop: spacing.sm,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  helper: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm },
  fixedValue: {
    marginTop: spacing.sm,
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
  },

  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.body, fontWeight: '700', color: colors.textSub },
  segmentTextActive: { color: '#fff' },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: colors.primary },
  dayChipText: { fontSize: font.body, fontWeight: '700', color: colors.textSub },
  dayChipTextActive: { color: '#fff' },

  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  yen: { fontSize: font.heading, fontWeight: '800', color: colors.text, marginRight: 4 },
  amountInput: { flex: 1, marginTop: 0 },
});

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
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { Frequency, GoalCategory, IconName } from '@/types';
import { CATEGORIES } from '@/logic/category';
import { WEEKLY_STAKE } from '@/logic/billing';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DURATION_WEEKS = 4; // MVPは4週固定

export default function GoalSetupScreen() {
  const router = useRouter();
  const { goal, createGoal } = useApp();

  const [name, setName] = useState(goal?.name ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'exercise');
  const [frequency, setFrequency] = useState<Frequency>(goal?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(goal?.weekdays ?? [1, 2, 3, 4, 5]);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  // 曜日のクイック選択
  const applyPreset = (preset: 'weekday' | 'weekend' | 'all') => {
    setFrequency('weekdays');
    if (preset === 'weekday') setWeekdays([1, 2, 3, 4, 5]);
    else if (preset === 'weekend') setWeekdays([0, 6]);
    else setWeekdays([0, 1, 2, 3, 4, 5, 6]);
  };

  const scheduledPerWeek = frequency === 'daily' ? 7 : weekdays.length;

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('目標名を入力してください');
      return;
    }
    if (frequency === 'weekdays' && weekdays.length === 0) {
      Alert.alert('曜日を1つ以上選んでください');
      return;
    }

    const doSave = async () => {
      await createGoal({
        name: trimmed,
        category,
        frequency,
        weekdays: frequency === 'weekdays' ? weekdays : [],
        stakeAmount: WEEKLY_STAKE * DURATION_WEEKS,
        durationWeeks: DURATION_WEEKS,
      });
      router.back();
    };

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        {/* カテゴリ */}
        <Card>
          <Text style={styles.label}>カテゴリ</Text>
          <Text style={styles.helper}>同じカテゴリの仲間とランキングで競えます。</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.catChip,
                    active && { backgroundColor: `${c.color}26`, borderColor: c.color },
                  ]}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={active ? c.color : colors.textSub}
                  />
                  <Text style={[styles.catChipText, active && { color: c.color }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 頻度 */}
        <Card>
          <Text style={styles.label}>どのくらいの頻度で続ける？</Text>

          <View style={styles.segment}>
            <SegmentButton
              active={frequency === 'daily'}
              icon="flame"
              title="毎日"
              sub="毎日つづける"
              onPress={() => setFrequency('daily')}
            />
            <SegmentButton
              active={frequency === 'weekdays'}
              icon="calendar"
              title="特定の曜日"
              sub="曜日を選ぶ"
              onPress={() => setFrequency('weekdays')}
            />
          </View>

          {frequency === 'weekdays' && (
            <>
              {/* クイック選択 */}
              <View style={styles.presetRow}>
                <PresetChip label="平日" onPress={() => applyPreset('weekday')} />
                <PresetChip label="週末" onPress={() => applyPreset('weekend')} />
                <PresetChip label="毎日" onPress={() => applyPreset('all')} />
              </View>

              {/* 曜日 */}
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((w, i) => {
                  const active = weekdays.includes(i);
                  const isSun = i === 0;
                  const isSat = i === 6;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => toggleWeekday(i)}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          isSun && styles.sun,
                          isSat && styles.sat,
                          active && styles.dayChipTextActive,
                        ]}
                      >
                        {w}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.freqSummary}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.freqSummaryText}>
              1週間に <Text style={styles.freqCount}>{scheduledPerWeek}回</Text>、4週間で{' '}
              <Text style={styles.freqCount}>{scheduledPerWeek * 4}回</Text> がんばります
            </Text>
          </View>
        </Card>

        {/* 期間 */}
        <Card>
          <Text style={styles.label}>期間</Text>
          <Text style={styles.fixedValue}>4週間（1ヶ月）</Text>
          <Text style={styles.helper}>今日から4週間、続けていきます。</Text>
        </Card>

        {/* 積立（週¥100固定・モック） */}
        <Card>
          <Text style={styles.label}>積立（モック・実際の決済はしません）</Text>
          <View style={styles.stakeRow}>
            <View style={styles.stakeIcon}>
              <Ionicons name="card" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stakeValue}>週 ¥{WEEKLY_STAKE}</Text>
              <Text style={styles.stakeSub}>4週間で最大 ¥{WEEKLY_STAKE * DURATION_WEEKS}</Text>
            </View>
          </View>
          <View style={styles.stakeRules}>
            <View style={styles.stakeRule}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.stakeRuleText}>週の予定をすべて達成 → ¥{WEEKLY_STAKE} 全額返金</Text>
            </View>
            <View style={styles.stakeRule}>
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={styles.stakeRuleText}>1日でもサボる → 返金なし。そのまま課金</Text>
            </View>
          </View>
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
  icon,
  title,
  sub,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
      <Ionicons name={icon} size={22} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.segmentTitle, active && styles.segmentTitleActive]}>{title}</Text>
      <Text style={[styles.segmentSub, active && styles.segmentSubActive]}>{sub}</Text>
    </Pressable>
  );
}

function PresetChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.presetChip}>
      <Text style={styles.presetChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  label: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  input: {
    marginTop: spacing.sm,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helper: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
  fixedValue: { marginTop: spacing.sm, fontSize: font.heading, fontWeight: '900', color: colors.text },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  catChipText: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },

  segment: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segmentBtnActive: { backgroundColor: 'rgba(198,244,50,0.12)', borderColor: colors.primary },
  segmentTitle: { fontSize: font.body, fontWeight: '800', color: colors.textSub, marginTop: 6 },
  segmentTitleActive: { color: colors.text },
  segmentSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  segmentSubActive: { color: colors.primary },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: { fontSize: font.small, fontWeight: '700', color: colors.text },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: font.body, fontWeight: '800', color: colors.textSub },
  dayChipTextActive: { color: colors.onAccent },
  sun: { color: '#FF8A8A' },
  sat: { color: '#8AB4FF' },

  freqSummary: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  freqSummaryText: { fontSize: font.sub, color: colors.text, fontWeight: '600', lineHeight: 20, flex: 1 },
  freqCount: { color: colors.primary, fontWeight: '900' },

  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  stakeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeValue: {
    fontSize: font.heading,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  stakeSub: {
    fontSize: font.small,
    color: colors.textSub,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  stakeRules: { marginTop: spacing.md, gap: spacing.sm },
  stakeRule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stakeRuleText: {
    fontSize: font.sub,
    color: colors.textSub,
    fontWeight: '600',
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
});

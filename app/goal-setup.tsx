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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { Frequency, GoalCategory, IconName } from '@/types';
import { CATEGORIES } from '@/logic/category';
import { MONTHLY_STAKE, WEEKLY_PENALTY } from '@/logic/billing';
import { quoteOfToday } from '@/logic/quotes';
import { todayStr } from '@/logic/date';
import { confirmAsync, notifyAsync } from '@/logic/confirm';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DURATION_WEEKS = 4;
const WEEKLY_COUNT_OPTIONS = [2, 3, 4, 5];

export default function GoalSetupScreen() {
  const router = useRouter();
  const { goal, createGoal, nextStartCharge } = useApp();

  const [name, setName] = useState(goal?.name ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'exercise');
  const [frequency, setFrequency] = useState<Frequency>(goal?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(goal?.weekdays ?? [1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(goal?.weeklyTarget ?? 3);

  const quote = quoteOfToday(todayStr());
  const isFree = nextStartCharge === 0;

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const applyPreset = (preset: 'weekday' | 'weekend' | 'all') => {
    setFrequency('weekdays');
    if (preset === 'weekday') setWeekdays([1, 2, 3, 4, 5]);
    else if (preset === 'weekend') setWeekdays([0, 6]);
    else setWeekdays([0, 1, 2, 3, 4, 5, 6]);
  };

  const perWeek =
    frequency === 'daily' ? 7 : frequency === 'weekly_count' ? weeklyTarget : weekdays.length;

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notifyAsync('目標名を入力してください');
      return;
    }
    if (frequency === 'weekdays' && weekdays.length === 0) {
      notifyAsync('曜日を1つ以上選んでください');
      return;
    }

    const chargeMsg = isFree
      ? '今月は無料で始めます（前月パーフェクト達成の特典）。'
      : `開始すると月額 ¥${MONTHLY_STAKE}（モック）を積立てます。1ヶ月パーフェクトで翌月無料。`;
    const confirmMsg = goal
      ? `これまでの記録はリセットされ、新しい4週間が始まります。\n${chargeMsg}`
      : chargeMsg;

    const ok = await confirmAsync(
      goal ? '目標を作り直しますか？' : 'この目標で始めますか？',
      confirmMsg,
      goal ? '作り直す' : '始める'
    );
    if (!ok) return;

    await createGoal({
      name: trimmed,
      category,
      frequency,
      weekdays: frequency === 'weekdays' ? weekdays : [],
      weeklyTarget,
      durationWeeks: DURATION_WEEKS,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* やる気の格言 */}
        <View style={styles.quoteCard}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            {quote.sub ? <Text style={styles.quoteSub}>{quote.sub}</Text> : null}
          </View>
        </View>

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
          <Text style={styles.helper}>同じカテゴリの仲間と月間ランキングで競えます。</Text>
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
                  <Ionicons name={c.icon} size={16} color={active ? c.color : colors.textSub} />
                  <Text style={[styles.catChipText, active && { color: c.color }]}>{c.label}</Text>
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
              onPress={() => setFrequency('daily')}
            />
            <SegmentButton
              active={frequency === 'weekdays'}
              icon="calendar"
              title="曜日を選ぶ"
              onPress={() => setFrequency('weekdays')}
            />
            <SegmentButton
              active={frequency === 'weekly_count'}
              icon="repeat"
              title="週に何回"
              onPress={() => setFrequency('weekly_count')}
            />
          </View>

          {frequency === 'weekdays' && (
            <>
              <View style={styles.presetRow}>
                <PresetChip label="平日" onPress={() => applyPreset('weekday')} />
                <PresetChip label="週末" onPress={() => applyPreset('weekend')} />
                <PresetChip label="毎日" onPress={() => applyPreset('all')} />
              </View>
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
                        style={[
                          styles.dayChipText,
                          i === 0 && styles.sun,
                          i === 6 && styles.sat,
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

          {frequency === 'weekly_count' && (
            <>
              <Text style={styles.helper}>曜日は自由。1週間の中で目標回数だけ達成すればOK。</Text>
              <View style={styles.countRow}>
                {WEEKLY_COUNT_OPTIONS.map((n) => {
                  const active = weeklyTarget === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setWeeklyTarget(n)}
                      style={[styles.countChip, active && styles.countChipActive]}
                    >
                      <Text style={[styles.countValue, active && styles.countValueActive]}>{n}</Text>
                      <Text style={[styles.countUnit, active && styles.countValueActive]}>回/週</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.freqSummary}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.freqSummaryText}>
              1週間に <Text style={styles.freqCount}>{perWeek}回</Text>、4週間で{' '}
              <Text style={styles.freqCount}>{perWeek * 4}回</Text> がんばります
            </Text>
          </View>
        </Card>

        {/* 期間 */}
        <Card>
          <Text style={styles.label}>期間</Text>
          <Text style={styles.fixedValue}>4週間（1ヶ月）</Text>
          <Text style={styles.helper}>1ヶ月ごとにシーズンが区切られ、仲間と競います。</Text>
        </Card>

        {/* 課金（月¥500プール制・モック） */}
        <Card style={isFree ? { borderColor: colors.success } : undefined}>
          <Text style={styles.label}>積立（モック・実際の決済はしません）</Text>
          <View style={styles.stakeRow}>
            <View style={styles.stakeIcon}>
              <Ionicons name={isFree ? 'gift' : 'card'} size={20} color={isFree ? colors.success : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              {isFree ? (
                <>
                  <Text style={[styles.stakeValue, { color: colors.success }]}>今月は無料</Text>
                  <Text style={styles.stakeSub}>前月パーフェクト達成の特典</Text>
                </>
              ) : (
                <>
                  <Text style={styles.stakeValue}>月額 ¥{MONTHLY_STAKE}</Text>
                  <Text style={styles.stakeSub}>開始時に積立（プール）します</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.stakeRules}>
            <View style={styles.stakeRule}>
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={styles.stakeRuleText}>未達がある週ごとに ¥{WEEKLY_PENALTY} 没収</Text>
            </View>
            <View style={styles.stakeRule}>
              <Ionicons name="gift" size={15} color={colors.success} />
              <Text style={styles.stakeRuleText}>1ヶ月パーフェクトなら、翌月が無料</Text>
            </View>
          </View>
        </Card>

        <PrimaryButton
          label={goal ? '目標を作り直す' : 'この目標で始める'}
          icon={isFree ? 'gift' : 'flame'}
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
  onPress,
}: {
  active: boolean;
  icon: IconName;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.segmentTitle, active && styles.segmentTitleActive]}>{title}</Text>
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

  quoteCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(198,244,50,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.3)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  quoteText: { fontSize: 16, fontWeight: '800', color: colors.text, lineHeight: 22 },
  quoteSub: { fontSize: 12, color: colors.textSub, marginTop: 4, lineHeight: 17 },

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
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segmentBtnActive: { backgroundColor: 'rgba(198,244,50,0.12)', borderColor: colors.primary },
  segmentTitle: { fontSize: 12, fontWeight: '800', color: colors.textSub, textAlign: 'center' },
  segmentTitleActive: { color: colors.text },

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

  countRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  countChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  countChipActive: { backgroundColor: 'rgba(198,244,50,0.12)', borderColor: colors.primary },
  countValue: { fontSize: 22, fontWeight: '900', color: colors.textSub },
  countValueActive: { color: colors.text },
  countUnit: { fontSize: 10, fontWeight: '700', color: colors.textMuted },

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
  stakeValue: { fontSize: font.heading, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  stakeSub: { fontSize: font.small, color: colors.textSub, marginTop: 2 },
  stakeRules: { marginTop: spacing.md, gap: spacing.sm },
  stakeRule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stakeRuleText: { fontSize: font.sub, color: colors.textSub, fontWeight: '600', flex: 1 },
});

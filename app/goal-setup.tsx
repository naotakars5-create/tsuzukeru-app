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
import { DEFAULT_CATEGORY, categoryOf } from '@/logic/category';
import { CategoryPicker } from '@/components/CategoryPicker';
import { communityCount } from '@/logic/social';
import { DEPOSIT_OPTIONS, DEFAULT_DEPOSIT, weekStake } from '@/logic/billing';
import { randomHotQuote } from '@/logic/quotes';
import { confirmAsync, notifyAsync } from '@/logic/confirm';
import { DAILY_TARGET_OPTIONS, formatMinutes } from '@/logic/time';
import { addDays, todayStr, daysBetween, formatDisplay } from '@/logic/date';
import { promptAsync } from '@/logic/confirm';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DURATION_WEEKS = 4;
const WEEKLY_COUNT_OPTIONS = [2, 3, 4, 5];
/** 試験日のクイック選択 */
const EXAM_PRESETS = [
  { label: '1ヶ月後', days: 30 },
  { label: '3ヶ月後', days: 90 },
  { label: '半年後', days: 180 },
  { label: '1年後', days: 365 },
];
/** 合格までの目安総時間 */
const TARGET_HOURS_PRESETS = [100, 300, 500, 1000];

export default function GoalSetupScreen() {
  const router = useRouter();
  const { goal, createGoal } = useApp();

  const [name, setName] = useState(goal?.name ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? DEFAULT_CATEGORY);
  const [frequency, setFrequency] = useState<Frequency>(goal?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(goal?.weekdays ?? [1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(goal?.weeklyTarget ?? 3);
  const [dailyTargetMin, setDailyTargetMin] = useState<number>(goal?.dailyTargetMin ?? 120);
  const [deposit, setDeposit] = useState<number>(goal?.deposit ?? DEFAULT_DEPOSIT);
  const [examDate, setExamDate] = useState<string | null>(goal?.examDate ?? null);
  const [targetHours, setTargetHours] = useState<number | null>(goal?.targetTotalHours ?? null);

  const [quote] = useState(() => randomHotQuote());
  const perWeekStake = weekStake(deposit, 4);
  const challengerCount = communityCount(category);

  const pickExamDate = async () => {
    const v = await promptAsync('試験日を入力', 'YYYY-MM-DD の形式（例: 2026-10-18）', examDate ?? '');
    if (!v) return;
    const t = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      notifyAsync('日付の形式が正しくありません', 'YYYY-MM-DD の形式で入力してください（例: 2026-10-18）');
      return;
    }
    setExamDate(t);
  };

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

    const depositMsg =
      `コミット額 ¥${deposit.toLocaleString()} で始めます（モック・実際の決済はしません）。\n` +
      `お金は預かりません。達成すれば¥0、サボった週ぶん（¥${perWeekStake.toLocaleString()}/週）だけ後から課金されます。`;
    const confirmMsg = goal
      ? `これまでの記録はリセットされ、新しい4週間が始まります。\n${depositMsg}`
      : depositMsg;

    const ok = await confirmAsync(
      goal ? '目標を作り直しますか？' : `コミット ¥${deposit.toLocaleString()} で始めますか？`,
      confirmMsg,
      goal ? '作り直す' : 'この覚悟で始める'
    );
    if (!ok) return;

    await createGoal({
      name: trimmed,
      category,
      frequency,
      weekdays: frequency === 'weekdays' ? weekdays : [],
      weeklyTarget,
      dailyTargetMin,
      deposit,
      examDate,
      targetTotalHours: targetHours,
      durationWeeks: DURATION_WEEKS,
    });
    // 「火がつく」演出を挟んでホームへ
    router.replace('/ignite');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* やる気の格言（毎回変わる・偉人の名言は作者つき） */}
        <View style={styles.quoteCard}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            {quote.author ? <Text style={styles.quoteSub}>— {quote.author}</Text> : null}
          </View>
        </View>

        {/* 目標名 */}
        <Card>
          <Text style={styles.label}>今週やること（勉強内容）</Text>
          <TextInput
            style={styles.input}
            placeholder={categoryOf(category).placeholder}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </Card>

        {/* 1日の目標勉強時間 */}
        <Card>
          <Text style={styles.label}>1日の目標勉強時間</Text>
          <Text style={styles.helper}>ストップウォッチで計測し、この時間に届いた日が「達成」です。</Text>
          <View style={styles.countRow}>
            {DAILY_TARGET_OPTIONS.map((m) => {
              const active = dailyTargetMin === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setDailyTargetMin(m)}
                  style={[styles.timeChip, active && styles.countChipActive]}
                >
                  <Text style={[styles.countValue, active && styles.countValueActive]}>
                    {m >= 60 ? m / 60 : m}
                  </Text>
                  <Text style={[styles.countUnit, active && styles.countValueActive]}>
                    {m >= 60 ? '時間' : '分'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* コミュニティ（目指す資格） */}
        <Card>
          <Text style={styles.label}>目指す資格・試験（コミュニティ）</Text>
          <Text style={styles.helper}>
            ジャンルから選ぶか、検索できます。同じ資格を目指す仲間と月間ランキングで競えます。
          </Text>
          <CategoryPicker value={category} onChange={setCategory} />
          <View style={styles.rivalTeaser}>
            <Ionicons name="flame" size={15} color={colors.primary} />
            <Text style={styles.rivalTeaserText}>
              <Text style={styles.rivalTeaserNum}>{challengerCount}</Text>人が
              「{categoryOf(category).label}」に挑戦中。あなたも競える。
            </Text>
          </View>
        </Card>

        {/* 試験日（任意） */}
        <Card>
          <Text style={styles.label}>試験日（任意）</Text>
          <Text style={styles.helper}>
            設定すると、ホームに「試験まであと◯日」と、間に合わせるための1日あたりの
            必要時間が出ます。
          </Text>
          <View style={styles.examRow}>
            {EXAM_PRESETS.map((p) => {
              const d = addDays(todayStr(), p.days);
              const active = examDate === d;
              return (
                <Pressable
                  key={p.days}
                  onPress={() => setExamDate(active ? null : d)}
                  style={[styles.examChip, active && styles.examChipActive]}
                >
                  <Text style={[styles.examChipText, active && styles.examChipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable onPress={pickExamDate} style={styles.examChip}>
              <Ionicons name="calendar" size={14} color={colors.textSub} />
              <Text style={styles.examChipText}>日付を入力</Text>
            </Pressable>
          </View>
          {examDate ? (
            <View style={styles.examPicked}>
              <Ionicons name="flag" size={15} color={colors.primary} />
              <Text style={styles.examPickedText}>
                {formatDisplay(examDate)} まで あと{' '}
                <Text style={styles.examPickedNum}>{daysBetween(todayStr(), examDate)}</Text> 日
              </Text>
              <Pressable onPress={() => setExamDate(null)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                <Text style={styles.examClear}>クリア</Text>
              </Pressable>
            </View>
          ) : null}

          {examDate ? (
            <>
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                合格までに必要な総勉強時間（任意）
              </Text>
              <Text style={styles.helper}>逆算して「1日あたり◯時間」を出します。</Text>
              <View style={styles.examRow}>
                {TARGET_HOURS_PRESETS.map((h) => {
                  const active = targetHours === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setTargetHours(active ? null : h)}
                      style={[styles.examChip, active && styles.examChipActive]}
                    >
                      <Text style={[styles.examChipText, active && styles.examChipTextActive]}>
                        {h}h
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
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

        {/* コミット額（案C・モック。お金は預からない） */}
        <Card>
          <Text style={styles.label}>コミット額を決める</Text>
          <Text style={styles.helper}>
            お金は預かりません。達成すれば¥0、サボった週ぶんだけ後からカードに課金される方式です。
          </Text>
          <View style={styles.countRow}>
            {DEPOSIT_OPTIONS.map((d) => {
              const active = deposit === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDeposit(d)}
                  style={[styles.timeChip, active && styles.countChipActive]}
                >
                  <Text
                    style={[styles.countValue, { fontSize: 15 }, active && styles.countValueActive]}
                    numberOfLines={1}
                  >
                    ¥{d.toLocaleString()}
                  </Text>
                  <Text style={[styles.countUnit, active && styles.countValueActive]}>
                    週¥{weekStake(d, 4).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* 2つの結末を視覚的に対比 */}
          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeCard, styles.outcomeGood]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.outcomeLabel}>続けたら</Text>
              <Text style={[styles.outcomeAmount, { color: colors.success }]}>¥0</Text>
              <Text style={styles.outcomeSub}>達成した週は無料</Text>
            </View>
            <View style={styles.outcomeVs}>
              <Text style={styles.outcomeVsText}>VS</Text>
            </View>
            <View style={[styles.outcomeCard, styles.outcomeBad]}>
              <Ionicons name="card" size={22} color={colors.danger} />
              <Text style={styles.outcomeLabel}>サボったら</Text>
              <Text style={[styles.outcomeAmount, { color: colors.danger }]}>
                ¥{perWeekStake.toLocaleString()}
              </Text>
              <Text style={styles.outcomeSub}>その週ぶんだけ課金</Text>
            </View>
          </View>
        </Card>

        <PrimaryButton
          label={goal ? '目標を作り直す' : `コミット ¥${deposit.toLocaleString()} で始める`}
          icon="flame"
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
  timeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
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

  outcomeRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: spacing.lg, gap: spacing.sm },
  outcomeCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  outcomeGood: { backgroundColor: colors.successBg, borderColor: 'rgba(74,222,128,0.4)' },
  outcomeBad: { backgroundColor: colors.surfaceDanger, borderColor: colors.borderDanger },
  outcomeLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '800', marginTop: 2 },
  outcomeAmount: { fontSize: 30, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  outcomeSub: { fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
  outcomeVs: { justifyContent: 'center', alignItems: 'center', width: 24 },
  outcomeVsText: { fontSize: font.small, fontWeight: '900', color: colors.textMuted },

  rivalTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rivalTeaserText: { flex: 1, fontSize: font.small, color: colors.textSub, fontWeight: '600', lineHeight: 17 },
  rivalTeaserNum: { color: colors.primary, fontWeight: '900', fontVariant: ['tabular-nums'] },

  examRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  examChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  examChipActive: { backgroundColor: 'rgba(198,244,50,0.14)', borderColor: colors.primary },
  examChipText: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  examChipTextActive: { color: colors.primary },
  examPicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  examPickedText: { fontSize: font.small, color: colors.textSub, fontWeight: '700' },
  examPickedNum: { color: colors.primary, fontWeight: '900', fontVariant: ['tabular-nums'] },
  examClear: { fontSize: font.small, color: colors.danger, fontWeight: '800' },
});

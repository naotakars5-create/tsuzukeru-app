import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Art } from '@/components/Art';
import { colors, font, radius, spacing } from '@/theme';
import { todayStr, formatDisplay } from '@/logic/date';
import { formatMinutes } from '@/logic/time';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 'YYYY-MM-DD' → 曜日ラベル */
function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '';
  return WD[new Date(y, m - 1, d).getDay()];
}

/**
 * 学習メモ（記録帳）。
 * 毎日「何をどれだけ勉強したか・気づき」を自由に書き、過去の記録を振り返る。
 * その日の勉強時間（分）も一緒に表示する。
 */
export default function JournalScreen() {
  const { minutes, notes, setNote, subjectLogs } = useApp();
  const today = todayStr();
  const [selected, setSelected] = useState(today);
  const [text, setText] = useState(notes[today] ?? '');

  // 選択日が変わったら、その日のメモを読み込む
  useEffect(() => {
    setText(notes[selected] ?? '');
  }, [selected, notes]);

  const save = () => setNote(selected, text);

  // 記録のある日（勉強時間 or メモがある日）を新しい順に
  const history = useMemo(() => {
    const set = new Set<string>([...Object.keys(minutes), ...Object.keys(notes)]);
    return Array.from(set)
      .filter((d) => (minutes[d] ?? 0) > 0 || (notes[d] ?? '').trim().length > 0)
      .sort((a, b) => b.localeCompare(a));
  }, [minutes, notes]);

  const selMin = minutes[selected] ?? 0;
  const isToday = selected === today;

  // 選択日の科目別内訳
  const daySubjects = useMemo(
    () => subjectLogs.filter((l) => l.date === selected).sort((a, b) => b.minutes - a.minutes),
    [subjectLogs, selected]
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '学習メモ' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 今日（選択日）の記入エリア */}
        <View style={styles.editor}>
          <View style={styles.editorHead}>
            <View>
              <Text style={styles.editorDate}>
                {isToday ? '今日' : formatDisplay(selected)}（{weekdayOf(selected)}）
              </Text>
              <Text style={styles.editorMeta}>
                勉強時間 {formatMinutes(selMin)}
                {!isToday ? ` ・ ${formatDisplay(selected)}` : ''}
              </Text>
            </View>
            <Art name="candle" size={46} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="今日やったこと・気づき・反省をメモ&#10;例: 英単語50個、過去問 大問3まで。夜は集中できた。"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            onBlur={save}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          {daySubjects.length > 0 && (
            <View style={styles.subjBox}>
              <Text style={styles.subjTitle}>科目の内訳</Text>
              {daySubjects.map((l) => {
                const max = Math.max(...daySubjects.map((x) => x.minutes), 1);
                return (
                  <View key={l.subject} style={styles.subjRow}>
                    <Text style={styles.subjName} numberOfLines={1}>
                      {l.subject}
                    </Text>
                    <View style={styles.subjTrack}>
                      <View
                        style={[styles.subjFill, { width: `${Math.round((l.minutes / max) * 100)}%` }]}
                      />
                    </View>
                    <Text style={styles.subjMin}>{formatMinutes(l.minutes)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.editorFoot}>
            <Text style={styles.count}>{text.length} / 1000</Text>
            <PrimaryButton label="保存" icon="checkmark" onPress={save} style={styles.saveBtn} />
          </View>
        </View>

        {/* 過去の記録 */}
        <Text style={styles.sectionLabel}>これまでの記録</Text>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Art name="ember" size={120} opacity={0.9} />
            <Text style={styles.emptyText}>
              まだ記録がありません。{'\n'}勉強したら、その日のメモを残そう。
            </Text>
          </View>
        ) : (
          history.map((d) => {
            const min = minutes[d] ?? 0;
            const note = notes[d] ?? '';
            const active = d === selected;
            return (
              <Pressable
                key={d}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => setSelected(d)}
              >
                <View style={styles.rowDateCol}>
                  <Text style={styles.rowDate}>{formatDisplay(d)}</Text>
                  <Text style={styles.rowWd}>（{weekdayOf(d)}）</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowMinRow}>
                    <Ionicons name="time" size={13} color={colors.primary} />
                    <Text style={styles.rowMin}>{formatMinutes(min)}</Text>
                    {d === today && <Text style={styles.todayTag}>今日</Text>}
                  </View>
                  {note ? (
                    <Text style={styles.rowNote} numberOfLines={2}>
                      {note}
                    </Text>
                  ) : (
                    <Text style={styles.rowNoteEmpty}>メモなし（タップで追記）</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })
        )}

        <Text style={styles.note}>
          ※ メモはこの端末内にのみ保存されます。時間の長さより「続けた記録」を残すのが目的です。
        </Text>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  editor: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  editorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editorDate: { fontSize: font.heading, fontWeight: '900', color: colors.text },
  editorMeta: { fontSize: font.small, color: colors.textSub, marginTop: 2, fontVariant: ['tabular-nums'] },
  penBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    marginTop: spacing.md,
    minHeight: 128,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 22,
  },
  subjBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  subjTitle: { fontSize: font.small, fontWeight: '800', color: colors.textSub },
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subjName: { width: 84, fontSize: font.small, color: colors.text, fontWeight: '700' },
  subjTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  subjFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  subjMin: {
    width: 58,
    textAlign: 'right',
    fontSize: font.small,
    color: colors.textSub,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  editorFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  count: { fontSize: font.small, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  saveBtn: { height: 44, paddingHorizontal: spacing.xl },

  sectionLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },

  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyText: { fontSize: font.sub, color: colors.textSub, textAlign: 'center', lineHeight: 22 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: 'rgba(198,244,50,0.06)' },
  rowDateCol: { width: 64 },
  rowDate: { fontSize: font.sub, fontWeight: '800', color: colors.text },
  rowWd: { fontSize: font.small, color: colors.textSub },
  rowMinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMin: { fontSize: font.small, color: colors.textSub, fontWeight: '700', fontVariant: ['tabular-nums'] },
  todayTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onAccent,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginLeft: 4,
  },
  rowNote: { fontSize: font.sub, color: colors.text, marginTop: 3, lineHeight: 19 },
  rowNoteEmpty: { fontSize: font.small, color: colors.textMuted, marginTop: 3, fontStyle: 'italic' },

  note: { fontSize: font.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },
});

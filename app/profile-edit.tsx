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
import { IconName } from '@/types';
import { categoryOf } from '@/logic/category';
import { frequencyLabel } from '@/logic/schedule';

const ICONS: IconName[] = ['person', 'walk', 'barbell', 'book', 'sunny', 'heart', 'bicycle', 'flash', 'rocket', 'paw'];
const COLORS = ['#C6F432', '#FF9F43', '#6AA6FF', '#4ADE80', '#FF6B8A', '#A78BFA', '#FFC24B', '#4FD1C5'];

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile, progress, lifetime, goal, unlockedBadgeCount, badges } = useApp();

  const [name, setName] = useState(profile.name);
  const [icon, setIcon] = useState<IconName>(profile.icon);
  const [color, setColor] = useState(profile.color);
  const [motivation, setMotivation] = useState(profile.motivation);

  const onSave = async () => {
    await updateProfile({
      name: name.trim() || 'あなた',
      icon,
      color,
      motivation: motivation.trim(),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* プレビュー */}
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: `${color}22`, borderColor: color }]}>
            <Ionicons name={icon} size={40} color={color} />
          </View>
          <Text style={styles.previewName}>{name || 'あなた'}</Text>
          <View style={styles.rankRow}>
            <Ionicons name={progress.rank.icon} size={14} color={progress.rank.color} />
            <Text style={[styles.rankText, { color: progress.rank.color }]}>{progress.rank.label}</Text>
          </View>
        </View>

        {/* 名前 */}
        <Card>
          <Text style={styles.label}>表示名</Text>
          <TextInput
            style={styles.input}
            placeholder="あなたの名前"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={16}
          />
        </Card>

        {/* アイコン */}
        <Card>
          <Text style={styles.label}>アイコン</Text>
          <View style={styles.grid}>
            {ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => setIcon(ic)}
                style={[styles.iconChip, icon === ic && { borderColor: color, backgroundColor: `${color}22` }]}
              >
                <Ionicons name={ic} size={22} color={icon === ic ? color : colors.textSub} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: spacing.lg }]}>色</Text>
          <View style={styles.grid}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorChip, { backgroundColor: c }, color === c && styles.colorChipActive]}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#0C0F14" />}
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 意気込み */}
        <Card>
          <Text style={styles.label}>意気込み（ひとこと）</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder="例: 今度こそ習慣にする。"
            placeholderTextColor={colors.textMuted}
            value={motivation}
            onChangeText={setMotivation}
            maxLength={60}
            multiline
          />
        </Card>

        {/* 自分のスタッツ */}
        <Card>
          <Text style={styles.label}>あなたの記録</Text>
          <View style={styles.statsRow}>
            <Stat value={progress.totalDone} label="通算達成" />
            <Stat value={progress.bestStreak} label="最高連続" />
            <Stat value={lifetime.seasonsCompleted} label="完走ｼｰｽﾞﾝ" />
            <Stat value={unlockedBadgeCount} label="バッジ" />
          </View>
          {goal && (
            <Text style={styles.goalLine}>
              いまの目標: {goal.name}（{categoryOf(goal.category).label}・{frequencyLabel(goal)}）
            </Text>
          )}
        </Card>

        <PrimaryButton label="保存する" icon="checkmark" onPress={onSave} style={{ marginTop: spacing.sm }} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  preview: { alignItems: 'center', paddingVertical: spacing.md },
  previewIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  previewName: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  rankText: { fontSize: font.sub, fontWeight: '800' },

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

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipActive: { borderWidth: 3, borderColor: colors.text },

  statsRow: { flexDirection: 'row', marginTop: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: font.heading, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, color: colors.textSub, marginTop: 2, fontWeight: '600' },
  goalLine: { fontSize: font.small, color: colors.textSub, marginTop: spacing.md },
});

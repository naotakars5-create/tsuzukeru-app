import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme';
import { buildRivalProfile } from '@/logic/social';
import { categoryOf } from '@/logic/category';
import { formatMinutes } from '@/logic/time';
import { GoalCategory } from '@/types';

/** 相手のプロフィール（モック） */
export default function RivalProfileScreen() {
  const params = useLocalSearchParams<{ id: string; category: string }>();
  const id = String(params.id ?? '');
  const category = (String(params.category ?? 'other') as GoalCategory) || 'other';

  const profile = useMemo(() => buildRivalProfile(category, id), [category, id]);
  const cat = categoryOf(category);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: profile.name }} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${profile.color}22`, borderColor: profile.color }]}>
          <Ionicons name={profile.icon} size={44} color={profile.color} />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.rankRow}>
          <Ionicons name={profile.rank.icon} size={14} color={profile.rank.color} />
          <Text style={[styles.rankText, { color: profile.rank.color }]}>{profile.rank.label}</Text>
        </View>
      </View>

      {/* 意気込み */}
      <Card>
        <Text style={styles.label}>意気込み</Text>
        <Text style={styles.motivation}>“{profile.motivation}”</Text>
      </Card>

      {/* 目標 */}
      <Card>
        <Text style={styles.label}>取り組んでいる目標</Text>
        <View style={styles.goalRow}>
          <View style={[styles.goalIcon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName}>{profile.goalName}</Text>
            <Text style={styles.goalMeta}>{cat.label}カテゴリ</Text>
          </View>
        </View>
      </Card>

      {/* スタッツ */}
      <Card>
        <Text style={styles.label}>これまでの記録</Text>
        <View style={styles.statsRow}>
          <Stat value={profile.streak} label="連続達成" icon="flame" color={colors.orange} />
          <Stat value={profile.bestStreak} label="最高連続" icon="medal" color={colors.warning} />
          <Stat value={profile.totalDone} label="通算達成" icon="layers" color={colors.purple} />
        </View>
        <View style={styles.totalMinRow}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={styles.totalMinText}>
            総勉強時間 <Text style={styles.totalMinValue}>{formatMinutes(profile.totalMinutes)}</Text>
          </Text>
        </View>
      </Card>

      <Text style={styles.note}>※ このプロフィールは試作用のダミーデータです。</Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Stat({
  value,
  label,
  icon,
  color,
}: {
  value: number;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  header: { alignItems: 'center', paddingVertical: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  name: { fontSize: font.title, fontWeight: '900', color: colors.text, marginTop: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  rankText: { fontSize: font.sub, fontWeight: '800' },

  label: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  motivation: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 28,
  },

  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: { fontSize: font.body, fontWeight: '800', color: colors.text },
  goalMeta: { fontSize: font.small, color: colors.textSub, marginTop: 2 },

  statsRow: { flexDirection: 'row', marginTop: spacing.md },
  totalMinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalMinText: { fontSize: font.sub, color: colors.textSub, fontWeight: '600' },
  totalMinValue: { color: colors.primary, fontWeight: '900' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: font.heading, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, color: colors.textSub, fontWeight: '600' },

  note: { fontSize: font.small, color: colors.textMuted },
});

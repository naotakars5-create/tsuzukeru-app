import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme';
import { fetchRival, RivalStats } from '@/lib/socialApi';
import { categoryOf } from '@/logic/category';
import { formatMinutes } from '@/logic/time';
import { IconName } from '@/types';

/** 同じ資格を目指している相手のプロフィール（実データ） */
export default function RivalProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? '');
  const [profile, setProfile] = useState<RivalStats | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetchRival(id).then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (profile === undefined) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'プロフィール' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'プロフィール' }} />
        <Ionicons name="person-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>このユーザーの情報は取得できませんでした。</Text>
      </View>
    );
  }

  const cat = categoryOf(profile.category ?? undefined);
  const avatarColor = profile.color ?? colors.primary;
  const avatarIcon = (profile.icon as IconName | null) ?? 'person';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: profile.name }} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}22`, borderColor: avatarColor }]}>
          <Ionicons name={avatarIcon} size={44} color={avatarColor} />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.rankRow}>
          <Ionicons name={profile.rank.icon} size={14} color={profile.rank.color} />
          <Text style={[styles.rankText, { color: profile.rank.color }]}>{profile.rank.label}</Text>
        </View>
      </View>

      {/* 意気込み */}
      {profile.motivation ? (
        <Card>
          <Text style={styles.label}>意気込み</Text>
          <Text style={styles.motivation}>“{profile.motivation}”</Text>
        </Card>
      ) : null}

      {/* 目指している資格 */}
      <Card>
        <Text style={styles.label}>目指している資格</Text>
        <View style={styles.goalRow}>
          <View style={[styles.goalIcon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName}>{cat.label}</Text>
            <Text style={styles.goalMeta}>同じ資格を目指す仲間</Text>
          </View>
        </View>
      </Card>

      {/* スタッツ */}
      <Card>
        <Text style={styles.label}>これまでの記録</Text>
        <View style={styles.statsRow}>
          <Stat value={profile.streak} label="連続達成" icon="flame" color={colors.primary} />
          <Stat value={profile.points} label="通算pt" icon="medal" color={colors.silver} />
        </View>
        <View style={styles.totalMinRow}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={styles.totalMinText}>
            今月の勉強時間{' '}
            <Text style={styles.totalMinValue}>{formatMinutes(profile.monthMinutes)}</Text>
          </Text>
        </View>
      </Card>

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

  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: font.sub,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  note: { fontSize: font.small, color: colors.textMuted },
});

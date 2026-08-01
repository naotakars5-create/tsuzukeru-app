import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, font, radius, spacing } from '@/theme';
import { formatDisplay } from '@/logic/date';
import { frequencyLabel } from '@/logic/schedule';
import { categoryOf } from '@/logic/category';
import { confirmAsync, notifyAsync } from '@/logic/confirm';

/** リマインドで選べる時刻（時） */
const REMINDER_HOURS = [6, 7, 8, 9, 12, 17, 18, 19, 20, 21, 22, 23];
/** リマインドで選べる分 */
const REMINDER_MINUTES = [0, 15, 30, 45];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    goal,
    reminder,
    updateReminder,
    resetAll,
    profile,
    premium,
    setPremium,
    communityLimit,
    communityCreationsThisMonth,
  } = useApp();

  const onTogglePremium = async (v: boolean) => {
    if (v) {
      await setPremium(true);
      notifyAsync('プレミアムに登録しました', `コミュニティを毎月${communityLimit}個まで作成できます（モック）。`);
    } else {
      const ok = await confirmAsync('プレミアムを解約', 'コミュニティの作成ができなくなります（参加は引き続き無料）。解約しますか？', '解約する');
      if (ok) await setPremium(false);
    }
  };

  const category = categoryOf(goal?.category);

  const onToggleReminder = async (enabled: boolean) => {
    const ok = await updateReminder({ ...reminder, enabled });
    if (enabled && !ok) {
      notifyAsync(
        '通知を許可してください',
        'この端末で通知が許可されていないため、リマインドを設定できませんでした。（Web版では通知は使えません）'
      );
    }
  };

  const onPickHour = (hour: number) => updateReminder({ ...reminder, hour });
  const onPickMinute = (minute: number) => updateReminder({ ...reminder, minute });

  const onReset = async () => {
    const ok = await confirmAsync(
      'データをリセット',
      '目標と達成記録・実績・プロフィールをすべて削除します。この操作は取り消せません。',
      '削除する'
    );
    if (ok) resetAll();
  };

  const timeLabel = `${String(reminder.hour).padStart(2, '0')}:${String(
    reminder.minute
  ).padStart(2, '0')}`;

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
            <View style={styles.goalTitleRow}>
              <Ionicons name={category.icon} size={16} color={category.color} />
              <Text style={styles.goalName}>{goal.name}</Text>
            </View>
            <Text style={styles.goalMeta}>
              {category.label}・{frequencyLabel(goal)}・4週間・コミット¥{goal.deposit.toLocaleString()}（モック）
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

      {/* プロフィール */}
      <Card>
        <Text style={styles.sectionLabel}>プロフィール</Text>
        <Pressable style={styles.profileRow} onPress={() => router.push('/profile-edit')}>
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={[styles.profilePhoto, { borderColor: profile.color }]} />
          ) : (
            <View style={[styles.profileIcon, { backgroundColor: `${profile.color}22`, borderColor: profile.color }]}>
              <Ionicons name={profile.icon} size={22} color={profile.color} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileMotto} numberOfLines={1}>
              {profile.motivation || '意気込みを設定しよう'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      {/* リマインド通知 */}
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.titleRow}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>リマインド通知</Text>
          </View>
          <Switch
            value={reminder.enabled}
            onValueChange={onToggleReminder}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
        <Text style={styles.goalMeta}>
          {reminder.enabled
            ? `毎日 ${timeLabel} に「やる時間です」と通知します。`
            : 'オンにすると、毎日決まった時刻に通知でリマインドします。'}
        </Text>

        {reminder.enabled && (
          <>
            <Text style={styles.pickerLabel}>時刻</Text>
            <View style={styles.chipWrap}>
              {REMINDER_HOURS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => onPickHour(h)}
                  style={[styles.chip, reminder.hour === h && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, reminder.hour === h && styles.chipTextActive]}
                  >
                    {h}時
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.pickerLabel}>分</Text>
            <View style={styles.chipWrap}>
              {REMINDER_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => onPickMinute(m)}
                  style={[styles.chip, reminder.minute === m && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, reminder.minute === m && styles.chipTextActive]}
                  >
                    {String(m).padStart(2, '0')}分
                  </Text>
                </Pressable>
              ))}
            </View>
            {Platform.OS !== 'web' && (
              <Text style={styles.helperNote}>
                ※ 通知は端末内で完結するローカル通知です（サーバー不要）。
              </Text>
            )}
          </>
        )}
      </Card>

      {/* プレミアム会員（モック） */}
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.titleRow}>
            <Ionicons name="star" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>プレミアム会員</Text>
          </View>
          <Switch
            value={premium}
            onValueChange={onTogglePremium}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
        <Text style={styles.goalMeta}>
          {premium
            ? `加入中 ・ コミュニティを毎月${communityLimit}個まで作成できます（今月 ${communityCreationsThisMonth}/${communityLimit} 個）。`
            : `コミュニティの作成はプレミアム限定です（月${communityLimit}個まで）。参加は誰でも無料。`}
        </Text>
        <Text style={styles.helperNote}>※ 課金はすべてモックです。実際の決済はしません。</Text>
      </Card>

      {/* 将来の機能 — 実決済のみ残す */}
      <Card>
        <Text style={styles.sectionLabel}>これからの機能</Text>
        <FutureRow icon="card" title="実際のカード登録・課金" desc="本番の決済連携（達成すれば¥0・今後追加予定）" />
        <FutureRow icon="share-social" title="友だち招待" desc="本物の仲間との連携（今後追加予定）" />
      </Card>

      {/* データ管理 */}
      <Card>
        <Text style={styles.sectionLabel}>データ管理</Text>
        <Text style={styles.goalMeta}>データはこの端末内にのみ保存されます（サーバーなし）。</Text>
        <PrimaryButton
          label="すべてのデータをリセット"
          variant="ghost"
          onPress={onReset}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <Text style={styles.version}>覚悟の勉強 — MVP v1.2.0</Text>
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
  sectionLabel: { fontSize: font.sub, fontWeight: '800', color: colors.textSub },
  sectionTitle: { fontSize: font.body, fontWeight: '900', color: colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  profilePhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, backgroundColor: colors.surfaceAlt },
  profileName: { fontSize: font.body, fontWeight: '800', color: colors.text },
  profileMotto: { fontSize: font.small, color: colors.textSub, marginTop: 2 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  goalName: { fontSize: font.heading, fontWeight: '800', color: colors.text },
  goalMeta: { fontSize: font.sub, color: colors.textSub, marginTop: 4 },

  pickerLabel: {
    fontSize: font.small,
    fontWeight: '800',
    color: colors.textSub,
    marginTop: spacing.md,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, fontWeight: '700', color: colors.text },
  chipTextActive: { color: colors.onAccent },
  helperNote: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.md, lineHeight: 17 },

  futureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
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

  version: { textAlign: 'center', fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm },
});

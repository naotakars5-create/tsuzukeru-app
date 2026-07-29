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
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PhotoCropper } from '@/components/PhotoCropper';
import { colors, font, radius, spacing } from '@/theme';
import { IconName } from '@/types';
import { categoryOf } from '@/logic/category';
import { frequencyLabel } from '@/logic/schedule';
import { notifyAsync } from '@/logic/confirm';

const ICONS: IconName[] = ['person', 'walk', 'barbell', 'book', 'sunny', 'heart', 'bicycle', 'flash', 'rocket', 'paw'];
const COLORS = ['#C6F432', '#FF9F43', '#6AA6FF', '#4ADE80', '#FF6B8A', '#A78BFA', '#FFC24B', '#4FD1C5'];

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile, progress, lifetime, goal, unlockedBadgeCount, badges } = useApp();

  const [name, setName] = useState(profile.name);
  const [icon, setIcon] = useState<IconName>(profile.icon);
  const [color, setColor] = useState(profile.color);
  const [motivation, setMotivation] = useState(profile.motivation);
  const [photo, setPhoto] = useState<string | null>(profile.photo ?? null);
  const [picked, setPicked] = useState<{ uri: string; w: number; h: number } | null>(null);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        notifyAsync('写真へのアクセスが必要です', '設定から写真の許可をオンにしてください。');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setPicked({ uri: a.uri, w: a.width ?? 1000, h: a.height ?? 1000 });
    } catch {
      notifyAsync('写真を読み込めませんでした', 'もう一度お試しください。');
    }
  };

  const onSave = async () => {
    await updateProfile({
      name: name.trim() || 'あなた',
      icon,
      color,
      motivation: motivation.trim(),
      photo,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* プレビュー */}
        <View style={styles.preview}>
          <Pressable onPress={pickPhoto} style={styles.avatarPress}>
            {photo ? (
              <Image source={{ uri: photo }} style={[styles.previewPhoto, { borderColor: color }]} />
            ) : (
              <View style={[styles.previewIcon, { backgroundColor: `${color}22`, borderColor: color }]}>
                <Ionicons name={icon} size={40} color={color} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: color }]}>
              <Ionicons name="camera" size={15} color={colors.onAccent} />
            </View>
          </Pressable>
          <Text style={styles.previewName}>{name || 'あなた'}</Text>
          <View style={styles.rankRow}>
            <Ionicons name={progress.rank.icon} size={14} color={progress.rank.color} />
            <Text style={[styles.rankText, { color: progress.rank.color }]}>{progress.rank.label}</Text>
          </View>
          <View style={styles.photoActions}>
            <Pressable onPress={pickPhoto} style={styles.photoActionBtn}>
              <Ionicons name="image" size={15} color={colors.primary} />
              <Text style={styles.photoActionText}>{photo ? '写真を変える' : '写真を選ぶ'}</Text>
            </Pressable>
            {photo && (
              <Pressable onPress={() => setPhoto(null)} style={styles.photoActionBtn}>
                <Ionicons name="trash" size={15} color={colors.danger} />
                <Text style={[styles.photoActionText, { color: colors.danger }]}>写真を外す</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 切り抜きエディタ */}
        <PhotoCropper
          visible={!!picked}
          imageUri={picked?.uri ?? null}
          imageW={picked?.w ?? 1000}
          imageH={picked?.h ?? 1000}
          onCancel={() => setPicked(null)}
          onDone={(dataUri) => {
            setPhoto(dataUri);
            setPicked(null);
          }}
        />

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
          <Text style={styles.label}>アイコン（写真がないときに使用）</Text>
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
  avatarPress: { position: 'relative' },
  previewIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  previewPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    backgroundColor: colors.surfaceAlt,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  photoActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoActionText: { fontSize: font.small, fontWeight: '800', color: colors.primary },
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

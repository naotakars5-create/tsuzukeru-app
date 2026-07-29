import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoalCategory } from '@/types';
import {
  CATEGORIES,
  GENRES,
  categoryOf,
  genreOf,
  searchCategories,
} from '@/logic/category';
import { colors, font, radius, spacing } from '@/theme';

/**
 * 資格・試験のプルダウン選択。
 * 数が多いので、ふだんは選択中の1件だけを表示し、タップでモーダルを開く。
 * モーダルではジャンルごとに折りたたみ表示＋キーワード検索ができる。
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: GoalCategory;
  onChange: (key: GoalCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // 開いているジャンル（初期は選択中の資格のジャンル）
  const [expanded, setExpanded] = useState<string>(categoryOf(value).genre);

  const current = categoryOf(value);
  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchCategories(query) : []), [query, searching]);

  const pick = (key: GoalCategory) => {
    onChange(key);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* プルダウンのフィールド */}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <View style={[styles.fieldIcon, { backgroundColor: `${current.color}22` }]}>
          <Ionicons name={current.icon} size={18} color={current.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{current.label}</Text>
          <Text style={styles.fieldGenre}>{genreOf(current.genre).label}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textSub} />
      </Pressable>

      {/* 選択モーダル */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>資格・試験を選ぶ</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textSub} />
              </Pressable>
            </View>

            {/* 検索 */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="資格名で検索（例: 簿記、TOEIC）"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {searching ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {searching ? (
                results.length ? (
                  results.map((c) => (
                    <ExamRow key={c.key} cat={c} active={c.key === value} onPress={() => pick(c.key)} />
                  ))
                ) : (
                  <Text style={styles.noResult}>「{query}」に一致する資格がありません</Text>
                )
              ) : (
                GENRES.map((g) => {
                  const items = CATEGORIES.filter((c) => c.genre === g.key);
                  const isOpen = expanded === g.key;
                  return (
                    <View key={g.key} style={styles.genreBlock}>
                      <Pressable
                        style={styles.genreHead}
                        onPress={() => setExpanded(isOpen ? '' : g.key)}
                      >
                        <View style={[styles.genreIcon, { backgroundColor: `${g.color}22` }]}>
                          <Ionicons name={g.icon} size={16} color={g.color} />
                        </View>
                        <Text style={styles.genreLabel}>{g.label}</Text>
                        <Text style={styles.genreCount}>{items.length}</Text>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textSub}
                        />
                      </Pressable>
                      {isOpen &&
                        items.map((c) => (
                          <ExamRow key={c.key} cat={c} active={c.key === value} onPress={() => pick(c.key)} />
                        ))}
                    </View>
                  );
                })
              )}
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ExamRow({
  cat,
  active,
  onPress,
}: {
  cat: (typeof CATEGORIES)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.examRow, active && { backgroundColor: `${cat.color}1A`, borderColor: cat.color }]}
    >
      <Ionicons name={cat.icon} size={18} color={active ? cat.color : colors.textSub} />
      <Text style={[styles.examLabel, active && { color: cat.color, fontWeight: '800' }]}>{cat.label}</Text>
      {active && <Ionicons name="checkmark-circle" size={18} color={cat.color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  fieldIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: font.body, fontWeight: '800', color: colors.text },
  fieldGenre: { fontSize: font.small, color: colors.textSub, marginTop: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '85%',
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: font.heading, fontWeight: '900', color: colors.text },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },

  list: { marginTop: spacing.md },
  noResult: { fontSize: font.sub, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

  genreBlock: { marginBottom: spacing.xs },
  genreHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  genreIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  genreLabel: { flex: 1, fontSize: font.body, fontWeight: '800', color: colors.text },
  genreCount: {
    fontSize: font.small,
    color: colors.textSub,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
    marginLeft: spacing.sm,
  },
  examLabel: { flex: 1, fontSize: font.sub, color: colors.text, fontWeight: '600' },
});

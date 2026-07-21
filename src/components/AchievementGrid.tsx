import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Goal, RecordMap } from '@/types';
import { scheduledDates, statusOf } from '@/logic/schedule';
import { todayStr, compareDate, fromDateStr } from '@/logic/date';
import { colors, font, radius, spacing } from '@/theme';

/**
 * 4週間の予定日をマス目で可視化するグリッド。
 * 達成=オレンジ / 未達=赤 / 今日=枠強調 / 未来=薄いグレー。
 * 「積み上がり」が一目で見えるカレンダー的表現。
 */
export function AchievementGrid({ goal, records }: { goal: Goal; records: RecordMap }) {
  const today = todayStr();
  const dates = scheduledDates(goal);

  return (
    <View style={styles.grid}>
      {dates.map((date) => {
        const st = statusOf(records, date);
        const isFuture = compareDate(date, today) > 0;
        const isToday = date === today;
        const dayNum = fromDateStr(date).getDate();

        let bg: string = colors.track;
        let fg: string = colors.textMuted;
        if (st === 'done') {
          bg = colors.primary;
          fg = '#fff';
        } else if (st === 'missed') {
          bg = colors.dangerBg;
          fg = colors.danger;
        } else if (isFuture) {
          bg = colors.surfaceAlt;
          fg = colors.textMuted;
        }

        return (
          <View
            key={date}
            style={[
              styles.cell,
              { backgroundColor: bg },
              isToday && styles.today,
            ]}
          >
            <Text style={[styles.cellText, { color: fg }]}>{dayNum}</Text>
          </View>
        );
      })}
    </View>
  );
}

const CELL = 38;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cellText: { fontSize: font.small, fontWeight: '700' },
});

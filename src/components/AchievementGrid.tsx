import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Goal, RecordMap } from '@/types';
import { scheduledDates, statusOf } from '@/logic/schedule';
import { todayStr, compareDate, fromDateStr } from '@/logic/date';
import { colors, font, radius, spacing, gradients } from '@/theme';

/**
 * 4週間の予定日をマス目で可視化するグリッド。
 * 達成=炎グラデ / 未達=赤 / 今日=枠強調 / 未来=暗いグレー。
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

        if (st === 'done') {
          return (
            <LinearGradient
              key={date}
              colors={gradients.flameSoft}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cell, isToday && styles.today]}
            >
              <Text style={[styles.cellText, { color: colors.onAccent }]}>{dayNum}</Text>
            </LinearGradient>
          );
        }

        let bg: string = colors.surfaceAlt;
        let fg: string = colors.textMuted;
        if (st === 'missed') {
          bg = colors.dangerBg;
          fg = colors.danger;
        } else if (isFuture) {
          bg = colors.surface;
          fg = colors.textMuted;
        }

        return (
          <View
            key={date}
            style={[styles.cell, { backgroundColor: bg }, isToday && styles.today]}
          >
            <Text style={[styles.cellText, { color: fg }]}>{dayNum}</Text>
          </View>
        );
      })}
    </View>
  );
}

const CELL = 36;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: colors.primary },
  cellText: { fontSize: font.small, fontWeight: '800' },
});

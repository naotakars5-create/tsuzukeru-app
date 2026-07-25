import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Goal, MinutesMap } from '@/types';
import { scheduledDates, statusOf, isDayDone } from '@/logic/schedule';
import { todayStr, compareDate } from '@/logic/date';
import { colors } from '@/theme';

/**
 * 4週間の予定日をヒートマップで可視化するグリッド。
 * - 達成マス（目標時間到達）は連続の長さで濃淡
 * - 未達は静かな暗色、未来は空マス、今日は二重リング
 */
export function AchievementGrid({ goal, minutes }: { goal: Goal; minutes: MinutesMap }) {
  const today = todayStr();
  const dates = scheduledDates(goal);

  // 各日の「その時点での連続日数」で濃淡を決める
  const heat: Record<string, number> = {};
  let run = 0;
  for (const date of dates) {
    if (isDayDone(goal, minutes, date)) {
      run += 1;
      heat[date] = Math.min(run, 3);
    } else {
      run = 0;
    }
  }

  return (
    <View style={styles.grid}>
      {dates.map((date) => {
        const st = statusOf(goal, minutes, date);
        const isFuture = compareDate(date, today) > 0;
        const isToday = date === today;

        let bg: string = colors.gridEmpty;
        if (st === 'done') {
          bg = heat[date] === 1 ? colors.heat1 : heat[date] === 2 ? colors.heat2 : colors.heat3;
        } else if (isFuture) {
          bg = colors.gridEmpty;
        } else if (st === 'missed') {
          bg = colors.gridMiss;
        } else {
          bg = colors.gridEmpty;
        }

        if (isToday) {
          return (
            <View key={date} style={styles.todayOuter}>
              <View style={[styles.todayInner, { backgroundColor: bg }]} />
            </View>
          );
        }
        return <View key={date} style={[styles.cell, { backgroundColor: bg }]} />;
      })}
    </View>
  );
}

const CELL = 36;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  cell: { width: CELL, height: CELL, borderRadius: 7 },
  todayOuter: {
    width: CELL,
    height: CELL,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInner: { width: CELL - 10, height: CELL - 10, borderRadius: 5 },
});

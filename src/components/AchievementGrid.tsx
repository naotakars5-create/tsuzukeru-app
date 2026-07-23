import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Goal, RecordMap } from '@/types';
import { scheduledDates, statusOf } from '@/logic/schedule';
import { todayStr, compareDate } from '@/logic/date';
import { colors } from '@/theme';

/**
 * 4週間の予定日をヒートマップで可視化するグリッド。
 * - 達成マスは「連続の長さ」で濃淡（1日=弱 / 2日=中 / 3日以上=ライム満点）
 * - 未達は静かな暗色（赤で騒がない）、未来は空マス
 * - 今日のマスは二重リングで点灯
 */
export function AchievementGrid({ goal, records }: { goal: Goal; records: RecordMap }) {
  const today = todayStr();
  const dates = scheduledDates(goal);

  // 各日の「その時点での連続日数」を計算して濃淡を決める
  const heat: Record<string, number> = {};
  let run = 0;
  for (const date of dates) {
    if (statusOf(records, date) === 'done') {
      run += 1;
      heat[date] = Math.min(run, 3);
    } else {
      run = 0;
    }
  }

  return (
    <View style={styles.grid}>
      {dates.map((date) => {
        const st = statusOf(records, date);
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
          // 今日まだ未達成
          bg = colors.gridEmpty;
        }

        if (isToday) {
          // 二重リング: 外枠ライム + 地の色の隙間 + 中のマス
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
  todayInner: {
    width: CELL - 10,
    height: CELL - 10,
    borderRadius: 5,
  },
});

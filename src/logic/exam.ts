/**
 * 試験日カウントダウンと、合格までの逆算。
 * 「あと何日」「1日あたり何時間やれば間に合うか」を計算して、毎日の行動に落とす。
 */

import { Goal } from '@/types';
import { daysBetween, todayStr } from './date';

export interface ExamCountdown {
  /** 試験日 'YYYY-MM-DD' */
  date: string;
  /** 今日から試験日までの残り日数（今日が試験日なら0・過ぎていたら負） */
  daysLeft: number;
  /** 試験日が過ぎているか */
  passed: boolean;
  /** 目標総時間（分）。未設定なら null */
  targetMinutes: number | null;
  /** すでに積み上げた勉強時間（分） */
  doneMinutes: number;
  /** 残りやるべき時間（分）。目標未設定なら null */
  remainingMinutes: number | null;
  /** 間に合わせるための1日あたりの必要時間（分）。目標未設定/期限切れなら null */
  perDayMinutes: number | null;
  /** 目標総時間に対する達成率 0..1（目標未設定なら null） */
  ratio: number | null;
}

/**
 * 試験日と現在の勉強時間から、カウントダウンと必要ペースを求める。
 * totalMinutes は通算の勉強時間（分）。
 */
export function buildExamCountdown(
  goal: Goal | null,
  totalMinutes: number
): ExamCountdown | null {
  if (!goal?.examDate) return null;
  const today = todayStr();
  const daysLeft = daysBetween(today, goal.examDate);
  const passed = daysLeft < 0;

  const targetHours = goal.targetTotalHours ?? null;
  const targetMinutes = targetHours != null ? Math.round(targetHours * 60) : null;
  const doneMinutes = Math.max(0, Math.round(totalMinutes));

  const remainingMinutes =
    targetMinutes != null ? Math.max(0, targetMinutes - doneMinutes) : null;

  // 残り日数（今日も含めて計算するため +1。期限切れ・当日は null）
  const usableDays = daysLeft > 0 ? daysLeft : 0;
  const perDayMinutes =
    remainingMinutes != null && usableDays > 0
      ? Math.ceil(remainingMinutes / usableDays)
      : null;

  const ratio =
    targetMinutes != null && targetMinutes > 0
      ? Math.min(1, doneMinutes / targetMinutes)
      : null;

  return {
    date: goal.examDate,
    daysLeft,
    passed,
    targetMinutes,
    doneMinutes,
    remainingMinutes,
    perDayMinutes,
    ratio,
  };
}

/** 残り日数に応じた温度感のコピー */
export function countdownTone(daysLeft: number): string {
  if (daysLeft < 0) return '試験おつかれさま。次の目標へ。';
  if (daysLeft === 0) return '今日が本番。落ち着いていこう。';
  if (daysLeft <= 7) return 'ラストスパート。ここで差がつく。';
  if (daysLeft <= 30) return '直前期。1日も無駄にできない。';
  if (daysLeft <= 90) return '勝負の3ヶ月。積み上げが効いてくる。';
  return '今日の1歩が、当日の余裕になる。';
}

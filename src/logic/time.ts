/** 勉強時間（分）の表示ヘルパー */

/** 分 -> '2時間30分' / '45分' */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h > 0 && r > 0) return `${h}時間${r}分`;
  if (h > 0) return `${h}時間`;
  return `${r}分`;
}

/** 分 -> '2h30m'（コンパクト） */
export function formatMinutesShort(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h > 0) return `${h}h${r > 0 ? `${r}m` : ''}`;
  return `${r}m`;
}

/** 秒 -> 'HH:MM:SS'（ストップウォッチ表示） */
export function formatStopwatch(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

/** 1日の目標時間の選択肢（分）。これ以外は自由入力で決められる */
export const DAILY_TARGET_OPTIONS = [30, 60, 90, 120, 180];

/** 自由入力で受け付ける1日の目標時間の範囲（分） */
export const DAILY_TARGET_MIN = 5;
export const DAILY_TARGET_MAX = 1440;

/**
 * 勉強時間を、選んだ科目の数で分ける。
 * 科目ごとの合計が1日の勉強時間を超えないよう、足し算ではなく等分にする。
 * 余りは先頭から1分ずつ配るので、合計は元の時間とぴったり一致する。
 */
export function splitMinutes(total: number, count: number): number[] {
  if (count <= 0) return [];
  const whole = Math.max(0, Math.round(total));
  const base = Math.floor(whole / count);
  const rest = whole - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0));
}

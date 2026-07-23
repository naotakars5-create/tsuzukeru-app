/**
 * 日付ユーティリティ。
 * タイムゾーンのズレを避けるため、常にローカル時刻ベースで 'YYYY-MM-DD' を扱う。
 */

/** Date -> 'YYYY-MM-DD'（ローカル） */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' -> Date（ローカル 00:00） */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 今日の 'YYYY-MM-DD' */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** 指定日に日数を足した 'YYYY-MM-DD' */
export function addDays(s: string, n: number): string {
  const d = fromDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** 曜日 (0=日..6=土) */
export function weekdayOf(s: string): number {
  return fromDateStr(s).getDay();
}

/** a < b なら負、a === b なら 0、a > b なら正 */
export function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 今日から当日の終わり(23:59:59.999)までの残りミリ秒 */
export function msUntilEndOfDay(now: Date = new Date()): number {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return Math.max(0, end.getTime() - now.getTime());
}

/** ミリ秒 -> 'HH:MM:SS' */
export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** ミリ秒 -> 'H:MM'（時:分のみ） */
export function formatHM(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = String(totalMin % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** 'YYYY-MM-DD' -> '7/21(月)' のような表示用 */
export function formatDisplay(s: string): string {
  const d = fromDateStr(s);
  const names = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${names[d.getDay()]})`;
}

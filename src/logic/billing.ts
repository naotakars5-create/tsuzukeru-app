/**
 * 課金（モック）— デポジット方式。実際の決済は行わない。
 *
 * モデル（StickK / みんチャレ型・自分のお金を賭ける）:
 *  - 目標開始時に、自分で「掛け金（デポジット）」を預ける（自分のお金）
 *  - 4週間を週ごとに分割（週ぶん = 掛け金 / 4）
 *  - その週の目標を達成 → その週ぶんは全額返還される
 *  - 未達 → その週ぶんは没収される（戻らない＝痛み）
 *  - 完全達成すれば、掛け金は全額戻る（実質無料で継続できる）
 *  - 没収額の一部（手数料）が運営の収益になる（＝優良ユーザーは払わない設計）
 */

/** 掛け金の選択肢 */
export const DEPOSIT_OPTIONS = [1000, 3000, 5000, 10000];

/** 掛け金のデフォルト */
export const DEFAULT_DEPOSIT = 3000;

/** 没収額のうち運営が受け取る手数料の割合（残りは達成者ボーナス等・将来） */
export const PLATFORM_FEE_RATE = 0.2;

/** 1週間ぶんの掛け金（掛け金 / 週数） */
export function weekStake(deposit: number, weeks: number): number {
  return Math.round(deposit / weeks);
}

/** 没収額から運営手数料（収益）を計算 */
export function platformFee(forfeited: number): number {
  return Math.round(forfeited * PLATFORM_FEE_RATE);
}

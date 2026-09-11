import type { ReactNode } from 'react';
import type { CardOnFile } from '@/lib/billingClient';

/**
 * カード登録パネル（ネイティブ版／Web版で実装が分かれている）に渡せるもの。
 * 設定画面からはそのまま、目標を作った直後の登録ステップからは
 * 前置きと「あとで」の導線を足して使う。
 */
export interface CardSetupPanelProps {
  /** パネルの上に差し込む説明（オンボーディングの見出しなど） */
  intro?: ReactNode;
  /** パネルの下に差し込む操作（「あとで登録する」など） */
  footer?: ReactNode;
  /** カードの登録が完了したときに呼ばれる */
  onRegistered?: () => void;
  /** 登録済みカードを読み込むたびに、その状態を知らせる（未登録なら null） */
  onCardChange?: (card: CardOnFile | null) => void;
}

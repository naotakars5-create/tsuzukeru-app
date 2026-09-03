import React from 'react';
import { CardSetupPanel } from '@/components/CardSetupPanel';

/**
 * カード登録画面（案C: ここでは¥0。保存のみ）。
 * 中身は CardSetupPanel（ネイティブ/Webでファイルが分かれている）に委譲する。
 */
export default function CardSetupScreen() {
  return <CardSetupPanel />;
}

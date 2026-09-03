import React from 'react';

/**
 * Web版の StripeGate（何もしない）。
 * Stripeのネイティブモジュールは Web バンドルに含められないため、素通しする。
 * Metro が web ビルドではこのファイルを優先して解決する。
 */
export function StripeGate({ children }: { children: React.ReactElement }) {
  return children;
}

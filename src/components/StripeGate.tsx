import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/**
 * カード登録・課金のUI（PaymentSheet）に必要な StripeProvider を被せる。
 * Stripeはネイティブ専用モジュールなので、Web版には StripeGate.web.tsx が使われ、
 * この import 自体が Web バンドルに入らないようにしている。
 */
export function StripeGate({ children }: { children: React.ReactElement }) {
  if (!publishableKey) return children;
  return <StripeProvider publishableKey={publishableKey}>{children}</StripeProvider>;
}

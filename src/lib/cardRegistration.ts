import { useStripe } from '@stripe/stripe-react-native';
import { requestCardSetup, CardFlow, CardRegisterResult } from '@/lib/billingClient';

/**
 * カードを登録する処理（ネイティブ版）。PaymentSheet を開いて、その場で完了する。
 *
 * Stripeはネイティブ専用モジュールのため、Web版には cardRegistration.web.ts が使われ、
 * この import 自体が Web バンドルに入らないようにしている。
 */
export function useCardRegistration() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const register = async (_flow: CardFlow): Promise<CardRegisterResult> => {
    const { clientSecret } = await requestCardSetup();
    const init = await initPaymentSheet({
      setupIntentClientSecret: clientSecret,
      merchantDisplayName: '覚悟の勉強',
      style: 'alwaysDark',
    });
    if (init.error) throw new Error(init.error.message);

    const present = await presentPaymentSheet();
    if (present.error) {
      if (present.error.code === 'Canceled') return 'canceled';
      throw new Error(present.error.message);
    }
    return 'registered';
  };

  return { register };
}

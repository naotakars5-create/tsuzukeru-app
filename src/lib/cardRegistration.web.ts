import { requestCardSetupSession, CardFlow, CardRegisterResult } from '@/lib/billingClient';

/**
 * カードを登録する処理（Web版）。
 * ネイティブの PaymentSheet が使えないため、Stripe のホスト型 Checkout へ遷移する。
 * 登録が終わると flow に応じた画面に ?card=success で戻ってくる。
 */
export function useCardRegistration() {
  const register = async (flow: CardFlow): Promise<CardRegisterResult> => {
    const url = await requestCardSetupSession(flow);
    window.location.href = url;
    return 'redirected';
  };

  return { register };
}

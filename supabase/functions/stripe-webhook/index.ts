// Stripe からの通知を正として DB に反映する。
// アプリ側の「たぶん成功した」という自己申告ではなく、ここが唯一の真実の情報源。
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error('署名検証に失敗:', err);
    return new Response('invalid signature', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  switch (event.type) {
    case 'setup_intent.succeeded': {
      const si = event.data.object as Stripe.SetupIntent;
      const customerId = si.customer as string;
      const pm = await stripe.paymentMethods.retrieve(si.payment_method as string);
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: pm.id },
      });
      await supabase
        .from('stripe_customers')
        .update({
          default_payment_method_id: pm.id,
          card_brand: pm.card?.brand ?? null,
          card_last4: pm.card?.last4 ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const weekId = pi.metadata?.week_id;
      if (weekId) {
        await supabase
          .from('weeks')
          .update({ charge_status: 'charged', charged_at: new Date().toISOString() })
          .eq('id', weekId);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const weekId = pi.metadata?.week_id;
      if (weekId) {
        await supabase.from('weeks').update({ charge_status: 'failed' }).eq('id', weekId);
        // TODO: 失敗をユーザーに通知（push通知 or 次回起動時バナー）。
        // カード再認証が必要なケース(authentication_required)はアプリ側で
        // PaymentSheet を payment_intent の client_secret で開いて再確認させる。
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

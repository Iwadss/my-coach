import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SUBSCRIPTION_DAYS, SUBSCRIPTION_PRICE_MYR } from '../_shared/stripe.ts';

// Called directly by Stripe — no Supabase JWT is ever sent (this route is
// configured with verify_jwt = false in supabase/config.toml). Security
// comes entirely from the Stripe signature check below, not Supabase auth.
// This function fails LOUDLY (500) when misconfigured, not gracefully —
// unlike the coach-facing functions, nobody sees this response except
// Stripe's own retry logic and our function logs, so "graceful" here would
// just hide a real setup bug.
//
// Only checkout.session.completed matters — these are one-time payments
// (mode: 'payment' in create-checkout-session), not a Stripe-managed
// recurring subscription, so there's no customer.subscription.* lifecycle
// to track. The actual expiry date math (Scenario A: pay early -> the new
// 30 days appends to what's left; Scenario B: pay after expiring -> the
// new 30 days starts from now) lives in one place —
// stripe_apply_successful_payment() — so it can never drift from what
// admin_review_coach_subscription's manual-approval path does.
Deno.serve(async (req) => {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secretKey || !webhookSecret) {
    console.error('stripe-webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set');
    return new Response('Webhook not configured', { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Async/Web-Crypto verification path — Deno doesn't have Node's crypto
    // module, so the SDK's default sync constructEvent() doesn't work here.
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Dedupe exact redelivery. Stripe explicitly documents this as required,
  // not optional — the same event id can be sent more than once.
  const { data: inserted } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })
    .select()
    .maybeSingle();
  if (!inserted) {
    return new Response('duplicate', { status: 200 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // For mode: 'payment' this is synchronous for card payments, but
      // Stripe's own docs still say to check it — some payment methods
      // confirm asynchronously, in which case a later
      // checkout.session.async_payment_succeeded would need handling too
      // (not wired up here since this app doesn't enable those methods).
      if (session.payment_status !== 'paid') {
        return new Response('payment not completed yet', { status: 200 });
      }

      const coachId = session.client_reference_id ?? session.metadata?.coach_id;
      if (!coachId) {
        console.error('stripe-webhook: checkout.session.completed with no coach_id', event.id);
        return new Response('missing coach_id', { status: 200 });
      }

      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
      // amount_total is in cents (smallest currency unit) — convert back to
      // the RM figure payment_transactions stores.
      const amount = typeof session.amount_total === 'number' ? session.amount_total / 100 : SUBSCRIPTION_PRICE_MYR;

      const { error } = await admin.rpc('stripe_apply_successful_payment', {
        p_coach_id: coachId,
        p_stripe_customer_id: customerId,
        p_days: SUBSCRIPTION_DAYS,
        p_amount: amount,
        p_checkout_session_id: session.id,
      });
      if (error) throw error;
    }
    // Every other event type is acknowledged, not an error — this endpoint
    // only needs the one.
  } catch (err) {
    console.error(`stripe-webhook: failed processing ${event.type}`, err);
    return new Response('Internal error processing event', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});

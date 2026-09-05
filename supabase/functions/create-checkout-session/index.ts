import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { billingNotConfiguredResponse, getStripe, SUBSCRIPTION_DAYS, SUBSCRIPTION_PRICE_MYR } from '../_shared/stripe.ts';

// JWT-verified by default (Supabase's standard Edge Function behavior) —
// only a signed-in coach can call this. Creates (or reuses) a Stripe
// Customer for them and returns a hosted Checkout Session URL for a
// one-time RM50 payment.
//
// Deliberately `mode: 'payment'`, not `mode: 'subscription'` — a Stripe
// subscription bills itself on a fixed cycle Stripe controls, which can't
// express "pay a few days early and those days just add on top of what's
// left" (stripe-webhook/index.ts's whole Scenario A/B). Making the coach's
// 30-day access period something *we* compute and own, credited on each
// successful one-time payment, is what makes that rule possible — no
// Stripe Price object needed either, the amount is inlined via price_data.
Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const stripe = getStripe();
  if (!stripe) return billingNotConfiguredResponse(corsHeaders);

  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // service_role client: coach_billing grants no direct write to
    // `authenticated` by design (every write is audited, via this function,
    // the Stripe webhook, or the admin RPC) — auth.getUser(jwt) still
    // correctly validates the caller's own token regardless of which key
    // instantiated the client.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const coachId = userData.user.id;

    const { data: billing } = await admin
      .from('coach_billing')
      .select('stripe_customer_id')
      .eq('coach_id', coachId)
      .maybeSingle();

    if (!billing) {
      return new Response(JSON.stringify({ error: 'No billing record for this account — contact an administrator' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = billing.stripe_customer_id ?? null;

    // Persist immediately — before creating the Checkout Session — so an
    // abandoned/retried checkout doesn't produce duplicate Stripe customers.
    const mintCustomer = async () => {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: { coach_id: coachId },
      });
      await admin.from('coach_billing').update({ stripe_customer_id: customer.id }).eq('coach_id', coachId);
      return customer.id;
    };

    if (!customerId) {
      customerId = await mintCustomer();
    }

    const buildSession = () => stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId!,
      client_reference_id: coachId,
      line_items: [
        {
          price_data: {
            currency: 'myr',
            unit_amount: SUBSCRIPTION_PRICE_MYR * 100,
            product_data: { name: `MyCoach subscription — ${SUBSCRIPTION_DAYS} days` },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata: { coach_id: coachId } },
      success_url: `${siteUrl}/coach-dashboard?checkout=success`,
      cancel_url: `${siteUrl}/coach-dashboard?checkout=cancelled`,
    });

    let session;
    try {
      session = await buildSession();
    } catch (err) {
      // A stored customer id Stripe no longer recognizes (deleted in the
      // dashboard, a different Stripe account/mode than when it was saved,
      // or — as with this project's own seed data — never a real customer
      // to begin with) surfaces here as `resource_missing` on the
      // `customer` param. Recover by minting a fresh customer once rather
      // than failing the coach's whole checkout attempt.
      const isStaleCustomer = typeof err === 'object' && err !== null
        && (err as { code?: string }).code === 'resource_missing'
        && (err as { param?: string }).param === 'customer';
      if (!isStaleCustomer) throw err;

      customerId = await mintCustomer();
      session = await buildSession();
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ error: 'Could not start checkout. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

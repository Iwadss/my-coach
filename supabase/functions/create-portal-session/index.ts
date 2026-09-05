import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { billingNotConfiguredResponse, getStripe } from '../_shared/stripe.ts';

// Same JWT-verified pattern as create-checkout-session. Returns a Stripe
// Billing Portal URL so an already-subscribed coach can update their
// payment method, view invoices, or cancel — all Stripe-hosted, nothing
// built here.
//
// UNUSED as of the 2026-09-13 switch to one-time RM50 payments (see
// create-checkout-session and stripe-webhook) — the Billing Portal manages
// a Stripe-side recurring Subscription object, and there isn't one to
// manage anymore (subscription_expiry is entirely our own date math now).
// Left in place, not deleted, in case Stripe-managed recurring billing is
// revisited later — nothing currently calls this function.

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

    const { data: billing } = await admin
      .from('coach_billing')
      .select('stripe_customer_id')
      .eq('coach_id', userData.user.id)
      .maybeSingle();

    if (!billing?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Subscribe first before managing billing.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${siteUrl}/billing-hold`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-portal-session error:', err);
    return new Response(JSON.stringify({ error: 'Could not open the billing portal. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import Stripe from 'npm:stripe@^17';

// Keep in sync with src/lib/billing.ts (a separate Vite/browser bundle —
// can't share the constant directly with this Deno runtime).
export const SUBSCRIPTION_PRICE_MYR = 50;
export const SUBSCRIPTION_DAYS = 30;

/**
 * Returns null (never throws) when STRIPE_SECRET_KEY isn't configured yet —
 * every function that calls this must check for null and return a clean
 * 503 rather than let `new Stripe(undefined)` throw an SDK-level error
 * that leaks as a raw 500.
 */
export function getStripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export function billingNotConfiguredResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Billing is not configured yet. Contact the site admin.' }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

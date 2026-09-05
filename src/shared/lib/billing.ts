import supabase from '@/supabase/supabase'

// RM50/month, paid as a one-time Stripe Checkout payment (not a Stripe-
// managed recurring subscription — see supabase/functions/stripe-webhook
// for why) that credits 30 days onto subscription_expiry. Keep this number
// in sync with SUBSCRIPTION_PRICE_MYR in supabase/functions/_shared/stripe.ts
// (a separate Deno runtime that can't import this file directly).
export const SUBSCRIPTION_PRICE = 50
export const SUBSCRIPTION_PRICE_CURRENCY = 'RM'
export const SUBSCRIPTION_PRICE_LABEL = `${SUBSCRIPTION_PRICE_CURRENCY}${SUBSCRIPTION_PRICE}/month`

// Days a coach keeps full access after subscriptionExpiry passes, before
// CoachAuthGuard/ClientAuthGuard actually lock them out. Matches the
// `interval '5 days'` in coach_billing_access_status() — that DB function
// is the real enforcement point; this constant only drives the frontend's
// banner countdown and the "Suspended (Payment)" badge logic, so it must
// stay in sync by hand.
export const GRACE_PERIOD_DAYS = 5

// supabase.functions.invoke() only populates `data` on a 2xx response — on
// a non-2xx response it leaves `data` null and returns a generic
// FunctionsHttpError, discarding the JSON body we actually sent. The real
// message is still readable off the raw Response on error.context
// (supabase-js v2's documented shape for this).
async function functionErrorMessage(data: { error?: string } | null, error: unknown): Promise<string> {
    if (data?.error) return data.error
    if (error && typeof error === 'object' && 'context' in error) {
        const context = (error as { context: unknown }).context
        if (context instanceof Response) {
            try {
                const body = await context.clone().json()
                if (body?.error) return body.error
            } catch {
                // not JSON — fall through to the generic message
            }
        }
    }
    return error instanceof Error ? error.message : 'Please try again.'
}

// Starts a Stripe Checkout session for the signed-in coach and redirects
// the browser there. Throws (with a message meant for a toast) instead of
// returning a result — every caller just wants "it worked" or "show this
// error", never the raw session data. The only way a coach pays now —
// manual receipt upload/admin review was removed in the 2026-09-14
// migration. Shared by CoachAuthGuard, CoachSubscriptionBanner, and
// coach-settings.tsx's subscription card.
export async function payWithStripe(): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', { method: 'POST' })
    if (error || !data?.url) {
        throw new Error(await functionErrorMessage(data, error))
    }
    window.location.href = data.url
}

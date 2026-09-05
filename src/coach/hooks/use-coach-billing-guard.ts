import { useCallback, useEffect, useState } from 'react'
import supabase from '@/supabase/supabase'

export interface CoachBilling {
    subscription_status: 'inactive' | 'active'
    subscription_expiry: string | null
    access_override: 'none' | 'granted' | 'blocked'
    override_reason: string | null
}

// 'ok' = genuinely current (or admin-granted, or no expiry set).
// 'grace' = past subscription_expiry but still within the 5-day window —
// coach_has_billing_access() (and therefore the RPC below) still says yes.
// 'blocked' = past the grace period, or an admin override='blocked'.
export type CoachBillingState = 'checking' | 'ok' | 'grace' | 'blocked'

// Shared by CoachAuthGuard (the blocking modal) and CoachSubscriptionBanner
// (the persistent grace-period warning) — both need the same state, but
// have to render in different places in the tree (the banner has to sit
// inside CoachShell's main column to clear the fixed-position sidebar; the
// modal doesn't care, Dialog portals to <body> regardless), so this is a
// plain hook rather than one component owning both.
export function useCoachBillingGuard() {
    const [state, setState] = useState<CoachBillingState>('checking')
    const [billing, setBilling] = useState<CoachBilling | null>(null)

    const reload = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return // CoachRoute handles the no-session case

        const [{ data: hasAccess }, { data: billingRow }] = await Promise.all([
            supabase.rpc('coach_has_billing_access', { p_coach_id: user.id }),
            supabase
                .from('coach_billing')
                .select('subscription_status, subscription_expiry, access_override, override_reason')
                .eq('coach_id', user.id)
                .maybeSingle(),
        ])

        const b = billingRow as CoachBilling | null
        setBilling(b)

        if (!hasAccess) {
            setState('blocked')
            return
        }

        // Access RPC said yes — but that's true for the whole grace window
        // too, not just genuinely-current. Recompute that distinction here
        // purely to decide whether to show the warning banner.
        const inGrace = !!(
            b?.access_override === 'none' &&
            b?.subscription_status === 'active' &&
            b?.subscription_expiry &&
            new Date(b.subscription_expiry).getTime() < Date.now()
        )
        setState(inGrace ? 'grace' : 'ok')
    }, [])

    useEffect(() => { reload() }, [reload])

    return { state, billing, reload }
}

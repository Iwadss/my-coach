// src/components/coach/coach-subscription-banner.tsx
//
// Persistent "you're in the grace period" warning — rendered inside
// CoachShell's main column (not by CoachAuthGuard, which wraps the whole
// shell including the fixed-position sidebar; a banner mounted there would
// render partly underneath it). Full access continues the whole time this
// shows — see useCoachBillingGuard for the exact 'grace' condition.
import { useState } from 'react'
import { toast } from 'sonner'
import { payWithStripe, GRACE_PERIOD_DAYS } from '@/lib/billing'
import { useCoachBillingGuard } from '@/hooks/use-coach-billing-guard'
import { AlertTriangle, CreditCard } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

function daysSince(iso: string): number {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function CoachSubscriptionBanner() {
    const { state, billing } = useCoachBillingGuard()
    const [paying, setPaying] = useState(false)

    if (state !== 'grace') return null

    const daysLeft = billing?.subscription_expiry
        ? Math.max(GRACE_PERIOD_DAYS - daysSince(billing.subscription_expiry), 0)
        : GRACE_PERIOD_DAYS

    const handlePay = async () => {
        setPaying(true)
        try {
            await payWithStripe()
        } catch (err) {
            setPaying(false)
            toast.error('❌ Could not start checkout', { description: err instanceof Error ? err.message : 'Please try again.', className: 'toast-error' })
        }
    }

    return (
        <div className="flex items-center gap-3 px-4 sm:px-9 py-3 bg-[rgba(255,107,82,.1)] border-b border-[rgba(255,107,82,.28)] text-[#ffb199]">
            <AlertTriangle className="w-[17px] h-[17px] flex-none" />
            <span className="text-[13px] flex-1">
                Your subscription has expired. You have {daysLeft} day{daysLeft === 1 ? '' : 's'} left before your account is locked.
            </span>
            <button
                type="button"
                disabled={paying}
                onClick={handlePay}
                className="flex-none inline-flex items-center gap-1.5 bg-[#ccff00] text-[#0a0a0a] rounded-full px-4 py-[7px] font-semibold text-[12px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
            >
                {paying ? <Spinner className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                Pay with Stripe
            </button>
        </div>
    )
}

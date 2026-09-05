// src/coach/components/coach-auth-guard.tsx
//
// Global payment gate for the coach portal — mounted once inside
// CoachShell.tsx (not per-page), so every coach page gets it automatically.
// Owns only the "past the 5-day grace period" blocking modal — the
// persistent grace-period warning banner is a separate component
// (CoachSubscriptionBanner) sharing the same useCoachBillingGuard() state,
// because it has to render inside CoachShell's main column to clear the
// sidebar (which is `position: fixed`), while this modal doesn't care
// where it's mounted (Dialog portals to <body> regardless).
//
// "Pay with Stripe" (payWithStripe()) is the only way out — billing is
// Stripe-only as of the 2026-09-14 migration, which dropped the manual
// receipt-upload/admin-review path entirely (coach_submit_payment_proof,
// admin_review_coach_subscription, and every "Pending verification" UI).
//
// A coach manually suspended for a policy violation (coaches.status —
// admin_set_coach_status, surfaced in the Coach Detail dialog on
// AdminCoaches.tsx) never reaches this component at all: that also demotes
// profiles.role away from 'coach', so CoachRoute redirects them to
// /pending-approval before CoachShell (and this guard) ever mounts. This
// only ever handles the payment-driven case (access_override / expiry).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { payWithStripe, SUBSCRIPTION_PRICE_LABEL } from '@/shared/lib/billing'
import { useCoachBillingGuard } from '@/coach/hooks/use-coach-billing-guard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Lock, Ban, CreditCard } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { ReactNode } from 'react'

export default function CoachAuthGuard({ children }: { children: ReactNode }) {
    const { state, billing, reload } = useCoachBillingGuard()
    const [paying, setPaying] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()

    // Land back from Stripe Checkout — tell the coach what happened, clear
    // the query param so a refresh doesn't re-show it, and re-check status
    // (the webhook typically lands before or right around the redirect).
    useEffect(() => {
        const checkout = searchParams.get('checkout')
        if (!checkout) return

        if (checkout === 'success') {
            toast.success('✅ Payment received', { description: 'Your access has been extended.', className: 'toast-success' })
        } else if (checkout === 'cancelled') {
            toast.info('Checkout cancelled', { className: 'toast-info' })
        }

        const next = new URLSearchParams(searchParams)
        next.delete('checkout')
        setSearchParams(next, { replace: true })
        reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const handlePay = async () => {
        setPaying(true)
        try {
            await payWithStripe()
        } catch (err) {
            setPaying(false)
            toast.error('❌ Could not start checkout', { description: err instanceof Error ? err.message : 'Please try again.', className: 'toast-error' })
        }
        // On success payWithStripe() navigates away — no need to clear `paying`.
    }

    if (state !== 'blocked') {
        return <>{children}</>
    }

    const isBlockedByAdmin = billing?.access_override === 'blocked'

    return (
        <>
            {children}

            {/* Non-dismissible: no close button, Escape and outside-click are
                both swallowed, and `open` is never driven back to false from
                inside the dialog itself. */}
            <Dialog open onOpenChange={() => { }}>
                <DialogContent
                    showCloseButton={false}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-sm text-center"
                >
                    <DialogHeader className="items-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[rgba(255,107,82,.14)]">
                            {isBlockedByAdmin ? <Ban className="w-6 h-6 text-[#ff6b52]" /> : <Lock className="w-6 h-6 text-[#ff6b52]" />}
                        </div>
                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">
                            {isBlockedByAdmin ? 'Access blocked' : 'Subscription expired'}
                        </DialogTitle>
                        <DialogDescription className="!text-white/55">
                            {isBlockedByAdmin
                                ? (billing?.override_reason || 'An administrator has blocked your access.')
                                : `Your subscription has expired. Please renew your subscription for ${SUBSCRIPTION_PRICE_LABEL} to regain access.`}
                        </DialogDescription>
                    </DialogHeader>

                    {!isBlockedByAdmin && (
                        <button
                            type="button"
                            disabled={paying}
                            onClick={handlePay}
                            className="inline-flex items-center justify-center gap-2 bg-[#ccff00] text-[#0a0a0a] rounded-full py-3 font-semibold text-[13.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                        >
                            {paying ? <Spinner className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                            Pay with Stripe
                        </button>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

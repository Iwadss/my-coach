// src/client/components/client-auth-guard.tsx
//
// Global "your coach isn't available" gate for the client portal — mounted
// once inside ClientShell.tsx, so every client page gets it automatically.
// Checks the LINKED COACH's status (billing access + not suspended) via
// client_coach_access_ok(), not the client's own account — the client's own
// access is already gated by ProtectedRoute (requires an approved
// coach_clients row). Same light/dark-aware palette as settings.tsx's
// own "Change coach" dialog, whose exact unlink-and-request flow this reuses
// via shared/lib/coach-clients.ts.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { changeCoach } from '@/shared/lib/coach-clients'
import CoachPicker from '@/shared/components/coach-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { UserX } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type State = 'checking' | 'ok' | 'blocked'

export default function ClientAuthGuard({ children }: { children: ReactNode }) {
    const [state, setState] = useState<State>('checking')
    const [picking, setPicking] = useState(false)
    const [newCoachId, setNewCoachId] = useState('')
    const [changing, setChanging] = useState(false)

    const load = useCallback(async () => {
        const { data, error } = await supabase.rpc('client_coach_access_ok')
        // Fail open on a network/RPC error — this is an availability nicety,
        // not the client's real authorization boundary (ProtectedRoute is).
        setState(error || data !== false ? 'ok' : 'blocked')
    }, [])

    useEffect(() => { load() }, [load])

    const handleChangeCoach = async () => {
        if (!newCoachId) return
        setChanging(true)

        try {
            await changeCoach(newCoachId)
        } catch (err) {
            setChanging(false)
            toast.error('❌ Could not change coach', { description: err instanceof Error ? err.message : 'Please try again.', className: 'toast-error' })
            return
        }

        toast.success('✅ Request sent', {
            description: "You'll be able to train again once your new coach approves you.",
            className: 'toast-success',
        })
        // The new relationship is 'pending', not 'approved' — ProtectedRoute
        // would bounce them to /pending-approval on the next navigation
        // anyway, so send them there now instead of leaving them on a
        // dashboard that's about to be stale. Full navigation (not
        // react-router) so every bit of this shell's own state resets clean.
        window.location.assign('/pending-approval')
    }

    if (state !== 'blocked') {
        return <>{children}</>
    }

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
                    className="!bg-[#f7f7f2] dark:!bg-[#111] !border-[#e2e2d9] dark:!border-[#1f1f1f] !text-[#14140f] dark:!text-white sm:!max-w-sm"
                >
                    {!picking ? (
                        <>
                            <DialogHeader className="items-center text-center">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[rgba(255,107,82,.12)]">
                                    <UserX className="w-6 h-6 text-[#ff6b52]" />
                                </div>
                                <DialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">Coach unavailable</DialogTitle>
                                <DialogDescription className="!text-[#14140f]/55 dark:!text-white/55">
                                    Please tell your coach to make a payment to continue using the system.
                                </DialogDescription>
                            </DialogHeader>

                            <button
                                type="button"
                                onClick={() => setPicking(true)}
                                className="bg-[#ccff00] text-[#0a0a0a] rounded-full py-3 font-semibold text-[13.5px] hover:bg-[#e2ff5c] transition-colors"
                            >
                                Change Coach
                            </button>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">Pick a new coach</DialogTitle>
                                <DialogDescription className="!text-[#14140f]/45 dark:!text-white/45">
                                    This ends your current link right away — you'll need the new coach's approval before you can train again.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="text-left max-h-[300px] overflow-y-auto -mx-1 px-1">
                                <CoachPicker value={newCoachId} onChange={setNewCoachId} disabled={changing} />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={changing}
                                    onClick={() => setPicking(false)}
                                    className="flex-1 rounded-full px-5 py-2.5 text-[12.5px] font-medium text-[#14140f]/60 dark:text-white/60 border border-[#d8d8cd] dark:border-[#2a2a2a] hover:text-[#14140f] dark:hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    disabled={!newCoachId || changing}
                                    onClick={handleChangeCoach}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                >
                                    {changing ? <Spinner className="w-3.5 h-3.5" /> : 'Send request'}
                                </button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

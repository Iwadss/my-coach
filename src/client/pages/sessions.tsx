// src/client/pages/sessions.tsx
// "My sessions" tab — upcoming/past toggle over the client's own bookings.
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import ClientShell from '@/client/components/client-shell'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Booking {
    id: number
    date: string
    status: string
    start_time: string
    end_time: string
    workout_type: string | null
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
    weightlifting: 'Weightlifting',
    hiit: 'HIIT',
    full_body: 'Full Body',
    mobility: 'Mobility',
}

// Falls back to the old generic label only for bookings made before
// workout_type existed (or any that skip it) — never fabricates a type.
const sessionTitle = (b: Booking) => (b.workout_type ? WORKOUT_TYPE_LABELS[b.workout_type] ?? b.workout_type : 'Coaching session')

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const statusPill = (s: string) => {
    switch (s) {
        case 'confirmed': return 'bg-[rgba(204,255,0,.13)] text-[#6f8c00] dark:text-[#ccff00]'
        case 'pending': return 'bg-white/10 text-[#14140f]/70 dark:text-white/70'
        case 'completed': return 'bg-white/6 text-[#14140f]/55 dark:text-white/55'
        case 'cancelled': return 'bg-[rgba(255,107,82,.14)] text-[#c8432a] dark:text-[#ff6b52]'
        default: return 'bg-white/6 text-[#14140f]/45 dark:text-white/45'
    }
}

// Same color-per-status mapping as statusPill, minus the pill background —
// for the detail dialog's plain "Status" row.
const statusTextColor = (s: string) => {
    switch (s) {
        case 'confirmed': return 'text-[#6f8c00] dark:text-[#ccff00]'
        case 'completed': return 'text-[#14140f]/55 dark:text-white/55'
        case 'cancelled': return 'text-[#c8432a] dark:text-[#ff6b52]'
        default: return 'text-[#14140f] dark:text-white' // pending
    }
}

export default function ClientSessions() {
    const navigate = useNavigate()
    const [bookings, setBookings] = React.useState<Booking[]>([])
    const [loading, setLoading] = React.useState(true)
    const [view, setView] = React.useState<'upcoming' | 'past'>('upcoming')
    const [cancellingId, setCancellingId] = React.useState<number | null>(null)
    // Session-detail dialog — opened by clicking a card, not one of its
    // inner action buttons.
    const [detailBooking, setDetailBooking] = React.useState<Booking | null>(null)
    // Cancel-confirmation dialog — replaces the old window.confirm() with
    // the same AlertDialog primitive the detail view uses.
    const [cancelTarget, setCancelTarget] = React.useState<Booking | null>(null)

    const fetchBookings = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data, error } = await supabase
            .from('bookings')
            .select('id, date, status, workout_type, timeslot:timeslots!bookings_time_slot_id_fkey(start_time, end_time)')
            .eq('client_id', user.id)
            .order('date', { ascending: false })

        if (!error && data) {
            setBookings((data as any[]).map((b) => ({
                id: b.id,
                date: b.date,
                status: b.status,
                workout_type: b.workout_type,
                start_time: b.timeslot?.start_time ?? '',
                end_time: b.timeslot?.end_time ?? '',
            })))
        }
        setLoading(false)
    }, [])

    React.useEffect(() => { fetchBookings() }, [fetchBookings])

    const today = format(new Date(), 'yyyy-MM-dd')
    const upcoming = bookings
        .filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
    const past = bookings.filter((b) => !((b.status === 'pending' || b.status === 'confirmed') && b.date >= today))

    const canCancel = (b: Booking) => (b.status === 'pending' || b.status === 'confirmed') && b.date >= today

    const confirmCancel = async () => {
        if (!cancelTarget) return
        const booking = cancelTarget

        setCancellingId(booking.id)
        const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
        setCancellingId(null)
        setCancelTarget(null)

        if (error) {
            toast.error('❌ Could not cancel session', { description: error.message, className: 'toast-error' })
            return
        }
        toast.success('🗑️ Session cancelled', { className: 'toast-delete' })
        fetchBookings()
    }

    const openDetail = (booking: Booking) => setDetailBooking(booking)

    return (
        <ClientShell
            active="sessions"
            kicker="Your calendar"
            title="My sessions"
            blurb="Everything booked, and a look back at your completed sessions."
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-[#14140f]/45 dark:text-white/45">
                    {view === 'upcoming' ? `${upcoming.length} session${upcoming.length === 1 ? '' : 's'} booked` : `${past.length} session${past.length === 1 ? '' : 's'} in your history`}
                </div>
                <div className="ml-auto flex bg-[#ececdf] dark:bg-[#141414] border border-[#e2e2d9] dark:border-[#232323] rounded-full p-[3px]">
                    <button type="button" onClick={() => setView('upcoming')} className={`rounded-full px-[18px] py-2 font-medium text-[11.5px] transition-colors ${view === 'upcoming' ? 'bg-[#ccff00] text-[#0a0a0a]' : 'text-[#14140f]/50 dark:text-white/50'}`}>
                        Upcoming
                    </button>
                    <button type="button" onClick={() => setView('past')} className={`rounded-full px-[18px] py-2 font-medium text-[11.5px] transition-colors ${view === 'past' ? 'bg-[#ccff00] text-[#0a0a0a]' : 'text-[#14140f]/50 dark:text-white/50'}`}>
                        Past
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-[#14140f]/40 dark:text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : view === 'upcoming' ? (
                upcoming.length === 0 ? (
                    <EmptyState onBook={() => navigate('/client-book')} />
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {upcoming.map((b, i) => (
                            <div
                                key={b.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => openDetail(b)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        openDetail(b)
                                    }
                                }}
                                className={`grid grid-cols-1 sm:grid-cols-[96px_1fr_auto] gap-4 items-center bg-[#f7f7f2] dark:bg-[#111] border rounded-[18px] px-[18px] py-[17px] cursor-pointer transition-colors hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] ${i === 0 ? 'border-[#ccff00]' : 'border-[#e2e2d9] dark:border-[#1f1f1f]'}`}
                            >
                                <div>
                                    <div className="font-['JetBrains_Mono'] text-[10px] tracking-[1.2px] uppercase text-[#14140f]/40 dark:text-white/40">{format(parseISO(b.date), 'EEE d MMM')}</div>
                                    <div className="mt-1 font-['JetBrains_Mono'] text-[17px] text-[#6f8c00] dark:text-[#ccff00]">{b.start_time.slice(0, 5)}</div>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-[14.5px]">{sessionTitle(b)}</span>
                                        <span className={`text-[10.5px] font-medium rounded-full px-2.5 py-1 ${statusPill(b.status)}`}>{statusLabel(b.status)}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-[#14140f]/45 dark:text-white/45">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</div>
                                </div>
                                <div className="flex gap-2 flex-none">
                                    {canCancel(b) && (
                                        <button
                                            type="button"
                                            disabled={cancellingId === b.id}
                                            onClick={(e) => { e.stopPropagation(); setCancelTarget(b) }}
                                            className="text-[#14140f]/45 dark:text-white/45 font-medium text-xs px-1.5 py-2.5 hover:text-[#c8432a] dark:hover:text-[#ff6b52] transition-colors disabled:opacity-50"
                                        >
                                            {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : past.length === 0 ? (
                <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[18px] p-8 text-center text-[#14140f]/45 dark:text-white/45 text-[12.5px]">
                    No past sessions yet.
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {past.map((b) => (
                        <div
                            key={b.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openDetail(b)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    openDetail(b)
                                }
                            }}
                            className="grid grid-cols-1 sm:grid-cols-[96px_1fr_auto] gap-4 items-center bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[18px] px-[18px] py-[17px] cursor-pointer transition-colors hover:border-[#c9c9be] dark:hover:border-[#3a3a3a]"
                        >
                            <div>
                                <div className="font-['JetBrains_Mono'] text-[10px] tracking-[1.2px] uppercase text-[#14140f]/40 dark:text-white/40">{format(parseISO(b.date), 'EEE d MMM')}</div>
                                <div className="mt-1 font-['JetBrains_Mono'] text-[17px] text-[#14140f]/55 dark:text-white/55">{b.start_time.slice(0, 5)}</div>
                            </div>
                            <div className="min-w-0 font-semibold text-[14px]">{sessionTitle(b)}</div>
                            <span className={`text-[10.5px] font-medium rounded-full px-2.5 py-1 justify-self-start sm:justify-self-end ${statusPill(b.status)}`}>{statusLabel(b.status)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Session-detail dialog — opened by clicking a card. */}
            <AlertDialog open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
                <AlertDialogContent className="!bg-[#f7f7f2] dark:!bg-[#111] !border-[#e2e2d9] dark:!border-[#1f1f1f] !text-[#14140f] dark:!text-white sm:!max-w-md">
                    {detailBooking && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">
                                    {sessionTitle(detailBooking)}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="!text-[#14140f]/50 dark:!text-white/45">
                                    {format(parseISO(detailBooking.date), 'EEEE d MMM yyyy')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="flex flex-col gap-px bg-[#e2e2d9] dark:bg-[#1f1f1f] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                <DetailLine label="Time" value={`${detailBooking.start_time.slice(0, 5)} – ${detailBooking.end_time.slice(0, 5)}`} />
                                <DetailLine label="Workout" value={detailBooking.workout_type ? WORKOUT_TYPE_LABELS[detailBooking.workout_type] ?? detailBooking.workout_type : 'Not set'} />
                                <DetailLine label="Status" value={statusLabel(detailBooking.status)} valueClassName={statusTextColor(detailBooking.status)} />
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel className="!bg-white dark:!bg-[#1a1a1a] !border-[#d8d8cd] dark:!border-[#2a2a2a] !text-[#14140f] dark:!text-white rounded-full px-5 py-2.5 font-medium text-[12.5px]">
                                    Close
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>

            {/* Cancel-confirmation dialog — replaces the browser's native
                window.confirm() with the same styled primitive used above. */}
            <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
                <AlertDialogContent className="!bg-[#f7f7f2] dark:!bg-[#111] !border-[#e2e2d9] dark:!border-[#1f1f1f] !text-[#14140f] dark:!text-white sm:!max-w-md">
                    {cancelTarget && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">
                                    Cancel this session?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="!text-[#14140f]/50 dark:!text-white/45">
                                    {format(parseISO(cancelTarget.date), 'EEEE d MMM')} at {cancelTarget.start_time.slice(0, 5)} — this can't be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                                <AlertDialogCancel className="!bg-white dark:!bg-[#1a1a1a] !border-[#d8d8cd] dark:!border-[#2a2a2a] !text-[#14140f] dark:!text-white rounded-full px-5 py-2.5 font-medium text-[12.5px]">
                                    Keep session
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmCancel}
                                    disabled={cancellingId === cancelTarget.id}
                                    className="!bg-[#ff6b52] !text-white rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:!bg-[#e5573f] disabled:opacity-50"
                                >
                                    {cancellingId === cancelTarget.id ? 'Cancelling…' : 'Cancel session'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </ClientShell>
    )
}

function DetailLine({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
    return (
        <div className="bg-[#ececdf] dark:bg-[#141414] px-[15px] py-[13px] flex items-center gap-2.5">
            <span className="text-[11.5px] text-[#14140f]/45 dark:text-white/45">{label}</span>
            <span className={`ml-auto font-medium text-[12.5px] ${valueClassName ?? ''}`}>{value}</span>
        </div>
    )
}

function EmptyState({ onBook }: { onBook: () => void }) {
    return (
        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[18px] p-11 text-center">
            <div className="font-['Anton'] text-2xl uppercase tracking-wide">Nothing booked</div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#14140f]/45 dark:text-white/45">Grab one of your coach's open hours to keep going.</p>
            <button type="button" onClick={onBook} className="mt-4 bg-[#ccff00] text-[#0a0a0a] rounded-full px-[22px] py-3 font-semibold text-xs hover:bg-[#e2ff5c] transition-colors">
                Book a session
            </button>
        </div>
    )
}

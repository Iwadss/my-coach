// src/coach/pages/schedule.tsx
// "Schedule" tab — a read-only week view of real availability + bookings,
// filtered to the hours the coach has actually turned on. Editing opens the
// same HoursManager used at /time-slots-management, in a Drawer. Clicking a
// booked slot opens a Dialog with the real booking record — Approve/Reject/
// Complete act on that same row, replacing the old separate
// /appointment-management page entirely.
import * as React from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell from '@/coach/components/coach-shell'
import HoursManager from '@/coach/components/hours-manager'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, X, User, Clock, Dumbbell } from 'lucide-react'

interface Slot {
    id: number
    start_time: string
    end_time: string
}

interface WeekBooking {
    id: number
    date: string
    time_slot_id: number
    clientId: string
    client: string
    status: string
    workoutType: string | null
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
    weightlifting: 'Weightlifting',
    hiit: 'HIIT',
    full_body: 'Full Body',
    mobility: 'Mobility',
}

// Single source of truth for status colors — the grid cells, the "Booking
// status" dots, and the top legend all read from this so they can't drift
// out of sync with each other.
const STATUS_COLORS: Record<string, { bg: string; border: string; fg: string }> = {
    pending: { bg: '#ffb020', border: '#ffb020', fg: '#2a1900' },
    confirmed: { bg: '#ccff00', border: '#ccff00', fg: '#0a0a0a' },
    completed: { bg: '#3a3a3a', border: '#4a4a4a', fg: 'rgba(255,255,255,.65)' },
}

function shortName(full: string): string {
    const parts = full.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function durationHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const statusPill = (s: string) => {
    switch (s) {
        case 'confirmed': return 'bg-[rgba(204,255,0,.13)] text-[#ccff00]'
        case 'pending': return 'bg-white/10 text-white/70'
        case 'completed': return 'bg-white/6 text-white/55'
        default: return 'bg-white/6 text-white/45'
    }
}

export default function CoachSchedule() {
    const [loading, setLoading] = React.useState(true)
    const [slots, setSlots] = React.useState<Slot[]>([])
    const [weekOffset, setWeekOffset] = React.useState(0)
    const [bookings, setBookings] = React.useState<WeekBooking[]>([])
    const [dayOffDates, setDayOffDates] = React.useState<Set<string>>(new Set())
    const [drawerOpen, setDrawerOpen] = React.useState(false)

    // Detail dialog for a clicked booked slot — carries both the booking and
    // its matching Slot (for start/end time) since the grid already has both
    // on hand at the point of click.
    const [detail, setDetail] = React.useState<{ booking: WeekBooking; slot: Slot } | null>(null)
    const [acting, setActing] = React.useState(false)

    const weekStart = React.useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset])
    const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

    const loadEnabledSlots = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await supabase.from('timeslots').select('id, start_time, end_time').eq('coach_id', user.id).eq('is_available', true).order('start_time', { ascending: true })
        setSlots(data ?? [])
        setLoading(false)
    }, [])

    React.useEffect(() => { loadEnabledSlots() }, [loadEnabledSlots])

    const loadWeek = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const from = format(weekStart, 'yyyy-MM-dd')
        const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

        const [{ data: bookingRows }, { data: offRows }] = await Promise.all([
            supabase
                .from('bookings')
                .select('id, date, time_slot_id, status, workout_type, client:clients!bookings_client_id_fkey(id, full_name)')
                .eq('coach_id', user.id)
                .neq('status', 'cancelled')
                .gte('date', from)
                .lte('date', to),
            supabase.from('coach_day_off').select('off_date').eq('coach_id', user.id).gte('off_date', from).lte('off_date', to),
        ])

        setBookings(((bookingRows ?? []) as any[]).map((r) => ({
            id: r.id,
            date: r.date,
            time_slot_id: r.time_slot_id,
            clientId: r.client?.id ?? '',
            client: r.client?.full_name ?? 'Client',
            status: r.status,
            workoutType: r.workout_type,
        })))
        setDayOffDates(new Set((offRows ?? []).map((r) => r.off_date)))
    }, [weekStart])

    React.useEffect(() => { loadWeek() }, [loadWeek])

    const handleDrawerChange = (open: boolean) => {
        setDrawerOpen(open)
        if (!open) {
            // Slots/day-offs may have changed inside the drawer — refresh the grid.
            loadEnabledSlots()
            loadWeek()
        }
    }

    const bookingAt = (dateStr: string, slotId: number) => bookings.find((b) => b.date === dateStr && b.time_slot_id === slotId)

    let bookedCount = 0
    let openCount = 0
    let bookedHours = 0
    for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd')
        const allowed = !dayOffDates.has(dateStr)
        for (const slot of slots) {
            const booking = bookingAt(dateStr, slot.id)
            if (booking) {
                bookedCount++
                bookedHours += durationHours(slot.start_time, slot.end_time)
            } else if (allowed) {
                openCount++
            }
        }
    }
    const fillPct = Math.round((bookedCount / Math.max(1, bookedCount + openCount)) * 100)

    // This week's booking mix by status — same array the grid renders from,
    // so these always agree with what's on screen.
    const pendingCount = bookings.filter((b) => b.status === 'pending').length
    const approvedCount = bookings.filter((b) => b.status === 'confirmed').length
    const completedCount = bookings.filter((b) => b.status === 'completed').length

    const updateStatus = async (newStatus: 'confirmed' | 'cancelled' | 'completed') => {
        if (!detail) return
        const { booking } = detail
        setActing(true)

        const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)

        if (error) {
            setActing(false)
            toast.error('❌ Could not update booking', { description: error.message, className: 'toast-error' })
            return
        }

        // Marking complete has a real side effect beyond the status flag —
        // the client's actual completed-session count, same thing the old
        // /appointment-management page did via a separate "Archive" step.
        // Folded in here so it can't be left stale by a coach who marks
        // complete but never does that second step.
        if (newStatus === 'completed' && booking.clientId) {
            const { data: existing } = await supabase
                .from('client_booking_totals')
                .select('completed_slots')
                .eq('client_id', booking.clientId)
                .maybeSingle()

            if (existing) {
                await supabase
                    .from('client_booking_totals')
                    .update({ completed_slots: existing.completed_slots + 1, last_completed_at: new Date().toISOString() })
                    .eq('client_id', booking.clientId)
            } else {
                await supabase
                    .from('client_booking_totals')
                    .insert({ client_id: booking.clientId, completed_slots: 1, last_completed_at: new Date().toISOString() })
            }
        }

        setActing(false)
        setDetail(null)
        toast.success(
            newStatus === 'confirmed' ? `✅ Approved ${booking.client}'s session`
                : newStatus === 'cancelled' ? `${booking.client}'s session rejected`
                    : `✅ Marked complete`,
            { className: 'toast-success' }
        )
        loadWeek()
    }

    return (
        <CoachShell active="schedule" kicker="Availability" title="Schedule" blurb="A read-only look at your open and booked hours. Manage what's on or off from the drawer.">
            {loading ? (
                <div className="text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : slots.length === 0 ? (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-10 text-center">
                    <div className="font-['Anton'] text-xl uppercase tracking-wide">No hours turned on yet</div>
                    <p className="mt-2 text-[12.5px] text-white/45">Turn on your first hour to start accepting bookings.</p>
                    <button type="button" onClick={() => setDrawerOpen(true)} className="mt-4 bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-xs hover:bg-[#e2ff5c] transition-colors">
                        Manage your hours
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)} className="w-8 h-8 rounded-[10px] bg-[#141414] border border-[#232323] flex items-center justify-center text-white/60 hover:border-[#3a3a3a] hover:text-white transition-colors">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[13px] font-medium">{format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}</span>
                            <button type="button" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)} className="w-8 h-8 rounded-[10px] bg-[#141414] border border-[#232323] flex items-center justify-center text-white/60 hover:border-[#3a3a3a] hover:text-white transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            {weekOffset !== 0 && (
                                <button type="button" onClick={() => setWeekOffset(0)} className="text-[11.5px] text-[#ccff00] font-medium ml-1">This week</button>
                            )}
                        </div>
                        <div className="ml-auto flex items-center gap-4 text-[11.5px] text-white/50">
                            <Legend color={STATUS_COLORS.pending.bg} label="Pending" />
                            <Legend color={STATUS_COLORS.confirmed.bg} label="Approved" />
                            <Legend color={STATUS_COLORS.completed.bg} border={STATUS_COLORS.completed.border} label="Completed" />
                            <Legend color="#1a1a1a" border="#34401a" label="Open" />
                            <Legend color="#0f0f0f" border="#1f1f1f" label="Day off" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[22px] items-start">
                        <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-4 overflow-x-auto">
                            <div className="min-w-[640px]">
                                <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: '56px repeat(7,1fr)' }}>
                                    <span />
                                    {days.map((d) => {
                                        const dateStr = format(d, 'yyyy-MM-dd')
                                        const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                                        const off = dayOffDates.has(dateStr)
                                        const color = isToday ? '#ccff00' : off ? '#ff6b52' : 'rgba(255,255,255,.5)'
                                        return (
                                            <div key={dateStr} className="text-center">
                                                <div className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.2px] uppercase" style={{ color }}>{format(d, 'EEE')}</div>
                                                <div className="mt-0.5 text-[13px] font-medium" style={{ color }}>{format(d, 'd')}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {slots.map((slot) => (
                                    <div key={slot.id} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '56px repeat(7,1fr)' }}>
                                        <span className="flex items-center font-['JetBrains_Mono'] text-[11px] text-white/32">{slot.start_time.slice(0, 5)}</span>
                                        {days.map((d) => {
                                            const dateStr = format(d, 'yyyy-MM-dd')
                                            const off = dayOffDates.has(dateStr)
                                            const booking = bookingAt(dateStr, slot.id)
                                            const statusColors = booking ? STATUS_COLORS[booking.status] : null
                                            const bg = statusColors ? statusColors.bg : off ? '#0f0f0f' : '#1a1a1a'
                                            const border = statusColors ? statusColors.border : off ? '#1f1f1f' : '#34401a'
                                            const fg = statusColors ? statusColors.fg : off ? 'rgba(255,255,255,.2)' : 'rgba(204,255,0,.55)'
                                            return (
                                                <button
                                                    key={dateStr}
                                                    type="button"
                                                    onClick={() => booking && setDetail({ booking, slot })}
                                                    disabled={!booking && off}
                                                    className="h-[34px] rounded-[9px] font-medium text-[10.5px] overflow-hidden whitespace-nowrap text-ellipsis px-1.5 hover:brightness-110 transition-[filter] disabled:cursor-default"
                                                    style={{ background: bg, border: `1px solid ${border}`, color: fg }}
                                                >
                                                    {booking ? shortName(booking.client) : off ? '' : '+'}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] p-5">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">This week</div>
                                <div className="mt-3.5 flex flex-col gap-3">
                                    <div className="flex items-baseline gap-2.5">
                                        <span className="font-['Anton'] text-[26px] leading-none text-[#ccff00]">{bookedCount}</span>
                                        <span className="text-xs text-white/50">sessions booked ({bookedHours % 1 === 0 ? bookedHours : bookedHours.toFixed(1)} h)</span>
                                    </div>
                                    <div className="flex items-baseline gap-2.5">
                                        <span className="font-['Anton'] text-[26px] leading-none">{openCount}</span>
                                        <span className="text-xs text-white/50">slots open to book</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden flex">
                                        <span className="block h-full bg-[#ccff00]" style={{ width: `${fillPct}%` }} />
                                    </div>
                                    <div className="text-[11.5px] text-white/40">{fillPct}% of your open hours are filled</div>
                                </div>
                            </div>

                            <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-5">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-white/40">Booking status</div>
                                <div className="mt-3.5 flex flex-col gap-2.5">
                                    <StatusCountRow label="Pending" value={pendingCount} dotColor={STATUS_COLORS.pending.bg} />
                                    <StatusCountRow label="Approved" value={approvedCount} dotColor={STATUS_COLORS.confirmed.bg} />
                                    <StatusCountRow label="Completed" value={completedCount} dotColor={STATUS_COLORS.completed.bg} />
                                </div>
                            </div>

                            <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-5">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-white/40">Manage your hours</div>
                                <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/42">This grid is read-only. Turn hours on or off, and take specific days off, from here.</p>
                                <button type="button" onClick={() => setDrawerOpen(true)} className="mt-3.5 w-full bg-[#ccff00] text-[#0a0a0a] rounded-full py-3 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors">
                                    Open hours manager
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Drawer open={drawerOpen} onOpenChange={handleDrawerChange} direction="right">
                <DrawerContent className="!bg-[#0d0d0d] !border-l !border-[#1c1c1c] !text-white data-[vaul-drawer-direction=right]:!w-full data-[vaul-drawer-direction=right]:sm:!max-w-md">
                    <DrawerHeader className="border-b border-[#1c1c1c] pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <DrawerTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">Manage your hours</DrawerTitle>
                                <DrawerDescription className="!text-white/45 mt-1">Enable, disable, or take a day off.</DrawerDescription>
                            </div>
                            <DrawerClose className="text-white/50 hover:text-white flex-none">
                                <X className="w-4 h-4" />
                            </DrawerClose>
                        </div>
                    </DrawerHeader>
                    <div className="px-4 pb-6 overflow-y-auto">
                        <HoursManager />
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Booking detail — opened from a booked grid cell. Replaces the old
                navigation to /appointment-management entirely. */}
            <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-md">
                    {detail && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between gap-3">
                                    <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">{detail.booking.client}</DialogTitle>
                                    <span className={`text-[10.5px] font-medium rounded-full px-2.5 py-1 flex-none ${statusPill(detail.booking.status)}`}>{statusLabel(detail.booking.status)}</span>
                                </div>
                                <DialogDescription className="!text-white/45">{format(new Date(detail.booking.date), 'EEEE d MMM yyyy')}</DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                <DetailRow icon={User} label="Client" value={detail.booking.client} />
                                <DetailRow icon={Clock} label="Time" value={`${detail.slot.start_time.slice(0, 5)} – ${detail.slot.end_time.slice(0, 5)}`} />
                                <DetailRow icon={Dumbbell} label="Workout" value={detail.booking.workoutType ? WORKOUT_TYPE_LABELS[detail.booking.workoutType] ?? detail.booking.workoutType : 'Not set'} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-white/60 border border-[#2a2a2a] hover:text-white transition-colors">
                                        Close
                                    </button>
                                </DialogClose>
                                {detail.booking.status === 'pending' && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={acting}
                                            onClick={() => updateStatus('cancelled')}
                                            className="rounded-full px-5 py-2.5 font-semibold text-[12.5px] text-[#ff6b52] border border-[rgba(255,107,82,.4)] hover:bg-[rgba(255,107,82,.1)] transition-colors disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            type="button"
                                            disabled={acting}
                                            onClick={() => updateStatus('confirmed')}
                                            className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                        >
                                            {acting ? 'Approving…' : 'Approve'}
                                        </button>
                                    </>
                                )}
                                {detail.booking.status === 'confirmed' && (
                                    <button
                                        type="button"
                                        disabled={acting}
                                        onClick={() => updateStatus('completed')}
                                        className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                    >
                                        {acting ? 'Marking…' : 'Mark complete'}
                                    </button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </CoachShell>
    )
}

function Legend({ color, border, label }: { color: string; border?: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="w-[11px] h-[11px] rounded-[4px]" style={{ background: color, border: border ? `1px solid ${border}` : undefined }} />
            {label}
        </span>
    )
}

function StatusCountRow({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
    return (
        <div className="flex items-center gap-2.5 text-[13px]">
            <span className="w-2 h-2 rounded-full flex-none" style={{ background: dotColor }} />
            <span className="text-white/60">{label}</span>
            <span className="ml-auto font-['JetBrains_Mono'] font-semibold">{value}</span>
        </div>
    )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
    return (
        <div className="bg-[#141414] px-[15px] py-3.5 flex items-center gap-3">
            <Icon className="w-4 h-4 text-white/35 flex-none" />
            <span className="text-[11.5px] text-white/50">{label}</span>
            <span className="ml-auto font-medium text-[12.5px]">{value}</span>
        </div>
    )
}

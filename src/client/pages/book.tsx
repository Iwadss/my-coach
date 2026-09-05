// src/client/pages/book.tsx
// "Book a session" tab — day + time picker wired to timeslots/coach_day_off,
// same overlap-avoidance approach as the booking flow it replaces: this is a
// best-effort UI hint (RLS only lets a client see their own bookings, not
// every client's), and the real collision guard is the DB's unique
// (coach_id, date, time_slot_id) constraint — a 23505 on insert means
// someone beat you to it.
//
// A day is closed because a specific date is in coach_day_off, not because
// of a persistent weekly pattern — the coach took that one date off, and
// the same weekday the week after is open again by default.
import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import ClientShell from '@/client/components/client-shell'
import { ChevronLeft, ChevronRight, Dumbbell, Flame, PersonStanding, Move } from 'lucide-react'

const WEEKS_AHEAD = 4 // how far into the future a client can book
const SLOT_PAGE_SIZE = 5 // matches the 5-column time grid

const WORKOUT_TYPES = [
    { value: 'weightlifting', label: 'Weightlifting', icon: Dumbbell },
    { value: 'hiit', label: 'HIIT', icon: Flame },
    { value: 'full_body', label: 'Full Body', icon: PersonStanding },
    { value: 'mobility', label: 'Mobility', icon: Move },
]

interface TimeSlot {
    id: number
    start_time: string
    end_time: string
}

interface OwnBooking {
    date: string
    start_time: string
    status: string
}

interface OtherBookedSlot {
    date: string
    time_slot_id: number
}

function lengthLabel(start: string, end: string): string {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    return mins % 60 === 0 ? `${mins / 60} hr` : `${mins} min`
}

export default function ClientBook() {
    const navigate = useNavigate()
    const location = useLocation() as { state?: { presetDate?: string; presetSlotId?: number } }

    const [coachId, setCoachId] = React.useState<string | null>(null)
    const [coachName, setCoachName] = React.useState('your coach')
    const [tokenBalance, setTokenBalance] = React.useState(0)
    const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
    const [dayOffDates, setDayOffDates] = React.useState<Set<string>>(new Set())
    const [ownBookings, setOwnBookings] = React.useState<OwnBooking[]>([])
    // Slots any *other* client already holds — bookings_select RLS only
    // lets us SELECT our own booking rows, so this comes from a narrow
    // SECURITY DEFINER RPC instead (see the migration for what it does and
    // doesn't expose).
    const [otherBookedSlots, setOtherBookedSlots] = React.useState<OtherBookedSlot[]>([])
    const [loading, setLoading] = React.useState(true)
    const [booking, setBooking] = React.useState(false)

    const today = React.useMemo(() => new Date(), [])
    const rangeStart = today
    const rangeEnd = React.useMemo(() => addDays(today, WEEKS_AHEAD * 7 - 1), [today])

    const [weekOffset, setWeekOffset] = React.useState(0)
    const days = React.useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i)),
        [today, weekOffset]
    )
    // Resolved once loading finishes (see load() below) — same-day booking
    // isn't allowed, so "today" (days[0]) is never a valid default even
    // though it's still shown, disabled, in the Step 1 picker. Left blank
    // until then rather than guessing, since the real default depends on
    // day-off dates and slot availability that only load() has yet.
    const [selectedDate, setSelectedDate] = React.useState<string>(location.state?.presetDate ?? '')
    const [selectedSlotId, setSelectedSlotId] = React.useState<number | null>(location.state?.presetSlotId ?? null)
    const [slotPage, setSlotPage] = React.useState(0)
    // Not date/time-bound like selectedSlotId — a workout-type preference
    // isn't invalidated by picking a different day, so handleSelectDay
    // doesn't reset this.
    const [workoutType, setWorkoutType] = React.useState<string | null>(null)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const { data: rel } = await supabase
                .from('coach_clients')
                .select('coach_id, coach:coaches!coach_clients_coach_id_fkey(profile:profiles!coaches_id_fkey(full_name, email))')
                .eq('client_id', user.id)
                .eq('status', 'approved')
                .maybeSingle()

            if (!rel) { setLoading(false); return }
            setCoachId(rel.coach_id)
            const coachData = rel.coach as unknown as { profile: { full_name: string | null; email: string } } | null
            if (coachData) setCoachName(coachData.profile.full_name || coachData.profile.email)

            const [{ data: slots }, { data: offRows }, { data: bookings }, { data: takenRows }, { data: clientRow }] = await Promise.all([
                supabase.from('timeslots').select('id, start_time, end_time').eq('coach_id', rel.coach_id).eq('is_available', true).order('start_time', { ascending: true }),
                supabase.from('coach_day_off').select('off_date').eq('coach_id', rel.coach_id).gte('off_date', format(rangeStart, 'yyyy-MM-dd')).lte('off_date', format(rangeEnd, 'yyyy-MM-dd')),
                supabase
                    .from('bookings')
                    .select('date, status, timeslot:timeslots!bookings_time_slot_id_fkey(start_time)')
                    .eq('client_id', user.id)
                    .gte('date', format(rangeStart, 'yyyy-MM-dd'))
                    .lte('date', format(rangeEnd, 'yyyy-MM-dd')),
                supabase.rpc('booked_slots_for_range', {
                    p_coach_id: rel.coach_id,
                    p_start: format(rangeStart, 'yyyy-MM-dd'),
                    p_end: format(rangeEnd, 'yyyy-MM-dd'),
                }),
                supabase.from('clients').select('token_balance').eq('id', user.id).maybeSingle(),
            ])

            const allSlots = slots ?? []
            const offSet = new Set((offRows ?? []).map((r) => r.off_date))
            const ownBookingsList = (bookings ?? []).map((b: any) => ({ date: b.date, status: b.status, start_time: b.timeslot?.start_time ?? '' }))
            const takenList = (takenRows ?? []).map((r: any) => ({ date: r.booked_date, time_slot_id: r.time_slot_id }))

            setTimeSlots(allSlots)
            setDayOffDates(offSet)
            setOwnBookings(ownBookingsList)
            setOtherBookedSlots(takenList)
            setTokenBalance(clientRow?.token_balance ?? 0)

            // Default day: the preset from navigation state if one was
            // passed in (e.g. "book again"), otherwise the nearest day
            // *after* today — never today itself — that isn't a day off and
            // still has at least one slot nobody (including this client)
            // already holds. Falls back to tomorrow even if nothing in the
            // window is open, so the picker still lands somewhere valid.
            const presetDate = location.state?.presetDate
            let defaultDate: Date
            if (presetDate) {
                defaultDate = parseISO(presetDate)
            } else {
                const bookedByMe = new Set(
                    ownBookingsList.filter((b) => b.status !== 'cancelled').map((b) => `${b.date}|${b.start_time}`)
                )
                const takenByOther = new Set(takenList.map((r: { date: string; time_slot_id: string }) => `${r.date}|${r.time_slot_id}`))

                let nextOpenDay: Date | null = null
                for (let i = 1; i < WEEKS_AHEAD * 7; i++) {
                    const d = addDays(today, i)
                    const dStr = format(d, 'yyyy-MM-dd')
                    if (offSet.has(dStr)) continue
                    const hasOpenSlot = allSlots.some(
                        (t) => !bookedByMe.has(`${dStr}|${t.start_time}`) && !takenByOther.has(`${dStr}|${t.id}`)
                    )
                    if (hasOpenSlot) { nextOpenDay = d; break }
                }
                defaultDate = nextOpenDay ?? addDays(today, 1)
            }

            setSelectedDate(format(defaultDate, 'yyyy-MM-dd'))
            setWeekOffset(Math.min(WEEKS_AHEAD - 1, Math.max(0, Math.floor(differenceInCalendarDays(defaultDate, today) / 7))))
            setLoading(false)
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Same-day booking is disallowed — clients must book at least 1 day
    // ahead — so "today" is never allowed here regardless of day-off status.
    const todayStr = format(today, 'yyyy-MM-dd')
    const isDayAllowed = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return dateStr > todayStr && !dayOffDates.has(dateStr)
    }

    // Keyed "date|slotId" for O(1) lookup — a slot someone else holds stays
    // in the grid (so the client can see it exists) but renders disabled.
    const takenByOtherSet = React.useMemo(
        () => new Set(otherBookedSlots.map((s) => `${s.date}|${s.time_slot_id}`)),
        [otherBookedSlots]
    )
    const isTakenByOther = (dateStr: string, slotId: number) => takenByOtherSet.has(`${dateStr}|${slotId}`)

    // Strict cutoff: no slot on today or any earlier date is ever bookable,
    // full stop — not just "today's times that have already passed". Same
    // rule isDayAllowed() enforces on the day picker; this is the second,
    // independent enforcement point so a stale/forced selectedDate (e.g.
    // from navigation state) can't slip a same-day slot through.
    const slotsForDate = (dateStr: string) => {
        if (dateStr <= todayStr) return []
        const bookedTimes = new Set(ownBookings.filter((b) => b.date === dateStr && b.status !== 'cancelled').map((b) => b.start_time))
        return timeSlots.filter((t) => !bookedTimes.has(t.start_time))
    }

    const daySlots = slotsForDate(selectedDate)
    const selectedSlot = daySlots.find((s) => s.id === selectedSlotId && !isTakenByOther(selectedDate, s.id)) ?? null
    const selectedWorkoutTypeLabel = WORKOUT_TYPES.find((w) => w.value === workoutType)?.label ?? null

    const slotPageCount = Math.max(1, Math.ceil(daySlots.length / SLOT_PAGE_SIZE))
    const pagedSlots = daySlots.slice(slotPage * SLOT_PAGE_SIZE, slotPage * SLOT_PAGE_SIZE + SLOT_PAGE_SIZE)

    const handleSelectDay = (dateStr: string) => {
        setSelectedDate(dateStr)
        setSelectedSlotId(null)
        setSlotPage(0)
    }

    const handlePrevWeek = () => setWeekOffset((w) => Math.max(0, w - 1))
    const handleNextWeek = () => setWeekOffset((w) => Math.min(WEEKS_AHEAD - 1, w + 1))

    const handleConfirm = async () => {
        if (!selectedSlotId || !coachId || !workoutType || tokenBalance === 0) return
        setBooking(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setBooking(false); return }

        const { error } = await supabase.from('bookings').insert({
            date: selectedDate,
            time_slot_id: selectedSlotId,
            client_id: user.id,
            workout_type: workoutType,
        })
        setBooking(false)

        if (error) {
            if (error.code === '23505') {
                toast.error('❌ Time slot already booked', { description: 'Someone booked this slot first — pick another.', className: 'toast-error' })
            } else if (error.message.includes('Not enough tokens')) {
                // Backstop for a stale token count (e.g. spent in another tab
                // since this page loaded) — the disabled button is the normal
                // path, this is the DB's own guard catching the rest.
                setTokenBalance(0)
                toast.error('❌ You have 0 tokens', { description: 'Please contact your coach to purchase more sessions.', className: 'toast-error' })
            } else {
                toast.error('❌ Booking failed', { description: error.message, className: 'toast-error' })
            }
            return
        }

        setTokenBalance((b) => Math.max(0, b - 1))
        toast.success('✅ Booked', { description: `${format(parseISO(selectedDate), 'EEEE d MMM')} at ${selectedSlot?.start_time.slice(0, 5)} with ${coachName}.`, className: 'toast-success' })
        navigate('/client-sessions')
    }

    return (
        <ClientShell active="book" kicker="Booking" title="Book a session" blurb={`These are the hours ${coachName} has left open. Pick a slot and it's confirmed straight away.`}>
            {loading ? (
                <div className="text-[#14140f]/40 dark:text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : !coachId ? (
                <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-8 text-center text-[#14140f]/50 dark:text-white/50 text-sm">
                    You don't have a coach linked yet.
                </div>
            ) : (
                <>
                    <div className={`mb-4 rounded-[16px] px-[18px] py-[14px] flex items-center gap-3 border ${tokenBalance === 0 ? 'bg-[rgba(255,107,82,.08)] border-[rgba(255,107,82,.3)]' : 'bg-[#f7f7f2] dark:bg-[#111] border-[#e2e2d9] dark:border-[#1f1f1f]'}`}>
                        <span className={`font-['Anton'] text-xl leading-none flex-none ${tokenBalance === 0 ? 'text-[#c8432a] dark:text-[#ff6b52]' : 'text-[#6f8c00] dark:text-[#ccff00]'}`}>{tokenBalance}</span>
                        <span className="text-[13px] text-[#14140f]/65 dark:text-white/65">
                            {tokenBalance === 0
                                ? 'You have 0 tokens. Please contact your coach to purchase more sessions.'
                                : `token${tokenBalance === 1 ? '' : 's'} left`}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[22px] items-start">
                        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="flex items-center gap-3">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Step 1 · Day</div>
                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        type="button"
                                        aria-label="Previous week"
                                        disabled={weekOffset === 0}
                                        onClick={handlePrevWeek}
                                        className="w-7 h-7 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f]/60 dark:text-white/60 hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] hover:text-[#14140f] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="font-['JetBrains_Mono'] text-[11px] text-[#14140f]/40 dark:text-white/40 min-w-[92px] text-center">
                                        {format(days[0], 'd MMM')} – {format(days[6], 'd MMM')}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Next week"
                                        disabled={weekOffset === WEEKS_AHEAD - 1}
                                        onClick={handleNextWeek}
                                        className="w-7 h-7 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f]/60 dark:text-white/60 hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] hover:text-[#14140f] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3.5 grid grid-cols-4 sm:grid-cols-7 gap-2">
                                {days.map((d) => {
                                    const dateStr = format(d, 'yyyy-MM-dd')
                                    const allowed = isDayAllowed(d)
                                    const on = selectedDate === dateStr
                                    const isToday = dateStr === todayStr
                                    return (
                                        <button
                                            key={dateStr}
                                            type="button"
                                            disabled={!allowed}
                                            aria-label={isToday ? `${format(d, 'EEEE d MMM')} — book at least 1 day ahead` : undefined}
                                            onClick={() => handleSelectDay(dateStr)}
                                            className={`rounded-[14px] py-3 text-center border transition-colors ${on ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : allowed ? 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f] dark:text-white hover:border-[#c9c9be] dark:hover:border-[#3a3a3a]' : 'bg-[#ececdf] dark:bg-[#141414] border-[#e2e2d9] dark:border-[#1f1f1f] text-[#14140f]/25 dark:text-white/25 cursor-not-allowed'}`}
                                        >
                                            <span className="block font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.2px] uppercase opacity-60">{isToday ? 'Today' : format(d, 'EEE')}</span>
                                            <span className="block mt-1 font-semibold text-[15px]">{format(d, 'd')}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-6 flex items-center gap-3">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Step 2 · Time</div>
                                {daySlots.length > SLOT_PAGE_SIZE && (
                                    <div className="ml-auto flex items-center gap-2">
                                        <button
                                            type="button"
                                            aria-label="Earlier times"
                                            disabled={slotPage === 0}
                                            onClick={() => setSlotPage((p) => Math.max(0, p - 1))}
                                            className="w-7 h-7 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f]/60 dark:text-white/60 hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] hover:text-[#14140f] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="font-['JetBrains_Mono'] text-[11px] text-[#14140f]/40 dark:text-white/40">{slotPage + 1}/{slotPageCount}</span>
                                        <button
                                            type="button"
                                            aria-label="Later times"
                                            disabled={slotPage >= slotPageCount - 1}
                                            onClick={() => setSlotPage((p) => Math.min(slotPageCount - 1, p + 1))}
                                            className="w-7 h-7 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f]/60 dark:text-white/60 hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] hover:text-[#14140f] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3.5 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {pagedSlots.map((slot) => {
                                    const on = selectedSlotId === slot.id
                                    const taken = isTakenByOther(selectedDate, slot.id)
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            disabled={taken}
                                            aria-label={taken ? `${slot.start_time.slice(0, 5)} — already booked` : undefined}
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`rounded-[13px] py-3.5 text-center font-['JetBrains_Mono'] text-[13px] border transition-colors ${taken
                                                ? 'bg-[#ececdf] dark:bg-[#141414] border-[#e2e2d9] dark:border-[#1f1f1f] text-[#14140f]/25 dark:text-white/25 cursor-not-allowed'
                                                : on
                                                    ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]'
                                                    : 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f] dark:text-white hover:border-[#c9c9be] dark:hover:border-[#3a3a3a]'
                                                }`}
                                        >
                                            {slot.start_time.slice(0, 5)}
                                            {taken && <span className="block mt-0.5 text-[8.5px] tracking-[0.5px] uppercase opacity-70">Booked</span>}
                                        </button>
                                    )
                                })}
                            </div>
                            {daySlots.length === 0 && (
                                <p className="mt-3.5 text-[12.5px] text-[#14140f]/45 dark:text-white/45">{coachName} has no open hours that day. Try another day.</p>
                            )}

                            {/* Only appears once a real (untaken) time slot is picked — no
                            point choosing a workout type before Step 2 is actually done. */}
                            {selectedSlot && (
                                <>
                                    <div className="mt-6 flex items-center gap-3">
                                        <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Step 3 · Workout type</div>
                                    </div>
                                    <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {WORKOUT_TYPES.map((w) => {
                                            const on = workoutType === w.value
                                            return (
                                                <button
                                                    key={w.value}
                                                    type="button"
                                                    onClick={() => setWorkoutType(w.value)}
                                                    className={`flex items-center justify-center gap-1.5 rounded-[13px] py-3.5 text-center font-['JetBrains_Mono'] text-[13px] border transition-colors ${on ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f] dark:text-white hover:border-[#c9c9be] dark:hover:border-[#3a3a3a]'}`}
                                                >
                                                    <w.icon className="w-4 h-4" strokeWidth={1.8} />
                                                    {w.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-[#f0f0e9] dark:bg-[#0d0d0d] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px] lg:sticky lg:top-6">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#14140f]/40 dark:text-white/40">Your booking</div>
                            <div className="mt-3.5 font-['Anton'] text-[24px] leading-[1.1] tracking-wide uppercase">
                                {selectedSlot ? `${selectedSlot.start_time.slice(0, 5)} session` : 'Pick a time'}
                            </div>
                            <div className="mt-2 text-[13px] text-[#14140f]/50 dark:text-white/50">
                                {selectedSlot ? `${format(parseISO(selectedDate), 'EEEE d MMM')} with ${coachName}` : 'Pick a day and time to continue'}
                            </div>

                            <div className="mt-4 flex flex-col gap-px bg-[#e2e2d9] dark:bg-[#1f1f1f] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                <SummaryLine label="Coach" value={coachName} />
                                <SummaryLine label="Length" value={selectedSlot ? lengthLabel(selectedSlot.start_time, selectedSlot.end_time) : '—'} />
                                <SummaryLine label="Workout" value={selectedWorkoutTypeLabel ?? '—'} />
                                <SummaryLine label="Tokens left" value={String(tokenBalance)} accent={tokenBalance > 0} />
                                <SummaryLine label="Status" value="Pending until confirmed" accent />
                            </div>

                            <button
                                type="button"
                                disabled={!selectedSlot || !workoutType || booking || tokenBalance === 0}
                                onClick={handleConfirm}
                                className={`mt-4 w-full rounded-full py-[15px] font-semibold text-[13.5px] transition-colors ${selectedSlot && workoutType && !booking && tokenBalance > 0 ? 'bg-[#ccff00] text-[#0a0a0a] hover:bg-[#e2ff5c] cursor-pointer' : 'bg-white dark:bg-[#1a1a1a] text-[#14140f]/35 dark:text-white/35 cursor-not-allowed'}`}
                            >
                                {booking ? 'Booking…' : tokenBalance === 0 ? 'No tokens left' : !selectedSlot ? 'Choose a time first' : !workoutType ? 'Choose a workout type' : 'Confirm booking'}
                            </button>
                            <p className="mt-3 text-[11.5px] leading-relaxed text-[#14140f]/40 dark:text-white/40">Free to cancel any time before your coach confirms.</p>
                        </div>
                    </div>
                </>
            )}
        </ClientShell>
    )
}

function SummaryLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="bg-[#ececdf] dark:bg-[#141414] px-[15px] py-[13px] flex items-center gap-2.5">
            <span className="text-[11.5px] text-[#14140f]/45 dark:text-white/45">{label}</span>
            <span className={`ml-auto font-medium text-[12.5px] ${accent ? 'text-[#6f8c00] dark:text-[#ccff00]' : ''}`}>{value}</span>
        </div>
    )
}

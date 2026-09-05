// src/coach/pages/dashboard.tsx
// "Today" tab — home screen of the MyCoach Coach design.
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell, { initials } from '@/coach/components/coach-shell'

// Today's Sessions only ever shows Approved (status 'confirmed') bookings
// now — no per-row status pill needed, since every row on screen is the
// same status by construction.
interface TodaySession {
    id: number
    client: string
    start_time: string
    end_time: string
}

interface UpcomingBooking {
    date: string
    client: string
    start_time: string
    end_time: string
}

interface JoinRequest {
    id: number
    name: string
    email: string
    goal: string | null
    ago: string
}

// A booking a client has already spent a token on, still waiting on the
// coach's Approve/Reject — same 'pending' status CoachSchedule.tsx's grid
// dialog acts on, just surfaced here as a quick-action widget instead of
// requiring a trip to the Schedule page.
interface PendingApproval {
    id: number
    client: string
    date: string
    start_time: string
    end_time: string
}

// How many pending-approval rows the widget shows before "See all" is needed.
const PENDING_PREVIEW_COUNT = 4

export default function CoachDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = React.useState(true)
    const [activeClients, setActiveClients] = React.useState(0)
    const [joinedThisMonth, setJoinedThisMonth] = React.useState(0)
    const [todaySessions, setTodaySessions] = React.useState<TodaySession[]>([])
    const [nextBooking, setNextBooking] = React.useState<UpcomingBooking | null>(null)
    const [bookedHours, setBookedHours] = React.useState(0)
    const [openCount, setOpenCount] = React.useState(0)
    const [requests, setRequests] = React.useState<JoinRequest[]>([])
    const [acting, setActing] = React.useState<number | null>(null)
    const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([])
    const [actingBooking, setActingBooking] = React.useState<number | null>(null)

    const load = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const today = format(new Date(), 'yyyy-MM-dd')
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

        const [
            { count: active },
            { count: joined },
            { data: futureBookings },
            { data: weekBookings },
            { data: timeslots },
            { data: availableDays },
            { data: pendingRows },
        ] = await Promise.all([
            supabase.from('coach_clients').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'approved'),
            supabase.from('coach_clients').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'approved').gte('reviewed_at', monthStart),
            supabase
                .from('bookings')
                .select('id, date, status, client:clients!bookings_client_id_fkey(full_name), timeslot:timeslots!bookings_time_slot_id_fkey(start_time, end_time)')
                .eq('coach_id', user.id)
                .in('status', ['pending', 'confirmed'])
                .gte('date', today)
                .order('date', { ascending: true })
                // Pre-existing bug fixed here: PostgREST orders by the
                // select's alias ('timeslot', singular — see the select
                // above), not the underlying table name. The old
                // 'timeslots(start_time)' was silently erroring on every
                // load (PGRST108), which meant futureBookings was always
                // null and today's sessions / pending approvals were both
                // permanently stuck empty regardless of real data.
                .order('timeslot(start_time)', { ascending: true })
                .limit(30),
            supabase
                .from('bookings')
                .select('date, status, timeslot:timeslots!bookings_time_slot_id_fkey(start_time, end_time)')
                .eq('coach_id', user.id)
                .neq('status', 'cancelled')
                .gte('date', weekStart)
                .lte('date', weekEnd),
            supabase.from('timeslots').select('id, is_available').eq('coach_id', user.id),
            supabase.from('available_days').select('day, is_available').eq('coach_id', user.id),
            supabase
                .from('coach_clients')
                .select('id, requested_at, client:clients!coach_clients_client_id_fkey(id, full_name, email, goal)')
                .eq('coach_id', user.id)
                .eq('status', 'pending')
                .order('requested_at', { ascending: true })
                .limit(3),
        ])

        setActiveClients(active ?? 0)
        setJoinedThisMonth(joined ?? 0)

        const nowTime = format(new Date(), 'HH:mm:ss')
        const rows = (futureBookings ?? []) as any[]

        const todays: TodaySession[] = rows
            .filter((r) => r.date === today && r.status === 'confirmed')
            .map((r) => ({
                id: r.id,
                client: r.client?.full_name ?? 'Client',
                start_time: r.timeslot?.start_time ?? '',
                end_time: r.timeslot?.end_time ?? '',
            }))
        setTodaySessions(todays)

        // rows is already every pending-or-confirmed booking from today
        // onward, soonest first — pending ones are exactly what the
        // Pending Approvals widget needs, no separate query.
        setPendingApprovals(
            rows
                .filter((r) => r.status === 'pending')
                .map((r) => ({
                    id: r.id,
                    client: r.client?.full_name ?? 'Client',
                    date: r.date,
                    start_time: r.timeslot?.start_time ?? '',
                    end_time: r.timeslot?.end_time ?? '',
                }))
        )

        const nextRow = rows.find((r) => r.date > today || (r.date === today && (r.timeslot?.end_time ?? '') > nowTime))
        if (nextRow) {
            setNextBooking({
                date: nextRow.date,
                client: nextRow.client?.full_name ?? 'Client',
                start_time: nextRow.timeslot?.start_time ?? '',
                end_time: nextRow.timeslot?.end_time ?? '',
            })
        }

        // Week accounting: total open slot-instances across allowed days,
        // minus what's actually booked. Best-effort, same grain as the
        // Schedule tab's grid.
        const weekRows = (weekBookings ?? []) as any[]
        let hours = 0
        for (const r of weekRows) {
            const st = r.timeslot?.start_time as string | undefined
            const et = r.timeslot?.end_time as string | undefined
            if (!st || !et) continue
            const [sh, sm] = st.split(':').map(Number)
            const [eh, em] = et.split(':').map(Number)
            hours += ((eh * 60 + em) - (sh * 60 + sm)) / 60
        }
        setBookedHours(hours)

        const availableSlotCount = (timeslots ?? []).filter((t) => t.is_available).length
        const allowedDaysCount = 7 - (availableDays ?? []).filter((d) => !d.is_available).length
        const totalInstances = availableSlotCount * allowedDaysCount
        setOpenCount(Math.max(0, totalInstances - weekRows.length))

        setRequests(
            ((pendingRows ?? []) as any[])
                .filter((r) => r.client)
                .map((r) => ({
                    id: r.id,
                    name: r.client.full_name || r.client.email,
                    email: r.client.email,
                    goal: r.client.goal,
                    ago: formatDistanceToNow(parseISO(r.requested_at), { addSuffix: true }),
                }))
        )

        setLoading(false)
    }, [])

    React.useEffect(() => { load() }, [load])

    const handleDecision = async (id: number, name: string, decision: 'approved' | 'rejected') => {
        setActing(id)
        const { error } = await supabase
            .from('coach_clients')
            .update({ status: decision, reviewed_at: new Date().toISOString() })
            .eq('id', id)
        setActing(null)

        if (error) {
            toast.error('Could not update request', { description: error.message, className: 'toast-error' })
            return
        }
        toast.success(decision === 'approved' ? `${name} is now your client` : `${name} was declined`, { className: 'toast-success' })
        load()
    }

    // Same status update CoachSchedule.tsx's booking-detail Dialog makes —
    // rejecting sets status to 'cancelled', which the DB's own
    // bookings_refund_token_trigger picks up to return the client's token,
    // no extra client-side step needed here.
    const handleBookingDecision = async (id: number, name: string, decision: 'confirmed' | 'cancelled') => {
        setActingBooking(id)
        const { error } = await supabase.from('bookings').update({ status: decision }).eq('id', id)
        setActingBooking(null)

        if (error) {
            toast.error('Could not update booking', { description: error.message, className: 'toast-error' })
            return
        }
        toast.success(decision === 'confirmed' ? `✅ Approved ${name}'s session` : `${name}'s session rejected`, { className: 'toast-success' })
        load()
    }

    const doneCount = React.useMemo(() => {
        const nowTime = format(new Date(), 'HH:mm:ss')
        return todaySessions.filter((s) => s.end_time <= nowTime).length
    }, [todaySessions])

    return (
        <CoachShell active="today" kicker={format(new Date(), 'EEEE d MMMM')} title="Today" blurb="Your sessions, the clients waiting on a reply, and what's coming up this week." showDate={false}>
            {loading ? (
                <div className="text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard
                            label="Sessions today"
                            value={String(todaySessions.length)}
                            hint={todaySessions.length ? `${todaySessions[0].start_time.slice(0, 5)} – ${todaySessions[todaySessions.length - 1].end_time.slice(0, 5)}` : 'nothing booked'}
                            accent
                        />
                        <StatCard label="Active clients" value={String(activeClients)} hint={`${joinedThisMonth} joined this month`} />
                        <StatCard label="Booked this week" value={`${bookedHours % 1 === 0 ? bookedHours : bookedHours.toFixed(1)} h`} hint={`${openCount} slots still open`} />
                        <StatCard label="New requests" value={String(requests.length)} hint="waiting to accept or decline" />
                    </div>

                    <div className="mt-[22px] grid grid-cols-1 lg:grid-cols-[1fr_384px] gap-[22px] items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">Today's sessions</div>
                            </div>
                            {todaySessions.length === 0 ? (
                                <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-8 text-center text-white/45 text-[12.5px]">
                                    Nothing booked today.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {todaySessions.map((s, i) => {
                                        const nowTime = format(new Date(), 'HH:mm:ss')
                                        const isDone = s.end_time <= nowTime
                                        const isNext = !isDone && i === doneCount
                                        return (
                                            <div key={s.id} className="grid grid-cols-[76px_1fr_auto] gap-4 items-center bg-[#111] border rounded-[18px] px-[18px] py-[15px]" style={{ borderColor: isNext ? '#ccff00' : '#1f1f1f' }}>
                                                <span className="font-['JetBrains_Mono'] text-[14px]" style={{ color: isDone ? 'rgba(255,255,255,.35)' : '#ccff00' }}>{s.start_time.slice(0, 5)}</span>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-[14.5px]">{s.client}</span>
                                                    <div className="mt-0.5 text-xs text-white/45">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</div>
                                                </div>
                                                <span
                                                    className="text-[11px] font-medium rounded-full px-2.5 py-1.5"
                                                    style={isNext ? { background: '#ccff00', color: '#0a0a0a' } : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.55)' }}
                                                >
                                                    {isDone ? 'Done' : isNext ? 'Next' : 'Upcoming'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="mt-6 flex items-center gap-3 mb-3.5">
                                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">New requests</div>
                                {requests.length > 0 && (
                                    <button type="button" onClick={() => navigate('/client-requests')} className="ml-auto text-[#ccff00] font-medium text-xs hover:text-[#e2ff5c]">
                                        See all
                                    </button>
                                )}
                            </div>
                            {requests.length === 0 ? (
                                <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-8 text-center text-white/45 text-[12.5px]">
                                    All caught up — no pending requests.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {requests.map((r) => (
                                        <div key={r.id} className="flex items-start gap-3.5 bg-[#111] border border-[#1f1f1f] rounded-[18px] px-[18px] py-[15px]">
                                            <span className="w-[38px] h-[38px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-xs text-white/75 flex-none">
                                                {initials(r.name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-[13.5px]">{r.name}</span>
                                                    {r.goal && <span className="text-[10.5px] font-medium bg-[rgba(204,255,0,.12)] text-[#ccff00] rounded-full px-2.5 py-1">{r.goal}</span>}
                                                </div>
                                                <div className="mt-1 text-xs text-white/40">{r.email} · asked {r.ago}</div>
                                            </div>
                                            <div className="flex gap-2 flex-none">
                                                <button type="button" disabled={acting === r.id} onClick={() => handleDecision(r.id, r.name, 'approved')} className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-4 py-2 font-semibold text-xs hover:bg-[#e2ff5c] transition-colors disabled:opacity-50">
                                                    Accept
                                                </button>
                                                <button type="button" disabled={acting === r.id} onClick={() => handleDecision(r.id, r.name, 'rejected')} className="bg-transparent border border-[#2a2a2a] text-white/55 rounded-full px-4 py-2 font-medium text-xs hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50">
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3.5">
                            <div className="bg-[#ccff00] text-[#0a0a0a] rounded-[20px] p-[22px]">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase opacity-70">
                                    {nextBooking ? (nextBooking.date === format(new Date(), 'yyyy-MM-dd') ? "Up next · today" : `Up next · ${format(parseISO(nextBooking.date), 'EEE d MMM')}`) : 'Nothing coming up'}
                                </div>
                                <div className="mt-3 font-['Anton'] text-[26px] leading-[1.1] tracking-wide uppercase">{nextBooking ? nextBooking.client : 'No sessions booked'}</div>
                                <div className="mt-2 font-medium text-[13px] opacity-75">
                                    {nextBooking ? `${nextBooking.start_time.slice(0, 5)} – ${nextBooking.end_time.slice(0, 5)}` : 'Open some hours to start filling your week'}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button type="button" onClick={() => navigate('/coach-schedule')} className="bg-[#0a0a0a] text-[#ccff00] rounded-full px-[18px] py-3 font-semibold text-xs hover:bg-[#1a1a1a] transition-colors">
                                        View schedule
                                    </button>
                                </div>
                            </div>

                            {/* Sessions clients have already spent a token booking — a real
                                quick-action widget (Approve/Reject right here), not another
                                readout of numbers already on the stat cards above. */}
                            <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-white/40">Pending approvals</div>
                                    {pendingApprovals.length > 0 && (
                                        <span className="font-['JetBrains_Mono'] text-[10px] font-semibold bg-[rgba(255,176,32,.15)] text-[#ffb020] rounded-full px-2 py-0.5">{pendingApprovals.length}</span>
                                    )}
                                </div>
                                <p className="mt-2 text-[11.5px] leading-relaxed text-white/42">Sessions clients booked with a token, waiting on your Approve or Reject.</p>

                                {pendingApprovals.length === 0 ? (
                                    <div className="mt-3.5 bg-[#141414] border border-[#1f1f1f] rounded-[14px] py-6 text-center text-white/40 text-[12px]">
                                        Nothing waiting on you.
                                    </div>
                                ) : (
                                    <div className="mt-3.5 flex flex-col gap-2.5">
                                        {pendingApprovals.slice(0, PENDING_PREVIEW_COUNT).map((p) => (
                                            <div key={p.id} className="bg-[#141414] border border-[#232323] rounded-[14px] px-[14px] py-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-[13px]">{p.client}</span>
                                                    <span className="ml-auto font-['JetBrains_Mono'] text-[10.5px] text-white/45">
                                                        {p.date === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(parseISO(p.date), 'EEE d MMM')} · {p.start_time.slice(0, 5)}
                                                    </span>
                                                </div>
                                                <div className="mt-2.5 flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={actingBooking === p.id}
                                                        onClick={() => handleBookingDecision(p.id, p.client, 'cancelled')}
                                                        className="flex-1 bg-transparent border border-[#2a2a2a] text-white/55 rounded-full py-1.5 font-medium text-[11.5px] hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={actingBooking === p.id}
                                                        onClick={() => handleBookingDecision(p.id, p.client, 'confirmed')}
                                                        className="flex-1 bg-[#ccff00] text-[#0a0a0a] rounded-full py-1.5 font-semibold text-[11.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {pendingApprovals.length > PENDING_PREVIEW_COUNT && (
                                    <button type="button" onClick={() => navigate('/coach-schedule')} className="mt-3 w-full text-center text-[11.5px] text-[#ccff00] font-medium hover:text-[#e2ff5c]">
                                        See all {pendingApprovals.length} on Schedule
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </CoachShell>
    )
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
    return (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl px-[18px] py-[17px]">
            <div className={`font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase ${accent ? 'text-[#ccff00]' : 'text-white/40'}`}>{label}</div>
            <div className="mt-2 font-['Anton'] text-[30px] sm:text-[34px] leading-none tracking-wide">{value}</div>
            <div className="mt-1.5 text-[11.5px] text-white/40">{hint}</div>
        </div>
    )
}

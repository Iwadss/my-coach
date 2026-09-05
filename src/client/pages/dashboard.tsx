// src/client/pages/dashboard.tsx
// "Today" tab — home screen of the MyCoach Client design.
//
// Deliberately kept to what's actually actionable: a status summary, what's
// next, and the full upcoming list. The old "From your coach" message card
// and "Open slots with your coach" quick-book widget were removed (see
// reminder.md) — the former's "Reply" button never sent anywhere, and the
// latter duplicated the real Book a session flow with a thinner, workout-
// type-less version of it. A "Your training" summary card that repeated two
// of the four stats below was also folded away rather than kept as a second
// place showing the same numbers.
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import supabase from '@/supabase/supabase'
import ClientShell from '@/client/components/client-shell'
import { StatusPill } from '@/components/shared/ui'

interface Totals {
    completed_slots: number
    last_completed_at: string | null
}

interface Coach {
    name: string
}

interface BookingRow {
    id: number
    date: string
    status: string
    start_time: string
    end_time: string
}

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const statusPill = (s: string) => {
    switch (s) {
        case 'confirmed': return 'bg-[rgba(204,255,0,.13)] text-[#6f8c00] dark:text-[#ccff00]'
        case 'pending': return 'bg-white/10 text-[#14140f]/70 dark:text-white/70'
        case 'completed': return 'bg-white/6 text-[#14140f]/55 dark:text-white/55'
        default: return 'bg-white/6 text-[#14140f]/45 dark:text-white/45'
    }
}

export default function ClientDashboard() {
    const navigate = useNavigate()
    const [firstName, setFirstName] = React.useState('')
    const [coach, setCoach] = React.useState<Coach | null>(null)
    // Mirrors ClientAuthGuard's own check (client_coach_access_ok) — the
    // guard already blocks the whole page in this case, so this pill is
    // mostly a "the data agrees" consistency check rather than something a
    // client will often actually see it render.
    const [coachAvailable, setCoachAvailable] = React.useState(true)
    const [totals, setTotals] = React.useState<Totals>({ completed_slots: 0, last_completed_at: null })
    const [bookings, setBookings] = React.useState<BookingRow[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const [{ data: clientRow }, { data: rel }, { data: totalsRow }, { data: bookingRows }, { data: coachOk }] = await Promise.all([
                supabase.from('clients').select('full_name').eq('id', user.id).maybeSingle(),
                supabase
                    .from('coach_clients')
                    .select('coach:coaches!coach_clients_coach_id_fkey(profile:profiles!coaches_id_fkey(full_name, email))')
                    .eq('client_id', user.id)
                    .eq('status', 'approved')
                    .maybeSingle(),
                supabase.from('client_booking_totals').select('completed_slots, last_completed_at').eq('client_id', user.id).maybeSingle(),
                supabase
                    .from('bookings')
                    .select('id, date, status, timeslot:timeslots!bookings_time_slot_id_fkey(start_time, end_time)')
                    .eq('client_id', user.id)
                    .order('date', { ascending: true }),
                supabase.rpc('client_coach_access_ok'),
            ])
            setCoachAvailable(coachOk !== false)

            setFirstName((clientRow?.full_name || 'there').split(' ')[0])
            setTotals(totalsRow ?? { completed_slots: 0, last_completed_at: null })

            const coachData = rel?.coach as unknown as { profile: { full_name: string | null; email: string } } | null
            if (coachData) {
                setCoach({ name: coachData.profile.full_name || coachData.profile.email })
            }

            const rows: BookingRow[] = (bookingRows ?? []).map((b: any) => ({
                id: b.id,
                date: b.date,
                status: b.status,
                start_time: b.timeslot?.start_time ?? '',
                end_time: b.timeslot?.end_time ?? '',
            }))
            setBookings(rows)
            setLoading(false)
        }
        load()
    }, [])

    const today = format(new Date(), 'yyyy-MM-dd')
    const upcoming = bookings.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.date >= today)
    const next = upcoming[0] ?? null

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const thisWeekCount = bookings.filter((b) => b.status !== 'cancelled' && b.date >= weekStart && b.date <= weekEnd).length

    return (
        <ClientShell
            active="home"
            kicker={format(new Date(), 'EEEE d MMMM')}
            title={`Hey ${firstName || 'there'}`}
            blurb={next
                ? `Your next session is ${format(parseISO(next.date), 'EEEE d MMM')} at ${next.start_time.slice(0, 5)}. Here's how things are looking.`
                : "You don't have a session booked yet — head to Book a session to grab an open hour."}
        >
            {loading ? (
                <div className="text-[#14140f]/40 dark:text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : (
                <>
                    {/* Coach status — ClientAuthGuard already blocks the whole
                        page when this is false, so this mostly just confirms
                        the data agrees; it's what the "Coach unavailable"
                        modal is driven by. */}
                    {coach && !coachAvailable && (
                        <div className="mb-4 flex items-center gap-2.5">
                            <span className="text-[13px] text-[#14140f]/60 dark:text-white/55">{coach.name}</span>
                            <StatusPill label="Inactive (Coach Suspended)" tone="bad" />
                        </div>
                    )}

                    {/* Stats row — the one place these numbers live on this page */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard label="Sessions completed" value={String(totals.completed_slots)} accent hint="all time" />
                        <StatCard label="This week" value={String(thisWeekCount)} hint="booked this week" />
                        <StatCard label="Upcoming" value={String(upcoming.length)} hint="sessions ahead" />
                        <StatCard
                            label="Last session"
                            value={totals.last_completed_at ? format(parseISO(totals.last_completed_at), 'd MMM') : '—'}
                            hint="most recent"
                        />
                    </div>

                    {/* What's next — the single clear call to action */}
                    <div className="mt-[22px] bg-[#ccff00] text-[#0a0a0a] rounded-[20px] p-[22px] sm:p-[26px] flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase opacity-70">
                                {next ? `Next session · ${format(parseISO(next.date), 'EEE d MMM')}` : 'No session booked'}
                            </div>
                            <div className="mt-3 font-['Anton'] text-[26px] leading-none tracking-wide uppercase">
                                {next ? `${next.start_time.slice(0, 5)} session` : 'Nothing yet'}
                            </div>
                            <div className="mt-2 font-medium text-[13px] opacity-75">
                                {next ? `with ${coach?.name ?? 'your coach'} · ${statusLabel(next.status)}` : 'Pick an open slot to get going'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(next ? '/client-sessions' : '/client-book')}
                            className="bg-[#0a0a0a] text-[#ccff00] rounded-full px-[22px] py-3 font-semibold text-xs hover:bg-[#1a1a1a] transition-colors flex-none self-start sm:self-auto"
                        >
                            {next ? 'View details' : 'Book a session'}
                        </button>
                    </div>

                    {/* Full upcoming list */}
                    <div className="mt-[22px]">
                        <div className="flex items-center gap-3 mb-3.5">
                            <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-[#14140f]/45 dark:text-white/45">Upcoming sessions</div>
                            <button type="button" onClick={() => navigate('/client-sessions')} className="ml-auto text-[#6f8c00] dark:text-[#ccff00] font-medium text-xs hover:text-[#e2ff5c]">
                                See all
                            </button>
                        </div>
                        {upcoming.length === 0 ? (
                            <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[18px] p-8 text-center">
                                <div className="font-['Anton'] text-xl uppercase tracking-wide">Nothing booked</div>
                                <p className="mt-2 text-[12.5px] text-[#14140f]/45 dark:text-white/45">Grab one of your coach's open hours to get started.</p>
                                <button type="button" onClick={() => navigate('/client-book')} className="mt-4 bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-xs hover:bg-[#e2ff5c] transition-colors">
                                    Book a session
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {upcoming.slice(0, 4).map((b, i) => (
                                    <div key={b.id} className={`grid grid-cols-[80px_1fr_auto] gap-4 items-center bg-[#f7f7f2] dark:bg-[#111] border rounded-[18px] px-[18px] py-[15px] ${i === 0 ? 'border-[#ccff00]' : 'border-[#e2e2d9] dark:border-[#1f1f1f]'}`}>
                                        <div>
                                            <div className="font-['JetBrains_Mono'] text-[10px] tracking-[1.2px] uppercase text-[#14140f]/40 dark:text-white/40">{format(parseISO(b.date), 'EEE d MMM')}</div>
                                            <div className="mt-1 font-['JetBrains_Mono'] text-[15px] text-[#6f8c00] dark:text-[#ccff00]">{b.start_time.slice(0, 5)}</div>
                                        </div>
                                        <div className="min-w-0 text-[13px] text-[#14140f]/60 dark:text-white/60">Session with {coach?.name.split(' ')[0] ?? 'your coach'}</div>
                                        <span className={`text-[10.5px] font-medium rounded-full px-2.5 py-1 ${statusPill(b.status)}`}>{statusLabel(b.status)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </ClientShell>
    )
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
    return (
        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-2xl px-[18px] py-[17px]">
            <div className={`font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase ${accent ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f]/40 dark:text-white/40'}`}>{label}</div>
            <div className="mt-2 font-['Anton'] text-[30px] sm:text-[34px] leading-none tracking-wide">{value}</div>
            <div className="mt-1.5 text-[11.5px] text-[#14140f]/40 dark:text-white/40">{hint}</div>
        </div>
    )
}

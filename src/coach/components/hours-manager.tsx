// src/coach/components/hours-manager.tsx
//
// The coach's hours-management surface: reused both inline on
// /time-slots-management and inside the Drawer opened from the Schedule
// tab. Every coach has the same fixed catalog of 46 one-hour slots (every
// 30 minutes, 00:00-22:30 start) — there's no more "add a custom slot";
// the coach only enables/disables rows from that catalog. Turning one on
// is blocked client-side if it overlaps another enabled slot (and backed
// by a DB trigger, prevent_overlapping_timeslots, as the real guard).
//
// Day-off pills block one specific upcoming calendar date, not the weekday
// forever — see coach_day_off in the schema. Toggling "Monday" off only
// blocks the very next Monday; the Monday after reverts to open on its own.
import * as React from 'react'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Check } from 'lucide-react'

interface Slot {
    id: number
    start_time: string
    end_time: string
    is_available: boolean
}

interface DayPill {
    name: string
    short: string
    date: string
    dateLabel: string
    blocked: boolean
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function overlaps(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }) {
    return a.start_time < b.end_time && a.end_time > b.start_time
}

export default function HoursManager() {
    const [coachId, setCoachId] = React.useState<string | null>(null)
    const [slots, setSlots] = React.useState<Slot[]>([])
    const [dayOffDates, setDayOffDates] = React.useState<Set<string>>(new Set())
    const [loading, setLoading] = React.useState(true)
    const [busySlot, setBusySlot] = React.useState<number | null>(null)
    const [busyDay, setBusyDay] = React.useState<string | null>(null)

    const load = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setCoachId(user.id)

        const today = format(new Date(), 'yyyy-MM-dd')
        const weekOut = format(addDays(new Date(), 6), 'yyyy-MM-dd')

        const [{ data: slotRows }, { data: offRows }] = await Promise.all([
            supabase.from('timeslots').select('id, start_time, end_time, is_available').eq('coach_id', user.id).order('start_time', { ascending: true }),
            supabase.from('coach_day_off').select('off_date').eq('coach_id', user.id).gte('off_date', today).lte('off_date', weekOut),
        ])

        setSlots(slotRows ?? [])
        setDayOffDates(new Set((offRows ?? []).map((r) => r.off_date)))
        setLoading(false)
    }, [])

    React.useEffect(() => { load() }, [load])

    const dayPills: DayPill[] = React.useMemo(() => {
        const today = new Date()
        return DAY_NAMES.map((name) => {
            let next = today
            for (let i = 0; i < 7; i++) {
                const d = addDays(today, i)
                if (format(d, 'EEEE') === name) { next = d; break }
            }
            const date = format(next, 'yyyy-MM-dd')
            return { name, short: name.slice(0, 3), date, dateLabel: format(next, 'd MMM'), blocked: dayOffDates.has(date) }
        })
    }, [dayOffDates])

    const toggleDay = async (pill: DayPill) => {
        if (!coachId) return
        setBusyDay(pill.date)
        if (pill.blocked) {
            const { error } = await supabase.from('coach_day_off').delete().eq('coach_id', coachId).eq('off_date', pill.date)
            setBusyDay(null)
            if (error) {
                toast.error('Could not update', { description: error.message, className: 'toast-error' })
                return
            }
            setDayOffDates((prev) => { const next = new Set(prev); next.delete(pill.date); return next })
            toast.success(`${pill.short} ${pill.dateLabel} is open again`, { className: 'toast-success' })
        } else {
            const { error } = await supabase.from('coach_day_off').insert({ coach_id: coachId, off_date: pill.date })
            setBusyDay(null)
            if (error) {
                toast.error('Could not update', { description: error.message, className: 'toast-error' })
                return
            }
            setDayOffDates((prev) => new Set(prev).add(pill.date))
            toast.success(`${pill.short} ${pill.dateLabel} blocked`, { description: `${pill.short} the week after is open by default.`, className: 'toast-success' })
        }
    }

    const conflictFor = (slot: Slot) => slots.find((s) => s.id !== slot.id && s.is_available && overlaps(slot, s))

    const toggleSlot = async (slot: Slot) => {
        const turningOn = !slot.is_available
        if (turningOn) {
            const conflict = conflictFor(slot)
            if (conflict) {
                toast.warning('Clashes with another open slot', { description: `Turn off ${conflict.start_time.slice(0, 5)} first.`, className: 'toast-warning' })
                return
            }
        }

        setBusySlot(slot.id)
        const { error } = await supabase.from('timeslots').update({ is_available: turningOn }).eq('id', slot.id)
        setBusySlot(null)

        if (error) {
            toast.error('Could not update slot', { description: error.message, className: 'toast-error' })
            return
        }
        setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, is_available: turningOn } : s)))
    }

    if (loading) {
        return <div className="text-white/40 text-sm py-10 text-center">Loading…</div>
    }

    return (
        <div>
            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Days</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {dayPills.map((pill) => (
                    <button
                        key={pill.name}
                        type="button"
                        disabled={busyDay === pill.date}
                        onClick={() => toggleDay(pill)}
                        className="rounded-xl px-3 py-2 text-center border transition-colors disabled:opacity-50"
                        style={pill.blocked
                            ? { background: 'rgba(255,107,82,.1)', borderColor: 'rgba(255,107,82,.35)', color: '#ff6b52' }
                            : { background: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff' }}
                    >
                        <span className="block font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1px] uppercase">{pill.short}</span>
                        <span className="block mt-0.5 text-[10.5px] opacity-70">{pill.blocked ? 'off' : pill.dateLabel}</span>
                    </button>
                ))}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/40">
                Turning a day off blocks only its next date — the week after, it's open again by default.
            </p>

            <div className="mt-6 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Hours</div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-white/40">
                Every session is 1 hour. Turning one on blocks the times right next to it so sessions can't overlap.
            </p>
            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {slots.map((slot) => {
                    const conflict = !slot.is_available ? conflictFor(slot) : undefined
                    const disabled = !!conflict || busySlot === slot.id
                    return (
                        <button
                            key={slot.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleSlot(slot)}
                            title={conflict ? `Clashes with ${conflict.start_time.slice(0, 5)}` : undefined}
                            className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                            style={slot.is_available
                                ? { background: 'rgba(204,255,0,.1)', borderColor: '#ccff00' }
                                : conflict
                                    ? { background: '#141414', borderColor: '#1f1f1f', opacity: 0.45 }
                                    : { background: '#1a1a1a', borderColor: '#2a2a2a' }}
                        >
                            <span
                                className="w-5 h-5 rounded-full border flex items-center justify-center flex-none"
                                style={slot.is_available ? { background: '#ccff00', borderColor: '#ccff00' } : { borderColor: '#3a3a3a' }}
                            >
                                {slot.is_available && <Check className="w-3 h-3 text-[#0a0a0a]" strokeWidth={3} />}
                            </span>
                            <span className="font-['JetBrains_Mono'] text-[12.5px]" style={{ color: slot.is_available ? '#ccff00' : '#fff' }}>
                                {slot.start_time.slice(0, 5)}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

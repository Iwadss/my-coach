// src/pages/client/ClientProgress.tsx
// "Progress" tab — sessions-logged chart and streak, both derived from real
// completed bookings (same query, two views of one dataset — not a
// duplication of each other).
//
// The old "Lifts" and "Weekly check-in" cards were removed. Neither was
// backed by a table: they lived in component state only and reset on every
// reload, despite the check-in's "Saved on this device" toast claiming
// otherwise — nothing was actually saved anywhere, on-device or off. The
// check-in's "Bodyweight (kg)" field was also a straight duplicate of the
// real, persisted weight_kg field already on the client's Settings page —
// two places to enter the same number, only one of which kept it. See
// reminder.md for the full audit.
import * as React from 'react'
import { format, startOfWeek, subWeeks } from 'date-fns'
import supabase from '@/supabase/supabase'
import ClientShell from '@/components/client/client-shell'

interface WeekBucket {
    label: string
    weekStart: string
    count: number
}

export default function ClientProgress() {
    const [weeks, setWeeks] = React.useState<WeekBucket[]>([])
    const [streak, setStreak] = React.useState(0)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const rangeStart = format(startOfWeek(subWeeks(new Date(), 11), { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const { data } = await supabase
                .from('bookings')
                .select('date')
                .eq('client_id', user.id)
                .eq('status', 'completed')
                .gte('date', rangeStart)

            const buckets: WeekBucket[] = Array.from({ length: 12 }, (_, i) => {
                const start = startOfWeek(subWeeks(new Date(), 11 - i), { weekStartsOn: 1 })
                return { label: format(start, 'd MMM'), weekStart: format(start, 'yyyy-MM-dd'), count: 0 }
            })

            for (const row of data ?? []) {
                const rowWeekStart = format(startOfWeek(new Date(row.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
                const bucket = buckets.find((b) => b.weekStart === rowWeekStart)
                if (bucket) bucket.count += 1
            }

            setWeeks(buckets)

            let s = 0
            for (let i = buckets.length - 1; i >= 0; i--) {
                if (buckets[i].count > 0) s += 1
                else break
            }
            setStreak(s)
            setLoading(false)
        }
        load()
    }, [])

    const maxCount = Math.max(1, ...weeks.map((w) => w.count))

    return (
        <ClientShell active="progress" kicker="Tracking" title="Progress" blurb="A real look at your training consistency, pulled straight from your completed sessions.">
            {loading ? (
                <div className="text-[#14140f]/40 dark:text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : (
                <div className="flex flex-col gap-3.5">
                    <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                        <div className="flex items-center gap-3">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Sessions logged</div>
                            <span className="ml-auto text-[11.5px] text-[#14140f]/40 dark:text-white/40">last 12 weeks</span>
                        </div>
                        <div className="mt-4 flex items-end gap-1.5 h-[132px]">
                            {weeks.map((w, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1.5 h-full">
                                    <span
                                        className="w-full rounded-md"
                                        style={{
                                            height: `${(w.count / maxCount) * 100}%`,
                                            minHeight: w.count > 0 ? 6 : 2,
                                            background: i >= weeks.length - 3 ? '#ccff00' : 'rgba(204,255,0,.28)',
                                        }}
                                    />
                                    <span className="font-['JetBrains_Mono'] text-[9px] text-[#14140f]/30 dark:text-white/30">{w.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px] flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="flex-none">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#14140f]/40 dark:text-white/40">Streak</div>
                            <div className="mt-3 flex items-baseline gap-2.5">
                                <span className="font-['Anton'] text-[34px] leading-none text-[#6f8c00] dark:text-[#ccff00]">{streak}</span>
                                <span className="text-xs text-[#14140f]/45 dark:text-white/45 whitespace-nowrap">week{streak === 1 ? '' : 's'} with a completed session</span>
                            </div>
                        </div>
                        <div className="flex-1 flex gap-1.5 min-w-[160px]">
                            {weeks.slice(-9).map((w, i) => (
                                <span key={i} className={`flex-1 h-[22px] rounded-md ${w.count > 0 ? 'bg-[#ccff00]' : 'bg-[#ececdf] dark:bg-[#1a1a1a]'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </ClientShell>
    )
}

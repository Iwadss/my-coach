import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { useAdmin } from '@/components/admin/admin-context'
import AdminPageHeader from '@/components/admin/admin-page-header'
import { EmptyState, SectionToolbar, formatDate, initials } from '@/components/admin/admin-ui'
import { ArrowUpDown } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface Application {
    id: string
    name: string
    email: string
    phone: string | null
    bio: string | null
    applied_at: string
}

export default function AdminCoachApplications() {
    const { query, showFlash, refreshStats, setExportHandler } = useAdmin()
    const [apps, setApps] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [sort, setSort] = useState<'oldest' | 'newest'>('oldest')
    const [actingId, setActingId] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('coaches')
            .select('id, bio, phone, applied_at, profile:profiles!coaches_id_fkey(full_name, email)')
            .eq('status', 'pending')
            .order('applied_at', { ascending: true })

        if (error) {
            toast.error('❌ Failed to load applications', { description: error.message, className: 'toast-error' })
        } else {
            const rows = (data ?? []) as unknown as { id: string; bio: string | null; phone: string | null; applied_at: string; profile: { full_name: string | null; email: string } }[]
            setApps(rows.map((r) => ({ id: r.id, name: r.profile.full_name || r.profile.email, email: r.profile.email, phone: r.phone, bio: r.bio, applied_at: r.applied_at })))
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        let rows = apps
        if (q) rows = rows.filter((a) => [a.name, a.email, a.phone].filter(Boolean).join(' ').toLowerCase().includes(q))
        rows = [...rows].sort((a, b) => sort === 'oldest'
            ? a.applied_at.localeCompare(b.applied_at)
            : b.applied_at.localeCompare(a.applied_at))
        return rows
    }, [apps, query, sort])

    useEffect(() => {
        setExportHandler(() => ({
            rows: visible.map((a) => ({ name: a.name, email: a.email, phone: a.phone ?? '', submitted: a.applied_at })),
            filename: 'coach-applications.csv',
        }))
        return () => setExportHandler(null)
    }, [visible, setExportHandler])

    const sel = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null

    const resolve = async (app: Application, verb: 'approve' | 'reject' | 'info') => {
        if (verb === 'info') {
            const subject = encodeURIComponent('Your MyCoach coach application')
            const body = encodeURIComponent(`Hi ${app.name},\n\nThanks for applying to coach on MyCoach — before we can approve your application we need a bit more information.\n\n`)
            window.location.href = `mailto:${app.email}?subject=${subject}&body=${body}`
            return
        }

        setActingId(app.id)
        const status = verb === 'approve' ? 'approved' : 'rejected'
        const { error } = await supabase.rpc('admin_set_coach_status', { p_coach_id: app.id, p_status: status })
        setActingId(null)

        if (error) {
            toast.error('❌ Could not update application', { description: error.message, className: 'toast-error' })
            return
        }

        setApps((prev) => {
            const rest = prev.filter((a) => a.id !== app.id)
            setSelectedId(rest[0]?.id ?? null)
            return rest
        })
        refreshStats()

        if (status === 'approved') {
            const { data } = await supabase.from('coaches').select('coach_code').eq('id', app.id).single()
            showFlash(`${app.name} approved — coach ID ${data?.coach_code ?? '—'} issued and they can now take clients.`)
        } else {
            showFlash(`${app.name}'s application was rejected. They can reapply any time.`)
        }
    }

    return (
        <div>
            <AdminPageHeader
                kicker="Review queue"
                title="Applications"
                blurb="Approve or reject coaches applying to the platform. Approving issues the four-digit coach ID clients use to link their account."
            />

            <div className="px-6 sm:px-9 pt-7 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-white/45 gap-2">
                        <Spinner className="w-5 h-5" /> Loading applications...
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-[1fr_384px] gap-[22px] items-start">
                        <div>
                            <SectionToolbar>
                                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">
                                    {visible.length} pending
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSort((s) => (s === 'oldest' ? 'newest' : 'oldest'))}
                                    className="ml-auto flex items-center gap-1.5 text-[11.5px] font-medium text-white/50 hover:text-white transition-colors"
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    {sort === 'oldest' ? 'Oldest first' : 'Newest first'}
                                </button>
                            </SectionToolbar>

                            {visible.length === 0 ? (
                                <EmptyState
                                    title="Queue clear"
                                    blurb="Every application has been reviewed. New ones land here the moment a coach finishes signing up."
                                />
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {visible.map((row) => (
                                        <button
                                            key={row.id}
                                            type="button"
                                            onClick={() => setSelectedId(row.id)}
                                            className={`text-left grid grid-cols-[44px_1fr] gap-[15px] items-start bg-[#111] border rounded-[18px] px-[18px] py-4 transition-colors ${row.id === sel?.id ? 'border-[#ccff00]' : 'border-[#1f1f1f] hover:border-[#3a3a3a]'
                                                }`}
                                        >
                                            <span className="w-11 h-11 rounded-[14px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-[13px] text-white/75">
                                                {initials(row.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-[15px]">{row.name}</div>
                                                <div className="mt-[3px] text-[11.5px] text-white/42 truncate">{row.email}</div>
                                                {row.bio && <div className="mt-[9px] text-[12.5px] leading-relaxed text-white/55 line-clamp-2">{row.bio}</div>}
                                                <div className="mt-2.5 font-['JetBrains_Mono'] text-[10.5px] uppercase tracking-[1px] text-white/32">
                                                    Submitted {formatDate(row.applied_at)}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] px-[22px] pt-[22px] pb-6 lg:sticky lg:top-6">
                            {sel ? (
                                <div>
                                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Application review</div>
                                    <div className="mt-3 font-['Anton'] text-[26px] leading-[1.05] tracking-wide uppercase">{sel.name}</div>
                                    <div className="mt-1.5 text-[12.5px] text-white/45">{sel.email}</div>

                                    <div className="mt-[18px] grid grid-cols-2 gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                        <div className="bg-[#111] px-[14px] py-3">
                                            <div className="font-['JetBrains_Mono'] text-[9px] font-medium tracking-[1.2px] uppercase text-white/35">Phone</div>
                                            <div className="mt-1 text-[12.5px]">{sel.phone || 'Not provided'}</div>
                                        </div>
                                        <div className="bg-[#111] px-[14px] py-3">
                                            <div className="font-['JetBrains_Mono'] text-[9px] font-medium tracking-[1.2px] uppercase text-white/35">Submitted</div>
                                            <div className="mt-1 text-[12.5px]">{formatDate(sel.applied_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                        <div className="bg-[#111] px-[14px] py-3 col-span-2">
                                            <div className="font-['JetBrains_Mono'] text-[9px] font-medium tracking-[1.2px] uppercase text-white/35">Coach ID</div>
                                            <div className="mt-1 font-['JetBrains_Mono'] text-[12.5px] tracking-[1.5px] text-[#ccff00]">Assigned automatically on approval</div>
                                        </div>
                                    </div>

                                    <div className="mt-[18px] font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-white/35">Bio submitted</div>
                                    <div className="mt-2 text-[13px] leading-relaxed text-white/72">{sel.bio || 'No bio provided.'}</div>

                                    <div className="mt-[22px] flex flex-col gap-2.5">
                                        <button
                                            type="button"
                                            disabled={actingId === sel.id}
                                            onClick={() => resolve(sel, 'approve')}
                                            className="w-full bg-[#ccff00] text-[#0a0a0a] rounded-full py-[15px] font-semibold text-sm hover:bg-[#e2ff5c] disabled:opacity-50 transition-colors"
                                        >
                                            {actingId === sel.id ? 'Approving…' : 'Approve & issue coach ID'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={actingId === sel.id}
                                            onClick={() => resolve(sel, 'info')}
                                            className="w-full bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-full py-3.5 font-medium text-[13px] hover:border-[#3a3a3a] disabled:opacity-50 transition-colors"
                                        >
                                            Request more information
                                        </button>
                                        <button
                                            type="button"
                                            disabled={actingId === sel.id}
                                            onClick={() => resolve(sel, 'reject')}
                                            className="w-full bg-transparent text-[#ff6b52] py-2.5 font-medium text-[13px] hover:text-[#ff8f7c] disabled:opacity-50 transition-colors"
                                        >
                                            {actingId === sel.id ? 'Rejecting…' : 'Reject application'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Application review</div>
                                    <div className="mt-3 font-['Anton'] text-[22px] leading-[1.1] tracking-wide uppercase">Nothing selected</div>
                                    <div className="mt-2 text-[12.5px] leading-relaxed text-white/45">
                                        Approving a coach issues the four-digit ID their clients use to link an account.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

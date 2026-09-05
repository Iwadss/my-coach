import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { useAdmin } from '@/admin/components/admin-context'
import AdminPageHeader from '@/admin/components/admin-page-header'
import DataTable, { type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState, FilterBar, FilterChip, SectionToolbar, StatusPill, formatDate, initials } from '@/components/shared/ui'
import { GRACE_PERIOD_DAYS } from '@/shared/lib/billing'
import { Ban, RotateCcw, Mail, Phone, User, Award, DollarSign, CalendarCheck2, CreditCard, Users } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type CoachAppStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
type Filter = 'All' | 'Active' | 'Needs attention'
type Tone = 'good' | 'bad' | 'neutral'

interface Billing {
    subscriptionStatus: 'inactive' | 'active'
    subscriptionExpiry: string | null
    lastPaymentAt: string | null
    accessOverride: 'none' | 'granted' | 'blocked'
    overrideReason: string | null
}

interface CoachRow {
    id: string
    coachCode: string | null
    name: string
    email: string
    status: CoachAppStatus
    joined: string
    clients: number
    billing: Billing | null
}

interface LinkedClient {
    id: string
    name: string
    email: string
}

interface CoachDetail extends CoachRow {
    phone: string | null
    bio: string | null
    gender: string | null
    specialty: string | null
    hourlyRate: number | null
    acceptingClients: boolean
    appliedAt: string
    reviewedAt: string | null
    rejectionReason: string | null
    linkedClients: LinkedClient[]
}

// The one place a coach's effective status is decided for display —
// mirrors coach_billing_access_status()'s grace-period math exactly, plus
// the policy-ban (coaches.status) and billing-override cases it doesn't
// need to care about. "Suspended (Payment)" is fully automatic: nothing
// sets it directly, it's just what "past the 5-day grace period" renders as.
function deriveStatus(c: { status: CoachAppStatus; billing: Billing | null }): { label: string; tone: Tone } {
    if (c.status === 'rejected') return { label: 'Rejected', tone: 'neutral' }
    if (c.status === 'pending') return { label: 'Pending', tone: 'neutral' }
    if (c.status === 'suspended') return { label: 'Suspended (Policy)', tone: 'bad' }

    const b = c.billing
    if (!b) return { label: 'Active', tone: 'good' }
    if (b.accessOverride === 'blocked') return { label: 'Suspended (Billing)', tone: 'bad' }
    if (b.accessOverride === 'granted') return { label: 'Active', tone: 'good' }
    if (b.subscriptionStatus === 'active') {
        const pastGrace = b.subscriptionExpiry && new Date(b.subscriptionExpiry).getTime() + GRACE_PERIOD_DAYS * 86400000 < Date.now()
        return pastGrace ? { label: 'Suspended (Payment)', tone: 'bad' } : { label: 'Active', tone: 'good' }
    }
    return { label: 'Inactive', tone: 'neutral' }
}

export default function AdminCoaches() {
    const { query, refreshStats, setExportHandler } = useAdmin()
    const [coaches, setCoaches] = useState<CoachRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<Filter>('All')
    const [actingId, setActingId] = useState<string | null>(null)

    const [detail, setDetail] = useState<CoachDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        const [{ data: coachRows, error }, { data: relRows }, { data: billingRows }] = await Promise.all([
            supabase
                .from('coaches')
                .select('id, status, applied_at, reviewed_at, coach_code, profile:profiles!coaches_id_fkey(full_name, email)')
                .order('applied_at', { ascending: false }),
            supabase.from('coach_clients').select('coach_id').eq('status', 'approved'),
            supabase.from('coach_billing').select('coach_id, subscription_status, subscription_expiry, last_payment_at, access_override, override_reason'),
        ])

        if (error) {
            toast.error('❌ Failed to load coaches', { description: error.message, className: 'toast-error' })
            setLoading(false)
            return
        }

        const clientCounts = new Map<string, number>()
        for (const r of relRows ?? []) clientCounts.set(r.coach_id, (clientCounts.get(r.coach_id) ?? 0) + 1)

        const billingByCoach = new Map<string, Billing>()
        for (const b of billingRows ?? []) {
            billingByCoach.set(b.coach_id, {
                subscriptionStatus: b.subscription_status,
                subscriptionExpiry: b.subscription_expiry,
                lastPaymentAt: b.last_payment_at,
                accessOverride: b.access_override,
                overrideReason: b.override_reason,
            })
        }

        const rows = (coachRows ?? []) as unknown as {
            id: string; status: CoachAppStatus; applied_at: string; reviewed_at: string | null; coach_code: string | null
            profile: { full_name: string | null; email: string }
        }[]

        setCoaches(rows.map((r) => ({
            id: r.id,
            coachCode: r.coach_code,
            name: r.profile.full_name || r.profile.email,
            email: r.profile.email,
            status: r.status,
            joined: r.reviewed_at ?? r.applied_at,
            clients: clientCounts.get(r.id) ?? 0,
            billing: billingByCoach.get(r.id) ?? null,
        })))
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return coaches.filter((c) => {
            if (q && ![c.name, c.email, c.coachCode].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
            if (filter === 'Active') return deriveStatus(c).label === 'Active'
            if (filter === 'Needs attention') return deriveStatus(c).tone === 'bad'
            return true
        })
    }, [coaches, query, filter])

    useEffect(() => {
        setExportHandler(() => ({
            rows: visible.map((c) => ({
                coach_id: c.coachCode ?? '', name: c.name, email: c.email, clients: c.clients,
                status: deriveStatus(c).label, joined: c.joined,
            })),
            filename: 'coaches.csv',
        }))
        return () => setExportHandler(null)
    }, [visible, setExportHandler])

    const openDetail = async (row: CoachRow) => {
        setDetail({ ...row, phone: null, bio: null, gender: null, specialty: null, hourlyRate: null, acceptingClients: true, appliedAt: row.joined, reviewedAt: null, rejectionReason: null, linkedClients: [] })
        setDetailLoading(true)

        const [{ data: coachFull, error }, { data: clientRows }] = await Promise.all([
            supabase.from('coaches').select('phone, bio, gender, specialty, hourly_rate, accepting_clients, applied_at, reviewed_at, rejection_reason').eq('id', row.id).maybeSingle(),
            supabase
                .from('coach_clients')
                .select('client:clients!coach_clients_client_id_fkey(id, full_name, email)')
                .eq('coach_id', row.id)
                .eq('status', 'approved'),
        ])

        setDetailLoading(false)
        if (error || !coachFull) {
            toast.error('❌ Could not load coach details', { description: error?.message, className: 'toast-error' })
            return
        }

        const clients = ((clientRows ?? []) as unknown as { client: { id: string; full_name: string | null; email: string } | null }[])
            .filter((r) => r.client !== null)
            .map((r) => ({ id: r.client!.id, name: r.client!.full_name || r.client!.email, email: r.client!.email }))

        setDetail({
            ...row,
            phone: coachFull.phone,
            bio: coachFull.bio,
            gender: coachFull.gender,
            specialty: coachFull.specialty,
            hourlyRate: coachFull.hourly_rate,
            acceptingClients: coachFull.accepting_clients,
            appliedAt: coachFull.applied_at,
            reviewedAt: coachFull.reviewed_at,
            rejectionReason: coachFull.rejection_reason,
            linkedClients: clients,
        })
    }

    // Ban/unban for policy violations — coaches.status, via
    // admin_set_coach_status(). This also demotes profiles.role away from
    // 'coach' on suspend (and back on reactivate), which is what actually
    // locks the account out platform-wide, not just billing-wise.
    const setStatus = async (coachId: string, status: 'approved' | 'suspended') => {
        setActingId(coachId)
        const { error } = await supabase.rpc('admin_set_coach_status', { p_coach_id: coachId, p_status: status })
        setActingId(null)

        if (error) {
            toast.error('❌ Could not update coach', { description: error.message, className: 'toast-error' })
            return
        }

        toast.success(status === 'suspended' ? '🚫 Coach suspended' : '✅ Coach reactivated', {
            className: status === 'suspended' ? 'toast-delete' : 'toast-success',
        })
        setCoaches((prev) => prev.map((c) => (c.id === coachId ? { ...c, status } : c)))
        setDetail((prev) => (prev && prev.id === coachId ? { ...prev, status } : prev))
        refreshStats()
    }

    const columns: DataTableColumn<CoachRow>[] = [
        { key: 'code', header: 'Coach ID', cellClassName: "font-['JetBrains_Mono'] text-[12.5px] tracking-[1.4px] text-[#ccff00]", render: (c) => c.coachCode ?? '—' },
        {
            key: 'coach', header: 'Coach', render: (c) => (
                <>
                    <div className="font-semibold text-[13px]">{c.name}</div>
                    <div className="mt-[2px] text-[11px] text-white/40">{c.email}</div>
                </>
            ),
        },
        { key: 'clients', header: 'Clients', cellClassName: 'font-medium text-[13px]', render: (c) => c.clients },
        { key: 'status', header: 'Status', render: (c) => <StatusPill {...deriveStatus(c)} /> },
        { key: 'joined', header: 'Joined', cellClassName: 'text-[12.5px] text-white/55', render: (c) => formatDate(c.joined, { month: 'short', year: 'numeric' }) },
    ]

    return (
        <div>
            <AdminPageHeader kicker="Coach directory" title="All coaches" blurb="Every coach account on MyCoach, their client load and subscription status. Click a row for the full detail." />

            <div className="px-6 sm:px-9 pt-7 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-white/45 gap-2">
                        <Spinner className="w-5 h-5" /> Loading coaches...
                    </div>
                ) : (
                    <>
                        <SectionToolbar>
                            <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">{visible.length} accounts</div>
                            <div className="ml-auto">
                                <FilterBar>
                                    <FilterChip active={filter === 'All'} onClick={() => setFilter('All')}>All</FilterChip>
                                    <FilterChip active={filter === 'Active'} onClick={() => setFilter('Active')}>Active</FilterChip>
                                    <FilterChip active={filter === 'Needs attention'} onClick={() => setFilter('Needs attention')}>Needs attention</FilterChip>
                                </FilterBar>
                            </div>
                        </SectionToolbar>

                        {visible.length === 0 ? (
                            <EmptyState title="No coaches" blurb="No coach accounts match this filter yet." />
                        ) : (
                            <DataTable columns={columns} rows={visible} rowKey={(c) => c.id} onRowClick={openDetail} />
                        )}
                    </>
                )}
            </div>

            {/* Coach detail dialog */}
            <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-lg max-h-[85vh] overflow-y-auto">
                    {detail && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3.5">
                                    <span className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-[14px] text-white/75 flex-none">
                                        {initials(detail.name)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide truncate">{detail.name}</DialogTitle>
                                        <DialogDescription className="!text-white/45 truncate">{detail.email}{detail.coachCode ? ` · ${detail.coachCode}` : ''}</DialogDescription>
                                    </div>
                                    <StatusPill {...deriveStatus(detail)} />
                                </div>
                            </DialogHeader>

                            {detailLoading ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-[12.5px]"><Spinner className="w-4 h-4" /> Loading details...</div>
                            ) : (
                                <div className="flex flex-col gap-3.5">
                                    <div className="flex flex-col gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                        <DetailRow icon={Mail} label="Email" value={detail.email} />
                                        <DetailRow icon={Phone} label="Phone" value={detail.phone ?? '—'} />
                                        <DetailRow icon={User} label="Gender" value={detail.gender ? detail.gender.replace('_', ' ') : '—'} capitalize />
                                        <DetailRow icon={Award} label="Specialty" value={detail.specialty ?? '—'} />
                                        <DetailRow icon={DollarSign} label="Hourly rate" value={detail.hourlyRate != null ? `RM${detail.hourlyRate}` : 'Not set'} />
                                        <DetailRow icon={CalendarCheck2} label="Applied" value={formatDate(detail.appliedAt, { day: 'numeric', month: 'short', year: 'numeric' })} />
                                        <DetailRow icon={CalendarCheck2} label="Reviewed" value={detail.reviewedAt ? formatDate(detail.reviewedAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                                        {detail.rejectionReason && <DetailRow icon={Ban} label="Rejection reason" value={detail.rejectionReason} accent />}
                                    </div>

                                    <div className="flex flex-col gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                        <DetailRow icon={CreditCard} label="Subscription" value={detail.billing ? (detail.billing.subscriptionStatus === 'active' ? 'Active' : 'Inactive') : '—'} />
                                        <DetailRow icon={CalendarCheck2} label="Expiry" value={detail.billing?.subscriptionExpiry ? formatDate(detail.billing.subscriptionExpiry, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                                        <DetailRow icon={CalendarCheck2} label="Last payment" value={detail.billing?.lastPaymentAt ? formatDate(detail.billing.lastPaymentAt, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'} />
                                        {detail.billing?.accessOverride !== 'none' && (
                                            <DetailRow icon={Ban} label="Billing override" value={`${detail.billing?.accessOverride}${detail.billing?.overrideReason ? ` — ${detail.billing.overrideReason}` : ''}`} accent />
                                        )}
                                    </div>

                                    <div className="bg-[#141414] border border-[#1f1f1f] rounded-[14px] px-[15px] py-3.5">
                                        <div className="flex items-center gap-2.5 text-[11.5px] text-white/50">
                                            <Users className="w-4 h-4 text-white/35 flex-none" />
                                            Linked clients ({detail.linkedClients.length})
                                        </div>
                                        {detail.linkedClients.length === 0 ? (
                                            <div className="mt-2 text-[12px] text-white/35">No clients linked yet.</div>
                                        ) : (
                                            <div className="mt-2.5 flex flex-col gap-1.5">
                                                {detail.linkedClients.map((cl) => (
                                                    <div key={cl.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                                                        <span className="font-medium truncate">{cl.name}</span>
                                                        <span className="text-white/40 truncate">{cl.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Policy ban — separate from billing; suspending here also revokes the coach role platform-wide (admin_set_coach_status). */}
                                    <div className="flex gap-2">
                                        {detail.status === 'approved' && (
                                            <button
                                                type="button"
                                                disabled={actingId === detail.id}
                                                onClick={() => setStatus(detail.id, 'suspended')}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 font-semibold text-[12.5px] text-[#ff6b52] border border-[rgba(255,107,82,.4)] hover:bg-[rgba(255,107,82,.1)] transition-colors disabled:opacity-50"
                                            >
                                                <Ban className="w-3.5 h-3.5" /> Suspend coach
                                            </button>
                                        )}
                                        {detail.status === 'suspended' && (
                                            <button
                                                type="button"
                                                disabled={actingId === detail.id}
                                                onClick={() => setStatus(detail.id, 'approved')}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#ccff00] text-[#0a0a0a] rounded-full py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" /> Reactivate coach
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

function DetailRow({ icon: Icon, label, value, accent, capitalize }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean; capitalize?: boolean }) {
    return (
        <div className="bg-[#141414] px-[15px] py-3.5 flex items-center gap-3">
            <Icon className="w-4 h-4 text-white/35 flex-none" />
            <span className="text-[11.5px] text-white/50">{label}</span>
            <span className={`ml-auto font-medium text-[12.5px] text-right ${accent ? 'text-[#ff6b52]' : ''} ${capitalize ? 'capitalize' : ''}`}>{value}</span>
        </div>
    )
}

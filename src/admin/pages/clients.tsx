import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { useAdmin } from '@/admin/components/admin-context'
import AdminPageHeader from '@/admin/components/admin-page-header'
import DataTable, { type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState, FilterBar, FilterChip, SectionToolbar, StatusPill, formatDate, initials, timeSince } from '@/components/shared/ui'
import { GRACE_PERIOD_DAYS } from '@/shared/lib/billing'
import { Mail, Phone, Target, User, Ruler, Weight, CalendarCheck2, CheckCircle2, Coins, UserCog } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DetailRow } from '@/shared/components/detail-row'
import { useAdminExport } from '@/admin/components/use-admin-export'

type Filter = 'All' | 'Active' | 'Unlinked'
type Tone = 'good' | 'bad' | 'neutral'
type CoachAppStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

interface CoachBilling {
    subscriptionStatus: 'inactive' | 'active'
    subscriptionExpiry: string | null
    accessOverride: 'none' | 'granted' | 'blocked'
}

interface LinkedCoach {
    id: string
    name: string
    code: string | null
    status: CoachAppStatus
    billing: CoachBilling | null
}

interface Relationship {
    status: 'pending' | 'approved' | 'rejected'
    requested_at: string
    reviewed_at: string | null
    coach: { id: string; coach_code: string | null; status: CoachAppStatus; profile: { full_name: string | null; email: string } } | null
}

interface ClientRow {
    id: string
    name: string
    email: string
    goal: string | null
    joined: string
    coach: LinkedCoach | null
    linkedSince: string | null
    lastSession: string | null
}

interface ClientDetail extends ClientRow {
    phone: string | null
    gender: string | null
    heightCm: number | null
    weightKg: number | null
    tokenBalance: number | null
    tokensIssued: number | null
    completedSlots: number | null
}

function currentRelationship(rows: Relationship[]): Relationship | null {
    if (!rows?.length) return null
    return rows.find((r) => r.status === 'approved') ?? [...rows].sort((a, b) => b.requested_at.localeCompare(a.requested_at))[0]
}

const goalLabel = (goal: string | null) => (goal ? goal.charAt(0).toUpperCase() + goal.slice(1) : 'Not set')

// A client's status strictly follows their coach — if the coach can't
// currently serve clients (policy ban, billing override, or auto-suspended
// past the 5-day grace period; coach_billing_access_status()'s own rule,
// mirrored here), the client is "Inactive (Coach Suspended)" regardless of
// their own account being perfectly fine. Same definition
// client_coach_access_ok() enforces for the client's own ClientAuthGuard.
function deriveClientStatus(coach: LinkedCoach | null): { label: string; tone: Tone } {
    if (!coach) return { label: 'Unlinked', tone: 'neutral' }
    if (coach.status !== 'approved') return { label: 'Inactive (Coach Suspended)', tone: 'bad' }

    const b = coach.billing
    if (b?.accessOverride === 'blocked') return { label: 'Inactive (Coach Suspended)', tone: 'bad' }
    if (b?.accessOverride === 'granted') return { label: 'Active', tone: 'good' }
    if (b?.subscriptionStatus === 'active') {
        const pastGrace = b.subscriptionExpiry && new Date(b.subscriptionExpiry).getTime() + GRACE_PERIOD_DAYS * 86400000 < Date.now()
        return pastGrace ? { label: 'Inactive (Coach Suspended)', tone: 'bad' } : { label: 'Active', tone: 'good' }
    }
    return { label: 'Inactive (Coach Suspended)', tone: 'bad' }
}

export default function AdminClients() {
    const { query } = useAdmin()
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<Filter>('All')

    const [detail, setDetail] = useState<ClientDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            const [{ data, error }, { data: billingRows }] = await Promise.all([
                supabase
                    .from('clients')
                    .select(`
                        id, full_name, email, created_at, goal,
                        coach_clients(status, requested_at, reviewed_at, coach:coaches!coach_clients_coach_id_fkey(id, coach_code, status, profile:profiles!coaches_id_fkey(full_name, email))),
                        client_booking_totals(last_completed_at)
                    `)
                    .order('created_at', { ascending: false }),
                supabase.from('coach_billing').select('coach_id, subscription_status, subscription_expiry, access_override'),
            ])

            if (error) {
                toast.error('❌ Failed to load clients', { description: error.message, className: 'toast-error' })
                setLoading(false)
                return
            }

            const billingByCoach = new Map<string, CoachBilling>()
            for (const b of billingRows ?? []) {
                billingByCoach.set(b.coach_id, { subscriptionStatus: b.subscription_status, subscriptionExpiry: b.subscription_expiry, accessOverride: b.access_override })
            }

            const rows = (data ?? []) as unknown as {
                id: string; full_name: string | null; email: string; created_at: string; goal: string | null
                coach_clients: Relationship[]
                client_booking_totals: { last_completed_at: string | null } | { last_completed_at: string | null }[] | null
            }[]

            setClients(rows.map((c) => {
                const rel = currentRelationship(c.coach_clients)
                const totals = Array.isArray(c.client_booking_totals) ? c.client_booking_totals[0] : c.client_booking_totals
                const coach: LinkedCoach | null = rel?.status === 'approved' && rel.coach ? {
                    id: rel.coach.id,
                    name: rel.coach.profile.full_name || rel.coach.profile.email,
                    code: rel.coach.coach_code,
                    status: rel.coach.status,
                    billing: billingByCoach.get(rel.coach.id) ?? null,
                } : null
                return {
                    id: c.id,
                    name: c.full_name || c.email,
                    email: c.email,
                    goal: c.goal,
                    joined: c.created_at,
                    coach,
                    linkedSince: coach ? (rel?.reviewed_at ?? rel?.requested_at ?? null) : null,
                    lastSession: totals?.last_completed_at ?? null,
                }
            }))
            setLoading(false)
        }
        load()
    }, [])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return clients.filter((c) => {
            if (q && ![c.name, c.email, c.coach?.code].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
            if (filter === 'Active') return deriveClientStatus(c.coach).label === 'Active'
            if (filter === 'Unlinked') return !c.coach
            return true
        })
    }, [clients, query, filter])

    useAdminExport(visible, (c) => ({
        name: c.name, email: c.email, coach: c.coach?.name ?? 'Not linked', coach_id: c.coach?.code ?? '',
        programme: goalLabel(c.goal), joined: c.joined, last_session: c.lastSession ?? 'Never', status: deriveClientStatus(c.coach).label,
    }), 'clients.csv')

    const openDetail = async (row: ClientRow) => {
        setDetail({ ...row, phone: null, gender: null, heightCm: null, weightKg: null, tokenBalance: null, tokensIssued: null, completedSlots: null })
        setDetailLoading(true)

        const [{ data: clientFull, error }, { data: totals }] = await Promise.all([
            supabase.from('clients').select('phone, gender, height_cm, weight_kg, token_balance, tokens_issued_total').eq('id', row.id).maybeSingle(),
            supabase.from('client_booking_totals').select('completed_slots').eq('client_id', row.id).maybeSingle(),
        ])

        setDetailLoading(false)
        if (error || !clientFull) {
            toast.error('❌ Could not load client details', { description: error?.message, className: 'toast-error' })
            return
        }

        setDetail({
            ...row,
            phone: clientFull.phone,
            gender: clientFull.gender,
            heightCm: clientFull.height_cm,
            weightKg: clientFull.weight_kg,
            tokenBalance: clientFull.token_balance,
            tokensIssued: clientFull.tokens_issued_total,
            completedSlots: totals?.completed_slots ?? 0,
        })
    }

    const columns: DataTableColumn<ClientRow>[] = [
        {
            key: 'client', header: 'Client', render: (c) => (
                <>
                    <div className="font-semibold text-[13px]">{c.name}</div>
                    <div className="mt-[2px] text-[11px] text-white/40">{c.email}</div>
                </>
            ),
        },
        { key: 'coach', header: 'Linked coach', cellClassName: 'text-[12.5px] text-white/70', render: (c) => c.coach?.name ?? 'Not linked' },
        { key: 'code', header: 'Coach ID', cellClassName: "font-['JetBrains_Mono'] text-[12.5px] tracking-[1.4px]", render: (c) => <span className={c.coach?.code ? 'text-[#ccff00]' : 'text-white/30'}>{c.coach?.code ?? '—'}</span> },
        { key: 'programme', header: 'Programme', cellClassName: 'text-[12.5px] text-white/70', render: (c) => goalLabel(c.goal) },
        { key: 'joined', header: 'Joined', cellClassName: 'text-[12.5px] text-white/55', render: (c) => formatDate(c.joined, { month: 'short', year: 'numeric' }) },
        { key: 'lastSession', header: 'Last session', cellClassName: 'text-[12.5px] text-white/55', render: (c) => timeSince(c.lastSession) },
        { key: 'status', header: 'Status', render: (c) => <StatusPill {...deriveClientStatus(c.coach)} /> },
    ]

    return (
        <div>
            <AdminPageHeader kicker="Client directory" title="All clients" blurb="Every client account, which coach they're linked to, and when they last trained. Click a row for the full detail." />

            <div className="px-6 sm:px-9 pt-7 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-white/45 gap-2">
                        <Spinner className="w-5 h-5" /> Loading clients...
                    </div>
                ) : (
                    <>
                        <SectionToolbar>
                            <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">{visible.length} accounts</div>
                            <div className="ml-auto">
                                <FilterBar>
                                    <FilterChip active={filter === 'All'} onClick={() => setFilter('All')}>All</FilterChip>
                                    <FilterChip active={filter === 'Active'} onClick={() => setFilter('Active')}>Active</FilterChip>
                                    <FilterChip active={filter === 'Unlinked'} onClick={() => setFilter('Unlinked')}>Unlinked</FilterChip>
                                </FilterBar>
                            </div>
                        </SectionToolbar>

                        {visible.length === 0 ? (
                            <EmptyState title="No clients" blurb="No client accounts match this filter yet." />
                        ) : (
                            <DataTable columns={columns} rows={visible} rowKey={(c) => c.id} onRowClick={openDetail} />
                        )}
                    </>
                )}
            </div>

            {/* Client detail dialog */}
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
                                        <DialogDescription className="!text-white/45 truncate">{detail.email}</DialogDescription>
                                    </div>
                                    <StatusPill {...deriveClientStatus(detail.coach)} />
                                </div>
                            </DialogHeader>

                            {detailLoading ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-[12.5px]"><Spinner className="w-4 h-4" /> Loading details...</div>
                            ) : (
                                <div className="flex flex-col gap-3.5">
                                    <div className="flex flex-col gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                        <DetailRow align="right" icon={Mail} label="Email" value={detail.email} />
                                        <DetailRow align="right" icon={Phone} label="Phone" value={detail.phone ?? '—'} />
                                        <DetailRow align="right" icon={Target} label="Goal" value={goalLabel(detail.goal)} />
                                        <DetailRow align="right" icon={User} label="Gender" value={detail.gender ? detail.gender.replace('_', ' ') : '—'} capitalize />
                                        <DetailRow align="right" icon={Ruler} label="Height" value={detail.heightCm != null ? `${detail.heightCm} cm` : '—'} />
                                        <DetailRow align="right" icon={Weight} label="Weight" value={detail.weightKg != null ? `${detail.weightKg} kg` : '—'} />
                                        <DetailRow align="right" icon={CalendarCheck2} label="Joined" value={formatDate(detail.joined, { day: 'numeric', month: 'short', year: 'numeric' })} />
                                        <DetailRow align="right" icon={CheckCircle2} label="Sessions completed" value={String(detail.completedSlots ?? 0)} tone="good" />
                                        <DetailRow align="right" icon={Coins} label="Token balance" value={`${detail.tokenBalance ?? 0} (${detail.tokensIssued ?? 0} issued total)`} tone={detail.tokenBalance ? 'good' : 'default'} />
                                    </div>

                                    <div className="bg-[#141414] border border-[#1f1f1f] rounded-[14px] px-[15px] py-3.5">
                                        <div className="flex items-center gap-2.5 text-[11.5px] text-white/50">
                                            <UserCog className="w-4 h-4 text-white/35 flex-none" />
                                            Linked coach
                                        </div>
                                        {!detail.coach ? (
                                            <div className="mt-2 text-[12px] text-white/35">Not linked to a coach.</div>
                                        ) : (
                                            <div className="mt-2.5 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-[13px] truncate">{detail.coach.name}</div>
                                                    <div className="mt-[2px] text-[11px] text-white/40">
                                                        {detail.coach.code ?? '—'}
                                                        {detail.linkedSince && ` · linked since ${formatDate(detail.linkedSince, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                        {detail.coach.billing?.subscriptionExpiry && ` · billing expiry ${formatDate(detail.coach.billing.subscriptionExpiry, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                    </div>
                                                </div>
                                                <StatusPill {...deriveClientStatus(detail.coach)} />
                                            </div>
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

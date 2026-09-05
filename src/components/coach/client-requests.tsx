// src/components/coach/client-requests.tsx
// "Requests" tab — clients who entered this coach's ID and are waiting on
// approve/decline, plus the roster of clients already linked to this coach
// (click a name to see their detail). The design's "reschedule requests"
// section is dropped: there's no schema for a client requesting a move —
// a client can only cancel a booking outright (bookings_client_cancel) —
// so that section would only ever render empty.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell, { initials } from '@/components/coach/coach-shell'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Mail, Phone, Target, CalendarCheck2, CheckCircle2, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface PendingRequest {
    id: number
    requestedAt: string
    name: string
    email: string
    phone: string | null
    goal: string | null
}

interface ClientRow {
    clientId: string
    name: string
    email: string
    phone: string | null
    goal: string | null
    linkedSince: string | null
    completedSlots: number
}

export default function ClientRequests() {
    const navigate = useNavigate()
    const [requests, setRequests] = useState<PendingRequest[]>([])
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [actingId, setActingId] = useState<number | null>(null)
    const [acceptingClients, setAcceptingClients] = useState(true)
    const [togglingAccepting, setTogglingAccepting] = useState(false)
    const [selected, setSelected] = useState<ClientRow | null>(null)

    const loadAll = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const [{ data: pendingData, error: pendingError }, { data: approvedData, error: approvedError }, { data: coachRow }] = await Promise.all([
            supabase
                .from('coach_clients')
                .select('id, requested_at, client:clients!coach_clients_client_id_fkey(id, full_name, email, phone, goal)')
                .eq('coach_id', user.id)
                .eq('status', 'pending')
                .order('requested_at', { ascending: true }),
            supabase
                .from('coach_clients')
                .select('reviewed_at, client:clients!coach_clients_client_id_fkey(id, full_name, email, phone, goal)')
                .eq('coach_id', user.id)
                .eq('status', 'approved')
                .order('reviewed_at', { ascending: false }),
            supabase.from('coaches').select('accepting_clients').eq('id', user.id).maybeSingle(),
        ])

        if (coachRow) setAcceptingClients(coachRow.accepting_clients)

        if (pendingError) {
            toast.error('❌ Failed to load requests', { description: pendingError.message, className: 'toast-error' })
        } else {
            const rows = ((pendingData ?? []) as unknown as { id: number; requested_at: string; client: { full_name: string | null; email: string; phone: string | null; goal: string | null } | null }[])
                .filter((r) => r.client !== null)
                .map((r) => ({
                    id: r.id,
                    requestedAt: r.requested_at,
                    name: r.client!.full_name || r.client!.email,
                    email: r.client!.email,
                    phone: r.client!.phone,
                    goal: r.client!.goal,
                }))
            setRequests(rows)
        }

        if (!approvedError) {
            const approvedRows = ((approvedData ?? []) as unknown as { reviewed_at: string | null; client: { id: string; full_name: string | null; email: string; phone: string | null; goal: string | null } | null }[])
                .filter((r) => r.client !== null)

            const ids = approvedRows.map((r) => r.client!.id)
            const totalsByClient = new Map<string, number>()
            if (ids.length > 0) {
                const { data: totals } = await supabase.from('client_booking_totals').select('client_id, completed_slots').in('client_id', ids)
                for (const t of totals ?? []) totalsByClient.set(t.client_id, t.completed_slots)
            }

            setClients(approvedRows.map((r) => ({
                clientId: r.client!.id,
                name: r.client!.full_name || r.client!.email,
                email: r.client!.email,
                phone: r.client!.phone,
                goal: r.client!.goal,
                linkedSince: r.reviewed_at,
                completedSlots: totalsByClient.get(r.client!.id) ?? 0,
            })))
        }

        setLoading(false)
    }

    useEffect(() => { loadAll() }, [])

    // Preview only — the full roster (sorted the same way) lives on
    // client-management.tsx via "See all clients" below. clients.length in
    // the header/sidebar stays the real total, not the length of this slice.
    const topClients = [...clients].sort((a, b) => b.completedSlots - a.completedSlots).slice(0, 5)

    const handleDecision = async (requestId: number, name: string, decision: 'approved' | 'rejected') => {
        setActingId(requestId)
        const { error } = await supabase
            .from('coach_clients')
            .update({ status: decision, reviewed_at: new Date().toISOString() })
            .eq('id', requestId)
        setActingId(null)

        if (error) {
            toast.error('❌ Could not update request', { description: error.message, className: 'toast-error' })
            return
        }
        toast.success(decision === 'approved' ? `✅ ${name} is now your client` : `${name} was declined`, { className: 'toast-success' })
        loadAll()
    }

    // Real column now (accepting_clients on coaches), not local-only state —
    // flipping it off actually blocks new client-side requests, enforced by
    // coach_is_approved() on the insert policy, not just this toggle.
    const handleToggleAccepting = async () => {
        const next = !acceptingClients
        setAcceptingClients(next)
        setTogglingAccepting(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setTogglingAccepting(false); return }

        const { error } = await supabase.from('coaches').update({ accepting_clients: next }).eq('id', user.id)
        setTogglingAccepting(false)

        if (error) {
            setAcceptingClients(!next)
            toast.error('❌ Could not update', { description: error.message, className: 'toast-error' })
            return
        }
        toast.success(next ? '✅ Open to new clients' : '✅ Closed to new clients', { className: 'toast-success' })
    }

    return (
        <CoachShell active="requests" kicker="Inbox" title="Client requests" blurb="People who entered your coach ID and are waiting on a reply, plus everyone already linked to you.">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[22px] items-start">
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45 mb-3.5">
                        New clients · entered your coach ID
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-white/40 text-sm">
                            <Spinner className="w-4 h-4" /> Loading…
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-10 text-center">
                            <div className="font-['Anton'] text-xl uppercase tracking-wide">All caught up</div>
                            <p className="mt-2 text-[12.5px] text-white/45">Share your coach ID to get more requests.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {requests.map((r) => (
                                <div key={r.id} className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-[18px]">
                                    <div className="flex items-start gap-3.5">
                                        <span className="w-[42px] h-[42px] rounded-[13px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-[13px] text-white/75 flex-none">
                                            {initials(r.name)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-[15px]">{r.name}</span>
                                                {r.goal && <span className="text-[10.5px] font-medium bg-[rgba(204,255,0,.12)] text-[#ccff00] rounded-full px-2.5 py-1 capitalize">{r.goal}</span>}
                                            </div>
                                            <div className="mt-1 text-[11.5px] text-white/42">
                                                {r.email} · asked {formatDistanceToNow(parseISO(r.requestedAt), { addSuffix: true })}
                                            </div>
                                            {r.phone && (
                                                <div className="mt-2 text-[11.5px] font-medium bg-white/6 text-white/60 rounded-full px-2.5 py-1 inline-block">{r.phone}</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 flex-none w-[132px]">
                                            <button
                                                type="button"
                                                disabled={actingId === r.id}
                                                onClick={() => handleDecision(r.id, r.name, 'approved')}
                                                className="bg-[#ccff00] text-[#0a0a0a] rounded-full py-2.5 font-semibold text-xs hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actingId === r.id}
                                                onClick={() => handleDecision(r.id, r.name, 'rejected')}
                                                className="bg-transparent border border-[#2a2a2a] text-white/55 rounded-full py-2.5 font-medium text-xs hover:border-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45 mb-3.5">
                        Your clients · {clients.length}
                    </div>
                    {!loading && (
                        clients.length === 0 ? (
                            <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-8 text-center text-white/45 text-[12.5px]">
                                No clients linked yet.
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2">
                                    {topClients.map((c) => (
                                        <button
                                            key={c.clientId}
                                            type="button"
                                            onClick={() => setSelected(c)}
                                            className="flex items-center gap-3.5 bg-[#111] border border-[#1f1f1f] rounded-[16px] px-[16px] py-[13px] text-left hover:border-[#3a3a3a] transition-colors"
                                        >
                                            <span className="w-[38px] h-[38px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-xs text-white/75 flex-none">
                                                {initials(c.name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-[13.5px]">{c.name}</div>
                                                <div className="mt-0.5 text-[11.5px] text-white/42 truncate">{c.email}</div>
                                            </div>
                                            <span className="font-['JetBrains_Mono'] text-[11px] text-white/35 flex-none">{c.completedSlots} done</span>
                                            {c.goal && <span className="text-[10.5px] font-medium bg-white/6 text-white/55 rounded-full px-2.5 py-1 capitalize flex-none">{c.goal}</span>}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/client-management')}
                                    className="mt-2.5 w-full rounded-[16px] py-3 font-medium text-[12.5px] text-white/60 border border-[#1f1f1f] hover:border-[#3a3a3a] hover:text-white transition-colors"
                                >
                                    See all clients
                                </button>
                            </>
                        )
                    )}
                </div>

                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] p-5">
                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Accepting clients</div>
                    <div className="mt-3.5 flex items-center gap-3">
                        <Switch
                            checked={acceptingClients}
                            onCheckedChange={handleToggleAccepting}
                            disabled={togglingAccepting}
                            className="data-[state=checked]:!bg-[#ccff00] data-[state=unchecked]:!bg-[#1f1f1f] focus-visible:!ring-[#ccff00]/50"
                        />
                        <span className="font-medium text-[12.5px] text-white/75">{acceptingClients ? 'Open to new clients' : 'Closed to new clients'}</span>
                    </div>
                    <div className="mt-2.5 text-[11.5px] leading-relaxed text-white/42">
                        {acceptingClients
                            ? "New clients can send requests using your Coach ID. You can turn this off at any time without affecting your pending or existing clients."
                            : "New requests are blocked. Anyone entering your Coach ID will be notified that you are currently unavailable. Existing clients will maintain full access."}
                    </div>
                    <div className="mt-4 h-px bg-[#1f1f1f]" />
                    <div className="mt-4 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-white/40">Active clients</div>
                    <div className="mt-2.5 font-['Anton'] text-[28px] leading-none">{clients.length}</div>
                    <div className="mt-1.5 text-[11.5px] text-white/42">currently linked to you</div>
                </div>
            </div>

            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent showCloseButton={false} className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-md">
                    {selected && (
                        <>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                aria-label="Close"
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <DialogHeader>
                                <div className="flex items-center gap-3.5">
                                    <span className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-[15px] text-white/75 flex-none">
                                        {initials(selected.name)}
                                    </span>
                                    <div>
                                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">{selected.name}</DialogTitle>
                                        <DialogDescription className="!text-white/45">Client detail</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="mt-2 flex flex-col gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-[14px] overflow-hidden">
                                <DetailRow icon={Mail} label="Email" value={selected.email} />
                                <DetailRow icon={Phone} label="Phone" value={selected.phone ?? '—'} />
                                <DetailRow icon={Target} label="Goal" value={selected.goal ?? '—'} capitalize />
                                <DetailRow icon={CalendarCheck2} label="Linked since" value={selected.linkedSince ? format(parseISO(selected.linkedSince), 'd MMM yyyy') : '—'} />
                                <DetailRow icon={CheckCircle2} label="Sessions completed" value={String(selected.completedSlots)} accent />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </CoachShell>
    )
}

function DetailRow({ icon: Icon, label, value, accent, capitalize }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean; capitalize?: boolean }) {
    return (
        <div className="bg-[#141414] px-[15px] py-3.5 flex items-center gap-3">
            <Icon className="w-4 h-4 text-white/35 flex-none" />
            <span className="text-[11.5px] text-white/50">{label}</span>
            <span className={`ml-auto font-medium text-[12.5px] ${accent ? 'text-[#ccff00]' : ''} ${capitalize ? 'capitalize' : ''}`}>{value}</span>
        </div>
    )
}

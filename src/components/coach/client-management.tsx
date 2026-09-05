// src/components/coach/client-management.tsx
// "Clients" full roster — reached via "See all clients" on client-requests.tsx,
// which only shows a top-5-by-sessions preview. Same dark card language as
// the rest of the coach area (bg-[#111]/border-[#1f1f1f] cards, the same
// initials-avatar row and detail-dialog pattern already used on
// client-requests.tsx) — not the old admin-era gradient/light-mode design
// this file used to have, and not the old ClientDetail/ClientEdit modal
// stack (out of scope here: this page is a read-only roster + search).
import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell, { initials } from '@/components/coach/coach-shell'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Search, Mail, Phone, Target, CalendarCheck2, CheckCircle2, Coins, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface ClientRow {
    clientId: string
    name: string
    email: string
    phone: string | null
    goal: string | null
    linkedSince: string | null
    completedSlots: number
    tokenBalance: number
}

export default function ClientManagement() {
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<ClientRow | null>(null)

    // "Adjust tokens" — a small modal nested inside the detail dialog.
    // amount is kept as free text while typing; parsed/validated on submit.
    const [adjustOpen, setAdjustOpen] = useState(false)
    const [adjustAmount, setAdjustAmount] = useState('1')
    const [adjusting, setAdjusting] = useState(false)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const { data, error } = await supabase
                .from('coach_clients')
                .select('reviewed_at, client:clients!coach_clients_client_id_fkey(id, full_name, email, phone, goal, token_balance)')
                .eq('coach_id', user.id)
                .eq('status', 'approved')
                .order('reviewed_at', { ascending: false })

            if (error) {
                toast.error('❌ Failed to load clients', { description: error.message, className: 'toast-error' })
                setLoading(false)
                return
            }

            const rows = ((data ?? []) as unknown as { reviewed_at: string | null; client: { id: string; full_name: string | null; email: string; phone: string | null; goal: string | null; token_balance: number } | null }[])
                .filter((r) => r.client !== null)

            const ids = rows.map((r) => r.client!.id)
            const totalsByClient = new Map<string, number>()
            if (ids.length > 0) {
                const { data: totals } = await supabase.from('client_booking_totals').select('client_id, completed_slots').in('client_id', ids)
                for (const t of totals ?? []) totalsByClient.set(t.client_id, t.completed_slots)
            }

            setClients(
                rows
                    .map((r) => ({
                        clientId: r.client!.id,
                        name: r.client!.full_name || r.client!.email,
                        email: r.client!.email,
                        phone: r.client!.phone,
                        goal: r.client!.goal,
                        linkedSince: r.reviewed_at,
                        completedSlots: totalsByClient.get(r.client!.id) ?? 0,
                        tokenBalance: r.client!.token_balance,
                    }))
                    // Same "most active first" ordering as the preview list on
                    // client-requests.tsx.
                    .sort((a, b) => b.completedSlots - a.completedSlots)
            )
            setLoading(false)
        }
        load()
    }, [])

    const openAdjust = () => {
        setAdjustAmount('1')
        setAdjustOpen(true)
    }

    // direction is +1 for "Add", -1 for "Deduct" — the amount itself is
    // always entered as a positive number.
    const handleAdjustTokens = async (direction: 1 | -1) => {
        if (!selected) return
        const amount = parseInt(adjustAmount, 10)
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('❌ Enter a whole number greater than 0', { className: 'toast-error' })
            return
        }

        setAdjusting(true)
        const { data: newBalance, error } = await supabase.rpc('coach_adjust_client_tokens', {
            p_client_id: selected.clientId,
            p_delta: direction * amount,
        })
        setAdjusting(false)

        if (error) {
            // The DB's own check(token_balance >= 0) is the real backstop —
            // a deduct larger than the current balance lands here.
            toast.error('❌ Could not update tokens', { description: error.message, className: 'toast-error' })
            return
        }

        setClients((prev) => prev.map((c) => (c.clientId === selected.clientId ? { ...c, tokenBalance: newBalance } : c)))
        setSelected((prev) => (prev ? { ...prev, tokenBalance: newBalance } : prev))
        setAdjustOpen(false)
        toast.success(
            direction === 1 ? `✅ Added ${amount} token${amount === 1 ? '' : 's'}` : `✅ Deducted ${amount} token${amount === 1 ? '' : 's'}`,
            { description: `${selected.name} now has ${newBalance} token${newBalance === 1 ? '' : 's'}.`, className: 'toast-success' }
        )
    }

    const filtered = clients.filter((c) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    })

    return (
        <CoachShell active="requests" kicker="Roster" title="Clients" blurb="Everyone currently linked to you, sorted by sessions completed.">
            <div className="flex items-center gap-3 mb-4">
                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">
                    {clients.length} client{clients.length === 1 ? '' : 's'}
                </div>
                <div className="ml-auto relative w-full max-w-[280px]">
                    <Search className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search clients"
                        className="w-full bg-[#141414] border border-[#232323] rounded-full py-[11px] pl-[38px] pr-4 text-[13px] text-white placeholder:text-white/38 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-white/40 text-sm">
                    <Spinner className="w-4 h-4" /> Loading…
                </div>
            ) : clients.length === 0 ? (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-10 text-center">
                    <div className="font-['Anton'] text-xl uppercase tracking-wide">No clients yet</div>
                    <p className="mt-2 text-[12.5px] text-white/45">Share your coach ID to start building your roster.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] p-10 text-center text-white/45 text-[12.5px]">
                    No clients match "{query}".
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {filtered.map((c) => (
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
                                <div className="font-semibold text-[13.5px] truncate">{c.name}</div>
                                <div className="mt-0.5 text-[11.5px] text-white/42 truncate">{c.email}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-none">
                                <span className={`text-[10px] font-medium rounded-full px-2 py-[3px] ${c.tokenBalance > 0 ? 'bg-[rgba(204,255,0,.12)] text-[#ccff00]' : 'bg-[rgba(255,107,82,.14)] text-[#ff6b52]'}`}>
                                    {c.tokenBalance} token{c.tokenBalance === 1 ? '' : 's'}
                                </span>
                                <span className="font-['JetBrains_Mono'] text-[10.5px] text-white/35">{c.completedSlots} done</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Client-detail dialog — same chrome as the one on client-requests.tsx */}
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
                                <DetailRow icon={Coins} label="Token balance" value={String(selected.tokenBalance)} accent={selected.tokenBalance > 0} />
                            </div>

                            <DialogFooter className="gap-2">
                                <button
                                    type="button"
                                    onClick={openAdjust}
                                    className="w-full rounded-full py-2.5 font-semibold text-[12.5px] bg-[#ccff00] text-[#0a0a0a] hover:bg-[#e2ff5c] transition-colors"
                                >
                                    Adjust tokens
                                </button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Deduct tokens — nested modal, opened from the detail dialog
                above. Goes through coach_adjust_client_tokens(), the only
                write path for token_balance — there's no direct column grant
                for it, on either side, so this RPC is the real gate, not
                just this UI. */}
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-sm">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">Adjust tokens</DialogTitle>
                                <DialogDescription className="!text-white/45">
                                    {selected.name} currently has {selected.tokenBalance} token{selected.tokenBalance === 1 ? '' : 's'}.
                                </DialogDescription>
                            </DialogHeader>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[11.5px] text-white/50">Amount</span>
                                <input
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value.replace(/[^\d]/g, ''))}
                                    inputMode="numeric"
                                    placeholder="1"
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[13px] px-4 py-3.5 text-white font-['JetBrains_Mono'] text-lg text-center placeholder:text-white/35 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2"
                                />
                            </label>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-white/60 border border-[#2a2a2a] hover:text-white transition-colors">
                                        Cancel
                                    </button>
                                </DialogClose>
                                <button
                                    type="button"
                                    disabled={adjusting}
                                    onClick={() => handleAdjustTokens(-1)}
                                    className="rounded-full px-5 py-2.5 font-semibold text-[12.5px] text-[#ff6b52] border border-[rgba(255,107,82,.4)] hover:bg-[rgba(255,107,82,.1)] transition-colors disabled:opacity-50"
                                >
                                    − Deduct
                                </button>
                                <button
                                    type="button"
                                    disabled={adjusting}
                                    onClick={() => handleAdjustTokens(1)}
                                    className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                                >
                                    + Add
                                </button>
                            </DialogFooter>
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

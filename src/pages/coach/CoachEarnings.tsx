// src/pages/coach/CoachEarnings.tsx
// "Earnings" tab — built around the token system: there's still no online
// payment collection (same honest call the old version of this page made),
// but tokens themselves are a real, persisted record of what a coach has
// issued (after verifying payment manually) and what's actually been used
// (completed sessions). The "Manage tokens" card is the same Add/Deduct
// action already on client-management.tsx's detail dialog, offered here too
// with its own client picker — useful when a coach is already looking at
// their earnings and wants to act without navigating away.
import * as React from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell from '@/components/coach/coach-shell'
import { Coins } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClientTokenRow {
    clientId: string
    name: string
    issued: number
    used: number
    balance: number
    updatedAt: string
}

// How many rows the main table shows before "See all" is needed.
const TABLE_PREVIEW_COUNT = 5

const TABLE_HEADERS = ['Client', 'Issued', 'Used', 'Balance']

// Shared by the main table and the "See all" dialog's full table, so the
// two never drift into looking like different components.
function TokenTableRow({ c }: { c: ClientTokenRow }) {
    return (
        <tr className="border-b border-[#1a1a1a] last:border-b-0">
            <td className="px-[18px] py-[13px] font-medium text-[13px]">{c.name}</td>
            <td className="px-[18px] py-[13px] font-['JetBrains_Mono'] text-[13px] text-white/70">{c.issued}</td>
            <td className="px-[18px] py-[13px] font-['JetBrains_Mono'] text-[13px] text-[#ccff00]">{c.used}</td>
            <td className="px-[18px] py-[13px] font-['JetBrains_Mono'] text-[13px] text-white/70">{c.balance}</td>
        </tr>
    )
}

export default function CoachEarnings() {
    const [activeClients, setActiveClients] = React.useState(0)
    const [clientRows, setClientRows] = React.useState<ClientTokenRow[]>([])
    const [loading, setLoading] = React.useState(true)

    // "Adjust tokens" dialog — client picker + amount, same
    // coach_adjust_client_tokens() RPC client-management.tsx's per-client
    // dialog already uses, just reachable without navigating there first.
    const [manageOpen, setManageOpen] = React.useState(false)
    const [manageClientId, setManageClientId] = React.useState('')
    const [manageAmount, setManageAmount] = React.useState('1')
    const [managing, setManaging] = React.useState(false)

    // "See all" dialog — the full, scrollable list, only reachable once
    // there's actually more than the main table's preview shows.
    const [seeAllOpen, setSeeAllOpen] = React.useState(false)

    const load = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: relRows } = await supabase
            .from('coach_clients')
            .select('client:clients!coach_clients_client_id_fkey(id, full_name, email, tokens_issued_total, token_balance, updated_at)')
            .eq('coach_id', user.id)
            .eq('status', 'approved')

        const clients = ((relRows ?? []) as unknown as { client: { id: string; full_name: string | null; email: string; tokens_issued_total: number; token_balance: number; updated_at: string } | null }[])
            .map((r) => r.client)
            .filter((c): c is NonNullable<typeof c> => c !== null)

        setActiveClients(clients.length)

        const ids = clients.map((c) => c.id)
        const usedByClient = new Map<string, number>()
        if (ids.length > 0) {
            const { data: totals } = await supabase.from('client_booking_totals').select('client_id, completed_slots').in('client_id', ids)
            for (const t of totals ?? []) usedByClient.set(t.client_id, t.completed_slots)
        }

        const rows = clients.map((c) => ({
            clientId: c.id,
            name: c.full_name || c.email,
            issued: c.tokens_issued_total,
            // 1 token = 1 hour, so a completed session is a "used" token —
            // same completed-session count client-management.tsx and
            // client-requests.tsx already show, just summed for earnings.
            used: usedByClient.get(c.id) ?? 0,
            balance: c.token_balance,
            updatedAt: c.updated_at,
        }))
        // Most recently active client first — updated_at is bumped by every
        // real write that touches token_balance (booking, cancel refund,
        // coach adjust), not by client profile edits, so this genuinely
        // reflects token activity rather than just row-creation order.
        rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        setClientRows(rows)

        setLoading(false)
    }, [])

    React.useEffect(() => { load() }, [load])

    const tokensIssued = clientRows.reduce((sum, c) => sum + c.issued, 0)
    const tokensUsed = clientRows.reduce((sum, c) => sum + c.used, 0)

    // clientRows is already sorted most-recent-first from load(), so this
    // is just "the first 5" — no separate sort needed here.
    const visibleRows = clientRows.slice(0, TABLE_PREVIEW_COUNT)
    const hasMoreClients = clientRows.length > TABLE_PREVIEW_COUNT

    const openManage = () => {
        setManageClientId('')
        setManageAmount('1')
        setManageOpen(true)
    }

    // direction is +1 for "+ Add", -1 for "− Deduct" — each button submits
    // directly rather than just toggling a mode, so there's no separate
    // confirm step.
    const handleManageTokens = async (direction: 1 | -1) => {
        if (!manageClientId) {
            toast.error('❌ Choose a client', { className: 'toast-error' })
            return
        }
        const amount = parseInt(manageAmount, 10)
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('❌ Enter a whole number greater than 0', { className: 'toast-error' })
            return
        }

        setManaging(true)
        const { data: newBalance, error } = await supabase.rpc('coach_adjust_client_tokens', {
            p_client_id: manageClientId,
            p_delta: direction * amount,
        })
        setManaging(false)

        if (error) {
            // The DB's own check(token_balance >= 0) is the real backstop —
            // a deduct larger than the client's balance lands here.
            toast.error('❌ Could not update tokens', { description: error.message, className: 'toast-error' })
            return
        }

        const client = clientRows.find((c) => c.clientId === manageClientId)
        // The RPC just bumped this client's real updated_at server-side too
        // — mirror that here and re-sort, so this adjustment moves the row
        // to the top immediately rather than only after the next reload.
        setClientRows((prev) =>
            prev
                .map((c) => (c.clientId === manageClientId ? { ...c, balance: newBalance, updatedAt: new Date().toISOString() } : c))
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        )
        setManageOpen(false)
        toast.success(
            direction === 1 ? `✅ Added ${amount} token${amount === 1 ? '' : 's'}` : `✅ Deducted ${amount} token${amount === 1 ? '' : 's'}`,
            { description: `${client?.name ?? 'Client'} now has ${newBalance} token${newBalance === 1 ? '' : 's'}.`, className: 'toast-success' }
        )
    }

    return (
        <CoachShell active="earnings" kicker="Money" title="Earnings" blurb="Tokens issued vs used, and a place to manage them directly.">
            {loading ? (
                <div className="text-white/40 text-sm py-10 text-center">Loading…</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[22px] items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-3.5">
                            <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">Tokens by client</div>
                        </div>
                        <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[#141414]">
                                            {TABLE_HEADERS.map((h) => (
                                                <th key={h} className="text-left px-[18px] py-[13px] font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.3px] uppercase text-white/40 border-b border-[#1f1f1f]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRows.map((c) => <TokenTableRow key={c.clientId} c={c} />)}
                                    </tbody>
                                </table>
                            </div>
                            {clientRows.length === 0 && (
                                <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
                                    <span className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-white/35" />
                                    </span>
                                    <div className="text-[13px] font-medium">No clients yet</div>
                                    <p className="text-[12px] text-white/40 max-w-[38ch]">Once clients are linked and you've issued them tokens, their activity shows up here.</p>
                                </div>
                            )}
                            {hasMoreClients && (
                                <button
                                    type="button"
                                    onClick={() => setSeeAllOpen(true)}
                                    className="w-full text-center px-[18px] py-3 font-['JetBrains_Mono'] text-[10.5px] font-medium tracking-[1px] uppercase text-white/50 border-t border-[#1f1f1f] hover:text-[#ccff00] hover:bg-white/[.02] transition-colors"
                                >
                                    See all {clientRows.length} clients
                                </button>
                            )}
                        </div>

                        <div className="mt-3.5 grid grid-cols-2 gap-3">
                            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl px-[18px] py-[17px]">
                                <div className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase text-white/40">Tokens issued</div>
                                <div className="mt-2 font-['Anton'] text-[30px] leading-none">{tokensIssued}</div>
                                <div className="mt-1.5 text-[11.5px] text-white/40">all time, all clients</div>
                            </div>
                            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl px-[18px] py-[17px]">
                                <div className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase text-[#ccff00]">Tokens used / completed</div>
                                <div className="mt-2 font-['Anton'] text-[30px] leading-none text-[#ccff00]">{tokensUsed}</div>
                                <div className="mt-1.5 text-[11.5px] text-white/40">sessions actually delivered</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] p-5">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Manage tokens</div>
                            <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/45">Manually add or deduct tokens for your clients after verifying their payments.</p>
                            <button
                                type="button"
                                onClick={openManage}
                                className="mt-4 w-full bg-[#ccff00] text-[#0a0a0a] rounded-full py-3 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors"
                            >
                                Manage tokens
                            </button>
                        </div>

                        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl px-[18px] py-[17px]">
                            <div className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase text-white/40">Active clients</div>
                            <div className="mt-2 font-['Anton'] text-[30px] leading-none">{activeClients}</div>
                            <div className="mt-1.5 text-[11.5px] text-white/40">currently linked to you</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust tokens — client picker + amount, all in one place
                rather than needing to open a specific client on
                client-management.tsx first. Same coach_adjust_client_tokens()
                RPC either way — this is a second entry point, not a second
                write path. Deduct/Add submit directly instead of toggling a
                mode + separate confirm — one click each. */}
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">Adjust tokens</DialogTitle>
                        <DialogDescription className="!text-white/45">Manually add or deduct tokens for one of your clients.</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3.5">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-[11.5px] text-white/50">Client</span>
                            <Select value={manageClientId} onValueChange={setManageClientId}>
                                <SelectTrigger className="!w-full !h-auto !rounded-[13px] !px-4 !py-3.5 !bg-[#1a1a1a] !border-[#2a2a2a] !text-white !text-[13.5px] data-[placeholder]:!text-white/35">
                                    <SelectValue placeholder="Choose a client" />
                                </SelectTrigger>
                                <SelectContent className="!bg-[#111] !border-[#1f1f1f] !text-white">
                                    {clientRows.map((c) => (
                                        <SelectItem key={c.clientId} value={c.clientId} className="!text-white focus:!bg-[#1f1f1f] focus:!text-white">
                                            {c.name} — {c.balance} token{c.balance === 1 ? '' : 's'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-[11.5px] text-white/50">Amount</span>
                            <input
                                value={manageAmount}
                                onChange={(e) => setManageAmount(e.target.value.replace(/[^\d]/g, ''))}
                                inputMode="numeric"
                                placeholder="1"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[13px] px-4 py-3.5 text-white font-['JetBrains_Mono'] text-lg text-center placeholder:text-white/35 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2"
                            />
                        </label>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-white/60 border border-[#2a2a2a] hover:text-white transition-colors">
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            disabled={managing}
                            onClick={() => handleManageTokens(-1)}
                            className="rounded-full px-5 py-2.5 font-semibold text-[12.5px] text-[#ff6b52] border border-[rgba(255,107,82,.4)] hover:bg-[rgba(255,107,82,.1)] transition-colors disabled:opacity-50"
                        >
                            − Deduct
                        </button>
                        <button
                            type="button"
                            disabled={managing}
                            onClick={() => handleManageTokens(1)}
                            className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                        >
                            + Add
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full, scrollable "Tokens by client" list — same
                TokenTableRow/TABLE_HEADERS the main table uses, just
                unsliced, so this never drifts out of sync with it. Only
                reachable when there's actually more than the preview. */}
            <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">All clients</DialogTitle>
                        <DialogDescription className="!text-white/45">Every client's token activity, most recent first — {clientRows.length} total.</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto rounded-[14px] border border-[#1f1f1f]">
                        <table className="w-full">
                            <thead className="sticky top-0">
                                <tr className="bg-[#141414]">
                                    {TABLE_HEADERS.map((h) => (
                                        <th key={h} className="text-left px-[18px] py-[13px] font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.3px] uppercase text-white/40 border-b border-[#1f1f1f]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {clientRows.map((c) => <TokenTableRow key={c.clientId} c={c} />)}
                            </tbody>
                        </table>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-white/60 border border-[#2a2a2a] hover:text-white transition-colors">
                                Close
                            </button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CoachShell>
    )
}

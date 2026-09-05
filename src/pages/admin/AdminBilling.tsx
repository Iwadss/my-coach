import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { useAdmin } from '@/components/admin/admin-context'
import AdminPageHeader from '@/components/admin/admin-page-header'
import DataTable, { type DataTableColumn } from '@/components/shared/data-table'
import { StatTile } from '@/components/shared/page-header'
import { initials } from '@/components/shared/ui'
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_PRICE_CURRENCY, GRACE_PERIOD_DAYS } from '@/lib/billing'
import { Spinner } from '@/components/ui/spinner'

// Pure financial dashboard — billing is 100% Stripe-automated as of the
// 2026-09-14 migration, so there's nothing here for an admin to review or
// act on. "Active" is derived the same way coach_billing_access_status()
// decides it in the DB: an admin-granted comp counts, an admin-blocked
// override never does, otherwise it's active-and-not-past-grace.
interface CoachBillingRow {
    coachId: string
    accessOverride: 'none' | 'granted' | 'blocked'
    subscriptionStatus: 'inactive' | 'active'
    subscriptionExpiry: string | null
}

// Grace-inclusive — must match coach_billing_access_status() exactly, or
// this page's "active" count disagrees with what CoachAuthGuard/
// ClientAuthGuard actually enforce (a coach in their grace period still has
// full access, so still counts as an active subscription here).
function hasAccess(row: CoachBillingRow): boolean {
    if (row.accessOverride === 'blocked') return false
    if (row.accessOverride === 'granted') return true
    return row.subscriptionStatus === 'active'
        && (!row.subscriptionExpiry || new Date(row.subscriptionExpiry).getTime() + GRACE_PERIOD_DAYS * 86400000 >= Date.now())
}

interface TransactionRow {
    id: string
    coachId: string
    coachCode: string | null
    name: string
    email: string
    amount: number
    currency: string
    createdAt: string
}

export default function AdminBilling() {
    const { query, setExportHandler } = useAdmin()
    const [billing, setBilling] = useState<CoachBillingRow[]>([])
    const [transactions, setTransactions] = useState<TransactionRow[]>([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        const [{ data: billingRows, error: billingError }, { data: txRows, error: txError }] = await Promise.all([
            supabase.from('coach_billing').select('coach_id, access_override, subscription_status, subscription_expiry'),
            supabase
                .from('payment_transactions')
                .select(`
                    id, coach_id, amount, currency, created_at,
                    coach:coaches!payment_transactions_coach_id_fkey(coach_code, profile:profiles!coaches_id_fkey(full_name, email))
                `)
                .order('created_at', { ascending: false })
                .limit(200),
        ])

        const error = billingError || txError
        if (error) {
            toast.error('❌ Failed to load billing', { description: error.message, className: 'toast-error' })
            setLoading(false)
            return
        }

        setBilling((billingRows ?? []).map((r) => ({
            coachId: r.coach_id,
            accessOverride: r.access_override,
            subscriptionStatus: r.subscription_status,
            subscriptionExpiry: r.subscription_expiry,
        })))

        const rawTx = (txRows ?? []) as unknown as {
            id: number; coach_id: string; amount: number; currency: string; created_at: string
            coach: { coach_code: string | null; profile: { full_name: string | null; email: string } } | null
        }[]
        setTransactions(rawTx.map((r) => ({
            id: String(r.id),
            coachId: r.coach_id,
            coachCode: r.coach?.coach_code ?? null,
            name: r.coach?.profile.full_name || r.coach?.profile.email || '—',
            email: r.coach?.profile.email || '',
            amount: r.amount,
            currency: r.currency,
            createdAt: r.created_at,
        })))
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const activeCount = billing.filter(hasAccess).length
    const monthlyRevenue = activeCount * SUBSCRIPTION_PRICE

    const visibleTransactions = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return transactions
        return transactions.filter((t) => [t.name, t.email, t.coachCode].filter(Boolean).join(' ').toLowerCase().includes(q))
    }, [transactions, query])

    useEffect(() => {
        setExportHandler(() => ({
            rows: visibleTransactions.map((t) => ({
                coach_id: t.coachCode ?? '', coach: t.name, email: t.email,
                amount: t.amount, currency: t.currency, date: t.createdAt,
            })),
            filename: 'payment-history.csv',
        }))
        return () => setExportHandler(null)
    }, [visibleTransactions, setExportHandler])

    const columns: DataTableColumn<TransactionRow>[] = [
        {
            key: 'coach', header: 'Coach', render: (t) => (
                <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-xs text-white/75 flex-none">
                        {initials(t.name)}
                    </span>
                    <div className="min-w-0">
                        <div className="font-semibold text-[13px] truncate">{t.name}</div>
                        <div className="mt-[2px] text-[11px] text-white/40 truncate">{t.email}</div>
                    </div>
                </div>
            ),
        },
        { key: 'code', header: 'Coach ID', cellClassName: "font-['JetBrains_Mono'] text-[12.5px] tracking-[1.4px] text-[#ccff00]", render: (t) => t.coachCode ?? '—' },
        {
            key: 'amount', header: 'Amount', cellClassName: "font-['JetBrains_Mono'] text-[13px] text-white/85", render: (t) =>
                `${t.currency === 'MYR' ? SUBSCRIPTION_PRICE_CURRENCY : t.currency} ${t.amount.toFixed(2)}`,
        },
        {
            key: 'date', header: 'Date', cellClassName: 'text-[12.5px] text-white/55', render: (t) =>
                new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
    ]

    return (
        <div>
            <AdminPageHeader
                kicker="Revenue"
                title="Billing"
                blurb="A financial overview. Coaches subscribe and renew automatically through Stripe — there's nothing here for an admin to review or approve."
            />

            <div className="px-6 sm:px-9 pt-7 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-white/45 gap-2">
                        <Spinner className="w-5 h-5" /> Loading billing...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            <StatTile tile={{
                                label: 'Total active subscriptions', value: activeCount,
                                note: `${billing.length} coach${billing.length === 1 ? '' : 'es'} total`, accent: true,
                            }} />
                            <StatTile tile={{
                                label: 'Monthly revenue', value: `${SUBSCRIPTION_PRICE_CURRENCY}${monthlyRevenue.toLocaleString()}`,
                                note: `est. — ${activeCount} × ${SUBSCRIPTION_PRICE_CURRENCY}${SUBSCRIPTION_PRICE}/mo`,
                            }} />
                        </div>

                        <div className="flex items-baseline gap-2.5 mb-3.5">
                            <h2 className="font-['Anton'] text-xl uppercase tracking-wide">Recent transactions</h2>
                            <span className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[1.6px] uppercase text-white/45">{visibleTransactions.length} payments</span>
                        </div>
                        <DataTable
                            columns={columns}
                            rows={visibleTransactions}
                            rowKey={(t) => t.id}
                            emptyTitle="No payments yet"
                            emptyBlurb="Successful Stripe payments log here automatically — nothing to seed or review by hand."
                        />
                    </>
                )}
            </div>
        </div>
    )
}

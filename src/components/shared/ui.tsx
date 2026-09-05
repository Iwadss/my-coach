import type { ReactNode } from 'react'

// Generic CSV row shape — lives here (not in admin-context.tsx) so this
// module has no dependency on any one section; admin-context.tsx imports
// and re-exports it instead, since AdminLayout's export button is what
// actually uses it today.
export type ExportRow = Record<string, string | number>

// Shared visual language for every "console" page across the app — Admin,
// Coach and Client all use this same lime-on-black, Anton/JetBrains Mono/
// Inter styling. Previously duplicated three times (admin-ui.tsx had its
// own initials/StatusPill/table classes, coach-shell.tsx and
// client-shell.tsx each had their own `initials`) — this is the one
// definition; the old locations now just re-export from here so no
// existing import site had to change.

export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', opts)
}

// "Last session" style relative formatting — mirrors the phrasing already
// used in client-management.tsx elsewhere in the app.
export function timeSince(iso: string | null | undefined): string {
    if (!iso) return 'Never'
    const ms = Date.now() - new Date(iso).getTime()
    const day = 86400000
    if (ms < 0) return formatDate(iso)
    if (ms < day) return 'Today'
    if (ms < 2 * day) return 'Yesterday'
    if (ms < 7 * day) return `${Math.floor(ms / day)} days ago`
    if (ms < 30 * day) {
        const weeks = Math.floor(ms / (7 * day))
        return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    }
    return formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })
}

type PillTone = 'good' | 'bad' | 'neutral'

const pillClasses: Record<PillTone, string> = {
    good: 'bg-[rgba(204,255,0,.13)] text-[#ccff00]',
    bad: 'bg-[rgba(255,107,82,.14)] text-[#ff6b52]',
    neutral: 'bg-white/[.06] text-white/60',
}

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
    return (
        <span className={`inline-flex font-medium text-[10.5px] rounded-full px-[10px] py-[4px] whitespace-nowrap ${pillClasses[tone]}`}>
            {label}
        </span>
    )
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-[13px] py-[6px] font-medium text-[11.5px] transition-colors cursor-pointer ${active ? 'bg-[#ccff00] text-[#0a0a0a]' : 'text-white/50 hover:text-white/80'
                }`}
        >
            {children}
        </button>
    )
}

export function FilterBar({ children }: { children: ReactNode }) {
    return <div className="flex bg-[#141414] border border-[#232323] rounded-full p-[3px] gap-0.5">{children}</div>
}

export function SectionToolbar({ children }: { children: ReactNode }) {
    return <div className="flex items-center gap-3 mb-3.5 flex-wrap">{children}</div>
}

export function EmptyState({ title, blurb }: { title: string; blurb: string }) {
    return (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] px-6 py-11 text-center">
            <div className="font-['Anton'] text-2xl leading-none tracking-wide uppercase text-white">{title}</div>
            <div className="mt-2.5 text-[12.5px] leading-relaxed text-white/45 max-w-md mx-auto">{blurb}</div>
        </div>
    )
}

export const th = "text-left px-[18px] py-[13px] font-medium text-[9.5px] tracking-[1.3px] uppercase text-white/40 border-b border-[#1f1f1f] whitespace-nowrap font-['JetBrains_Mono']"
export const td = 'px-[18px] py-[14px] align-top'
export const tableWrap = 'bg-[#111] border border-[#1f1f1f] rounded-[18px] overflow-x-auto'
export const trHover = 'border-b border-[#1a1a1a] last:border-0 hover:bg-white/[.025] transition-colors'

// Real, working CSV download — runs in the deployed app's own browser tab,
// not inside a sandboxed preview, so a plain <a download> click is fine here.
export function downloadCsv(rows: ExportRow[], filename: string) {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const escape = (v: string | number) => {
        const s = String(v ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

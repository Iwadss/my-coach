// Formatting helpers shared across Admin, Coach and Client — pure
// functions, no JSX. Split out of shared/ui.tsx, which mixed these in with
// unrelated UI atoms and table/CSV utilities.

export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', opts)
}

// "Last session" style relative formatting.
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

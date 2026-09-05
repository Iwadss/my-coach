// CSV export — an I/O/side-effect utility, split out of shared/ui.tsx which
// mixed it in with unrelated formatting helpers and UI atoms.

export type ExportRow = Record<string, string | number>

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

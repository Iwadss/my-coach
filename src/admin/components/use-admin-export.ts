import { useEffect } from 'react'
import { useAdmin } from './admin-context'
import type { ExportRow } from '@/components/shared/ui'

// Registers this page's current rows as the CSV the toolbar's "Export CSV"
// button downloads, and clears it again on unmount or when the rows change.
// Previously the same 4-line useEffect duplicated verbatim across every
// admin list page (AdminClients, AdminCoaches, AdminCoachApplications,
// AdminBilling).
//
// `toRow` and `filename` are deliberately not in the dependency array — same
// as the original inline effects, which only ever depended on the row list
// itself. Each is a stable per-page mapping/literal in practice, and
// including an inline arrow function here would re-register on every
// render instead of only when the data actually changes.
export function useAdminExport<T>(rows: T[], toRow: (row: T) => ExportRow, filename: string): void {
    const { setExportHandler } = useAdmin()

    useEffect(() => {
        setExportHandler(() => ({ rows: rows.map(toRow), filename }))
        return () => setExportHandler(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, setExportHandler])
}

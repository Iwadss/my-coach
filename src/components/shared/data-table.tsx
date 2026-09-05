import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState, tableWrap, th, td, trHover } from '@/components/shared/ui'

// Generic, column-driven table — same visual language as the raw
// <table>/th/td markup every admin page (AdminBilling, AdminCoaches,
// AdminClients, AdminCoachApplications) used to hand-roll individually.
// Column definitions carry their own render function, so this works for
// any row shape without the table needing to know about coaches, clients,
// or billing specifically — Coach/Client pages that outgrow a card grid
// can drop this in too.

export interface DataTableColumn<T> {
    key: string
    header: string
    /** Extra classes on the <th> — e.g. a fixed width like "w-[220px]". */
    headerClassName?: string
    /** Extra classes on every <td> in this column. */
    cellClassName?: string
    render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[]
    rows: T[]
    rowKey: (row: T) => string
    loading?: boolean
    loadingLabel?: string
    emptyTitle?: string
    emptyBlurb?: string
    onRowClick?: (row: T) => void
    /** Extra classes on a given row, e.g. to flag one that needs attention. */
    rowClassName?: (row: T) => string
}

export default function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading = false,
    loadingLabel = 'Loading…',
    emptyTitle = 'Nothing here yet',
    emptyBlurb = 'No records match yet.',
    onRowClick,
    rowClassName,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-white/45 gap-2">
                <Spinner className="w-5 h-5" /> {loadingLabel}
            </div>
        )
    }

    if (rows.length === 0) {
        return <EmptyState title={emptyTitle} blurb={emptyBlurb} />
    }

    return (
        <div className={tableWrap}>
            <table className="w-full">
                <thead>
                    <tr className="bg-[#141414]">
                        {columns.map((col) => (
                            <th key={col.key} className={`${th} ${col.headerClassName ?? ''}`}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={rowKey(row)}
                            className={`${trHover} ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(row) ?? ''}`}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className={`${td} ${col.cellClassName ?? ''}`}>
                                    {col.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

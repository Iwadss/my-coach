import { createContext, useContext } from 'react'
import type { ExportRow } from '@/components/shared/ui'

export type { ExportRow }

export interface AdminStats {
    pendingApplications: number
    activeCoaches: number
    totalCoaches: number
    activeClients: number
    unlinkedClients: number
    totalClients: number
    suspendedCoaches: number
}

export type ExportHandler = () => { rows: ExportRow[]; filename: string } | null

export interface AdminContextValue {
    query: string
    setQuery: (q: string) => void
    stats: AdminStats | null
    refreshStats: () => void
    flash: string | null
    showFlash: (msg: string) => void
    dismissFlash: () => void
    setExportHandler: (fn: ExportHandler | null) => void
}

export const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin(): AdminContextValue {
    const ctx = useContext(AdminContext)
    if (!ctx) throw new Error('useAdmin must be used within AdminLayout')
    return ctx
}

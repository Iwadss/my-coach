import { useState } from 'react'

// The "stub row immediately, fetch the rest, merge" state machine behind
// every admin detail dialog — previously duplicated (identical shape, not
// identical fields) in AdminClients' and AdminCoaches' own openDetail
// functions.
//
// `fetchExtra` owns its own error toast and returns null on failure — the
// hook then leaves `detail` exactly as the stub, matching the original
// behavior of both pages: the dialog stays open showing the stub (never
// closes itself on a failed fetch), just with `detailLoading` turned back
// off.
export function useDetailLoader<Row, Detail extends Row>() {
    const [detail, setDetail] = useState<Detail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const openDetail = async (
        row: Row,
        stub: Omit<Detail, keyof Row>,
        fetchExtra: () => Promise<Omit<Detail, keyof Row> | null>
    ) => {
        setDetail({ ...row, ...stub } as Detail)
        setDetailLoading(true)
        const extra = await fetchExtra()
        setDetailLoading(false)
        if (extra) setDetail({ ...row, ...extra } as Detail)
    }

    return { detail, setDetail, detailLoading, openDetail }
}

import { useAdmin } from './admin-context'
import PageHeader, { type PageHeaderTile } from '@/components/shared/page-header'

interface Props {
    kicker: string
    title: string
    blurb: string
}

// Admin's page header — the shared <PageHeader> plus the 4-tile stat strip
// every admin tab renders above its own content, driven off the same live
// counts (see admin-layout.tsx's loadStats). Kept as its own component
// (rather than every admin page building the tiles array itself) since
// these 4 tiles are identical across every admin tab.
export default function AdminPageHeader({ kicker, title, blurb }: Props) {
    const { stats } = useAdmin()

    const tiles: PageHeaderTile[] = [
        {
            label: 'Pending applications',
            value: stats?.pendingApplications ?? '—',
            note: stats ? (stats.pendingApplications ? `${stats.pendingApplications} awaiting review` : 'queue clear') : '',
            accent: true,
        },
        {
            label: 'Active coaches',
            value: stats?.activeCoaches ?? '—',
            note: stats ? `${stats.totalCoaches - stats.activeCoaches} suspended, pending or rejected` : '',
        },
        {
            label: 'Active clients',
            value: stats?.activeClients ?? '—',
            note: stats ? `${stats.unlinkedClients} not yet linked to a coach` : '',
        },
        {
            label: 'Suspended coaches',
            value: stats?.suspendedCoaches ?? '—',
            note: 'policy ban or payment overdue',
        },
    ]

    return <PageHeader kicker={kicker} title={title} blurb={blurb} tiles={tiles} theme="dark" />
}

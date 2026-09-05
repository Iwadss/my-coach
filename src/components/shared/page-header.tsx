import type { ReactNode } from 'react'

// Shared "kicker / Anton title / blurb (+ optional stat tiles)" page header
// — previously hand-rolled three times with near-identical markup:
// admin-page-header.tsx (fixed-dark, always with its 4 admin stat tiles),
// coach-shell.tsx (fixed-dark, no tiles), and client-shell.tsx (light/dark
// theme-aware, no tiles). All three now render this component; see each
// file for how it's wired in.

export interface PageHeaderTile {
    label: string
    value: number | string
    note?: string
    /** Lime-accented label — used for the one tile that most wants the
     * admin's eye, e.g. "Pending applications" / "Pending verifications". */
    accent?: boolean
}

/** 'dark' = fixed-dark regardless of the app's theme toggle (Admin, Coach).
 *  'auto' = follows the light/dark toggle (Client). */
export type PageHeaderTheme = 'dark' | 'auto'

interface ToneSet {
    kicker: string
    title: string
    blurb: string
    tileWrap: string
    tileLabel: string
    tileLabelAccent: string
    tileValue: string
    tileNote: string
}

const tones: Record<PageHeaderTheme, ToneSet> = {
    dark: {
        kicker: 'text-[#ccff00]',
        title: 'text-white',
        blurb: 'text-white/45',
        tileWrap: 'bg-[#111] border-[#1f1f1f]',
        tileLabel: 'text-white/40',
        tileLabelAccent: 'text-[#ccff00]',
        tileValue: 'text-white',
        tileNote: 'text-white/40',
    },
    auto: {
        kicker: 'text-[#6f8c00] dark:text-[#ccff00]',
        title: 'text-[#14140f] dark:text-white',
        blurb: 'text-[#14140f]/45 dark:text-white/45',
        tileWrap: 'bg-white dark:bg-[#111] border-[#e2e2d9] dark:border-[#1f1f1f]',
        tileLabel: 'text-[#14140f]/40 dark:text-white/40',
        tileLabelAccent: 'text-[#6f8c00] dark:text-[#ccff00]',
        tileValue: 'text-[#14140f] dark:text-white',
        tileNote: 'text-[#14140f]/40 dark:text-white/40',
    },
}

// Exported so a page can drop the exact same tile look outside the header
// itself — AdminBilling.tsx uses this for its billing-specific summary row,
// which sits below the header rather than inside it.
export function StatTile({ tile, theme = 'dark' }: { tile: PageHeaderTile; theme?: PageHeaderTheme }) {
    const t = tones[theme]
    return (
        <div className={`${t.tileWrap} border rounded-2xl px-[18px] py-[17px] min-w-0`}>
            <div className={`font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.5px] uppercase truncate ${tile.accent ? t.tileLabelAccent : t.tileLabel}`}>
                {tile.label}
            </div>
            <div className={`mt-2 font-['Anton'] text-[30px] sm:text-[34px] leading-none tracking-wide ${t.tileValue}`}>{tile.value}</div>
            {tile.note && <div className={`mt-1.5 text-[11.5px] truncate ${t.tileNote}`}>{tile.note}</div>}
        </div>
    )
}

export interface PageHeaderProps {
    kicker: string
    title: string
    blurb?: string
    /** Optional stat-tile row rendered below the blurb (Admin's 4-tile strip). */
    tiles?: PageHeaderTile[]
    /** Optional right-aligned slot next to the title (a date, a button). */
    actions?: ReactNode
    theme?: PageHeaderTheme
    /** Outer wrapper padding — each shell's top bar already sets its own
     * horizontal rhythm, so this is left overridable rather than baked in. */
    className?: string
}

export default function PageHeader({
    kicker,
    title,
    blurb,
    tiles,
    actions,
    theme = 'dark',
    className = 'px-6 sm:px-9 pt-7 sm:pt-8',
}: PageHeaderProps) {
    const t = tones[theme]

    return (
        <div className={className}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className={`font-['JetBrains_Mono'] text-[10px] font-medium tracking-[2px] uppercase ${t.kicker}`}>{kicker}</div>
                    <div className={`mt-2.5 font-['Anton'] text-[32px] sm:text-[40px] leading-none tracking-wide uppercase ${t.title}`}>{title}</div>
                </div>
                {actions && <div className="flex-none">{actions}</div>}
            </div>
            {blurb && <div className={`mt-2 text-[13px] leading-relaxed max-w-[64ch] ${t.blurb}`}>{blurb}</div>}

            {tiles && tiles.length > 0 && (
                <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {tiles.map((tile) => (
                        <StatTile key={tile.label} tile={tile} theme={theme} />
                    ))}
                </div>
            )}
        </div>
    )
}

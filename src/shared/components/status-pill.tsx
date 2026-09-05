// Split out of shared/ui.tsx's grab-bag. Shared visual language for every
// "console" page across Admin, Coach and Client.

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

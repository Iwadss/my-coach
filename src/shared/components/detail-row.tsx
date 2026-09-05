import type { ComponentType } from 'react'

interface DetailRowProps {
    icon: ComponentType<{ className?: string }>
    label: string
    value: string
    /** default: no color. 'good' = lime (positive). 'bad' = red (danger/rejected). */
    tone?: 'default' | 'good' | 'bad'
    capitalize?: boolean
    /** Admin's detail dialogs right-align the value; the coach portal's don't. */
    align?: 'left' | 'right'
}

// One row in a detail dialog: icon, label, value. Previously duplicated
// (near-verbatim) across 5 files — AdminClients, AdminCoaches,
// client-management, client-requests, CoachSchedule — with a real latent
// bug baked into the copy-paste: a boolean `accent`/`accentGood` prop meant
// "positive/lime" in three of those files and "danger/red" in a fourth,
// same prop name, opposite meaning. `tone` names the actual colors instead
// of overloading one flag.
export function DetailRow({ icon: Icon, label, value, tone = 'default', capitalize, align = 'left' }: DetailRowProps) {
    return (
        <div className="bg-[#141414] px-[15px] py-3.5 flex items-center gap-3">
            <Icon className="w-4 h-4 text-white/35 flex-none" />
            <span className="text-[11.5px] text-white/50">{label}</span>
            <span
                className={[
                    'ml-auto font-medium text-[12.5px]',
                    align === 'right' ? 'text-right' : '',
                    tone === 'good' ? 'text-[#ccff00]' : '',
                    tone === 'bad' ? 'text-[#ff6b52]' : '',
                    capitalize ? 'capitalize' : '',
                ].filter(Boolean).join(' ')}
            >
                {value}
            </span>
        </div>
    )
}

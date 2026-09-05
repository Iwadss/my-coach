import { useSidebar } from '@/components/ui/sidebar'
import { initials } from '@/shared/lib/format'

interface PortalSelfCardProps {
    /** null while the profile is still loading — shows a placeholder avatar/name. */
    name: string | null
    subtitle: string
    /** Client's subtitle is a training goal ("lean body" -> "Lean Body"); coach's is a client count that must NOT be capitalized. */
    capitalizeSubtitle?: boolean
    onClick: () => void
    theme: 'coach' | 'client'
}

// The sidebar-footer profile card that doubles as the only way into the
// portal's Settings page (there's no nav item for it — see each shell's own
// Tab comment). Previously duplicated identically in coach-shell.tsx and
// client-shell.tsx bar the card's background color and whether the subtitle
// capitalizes.
export function PortalSelfCard({ name, subtitle, capitalizeSubtitle, onClick, theme }: PortalSelfCardProps) {
    const { setOpenMobile } = useSidebar()

    const handleClick = () => {
        setOpenMobile(false)
        onClick()
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick()
                }
            }}
            className={`text-left w-full flex items-center gap-[11px] border rounded-2xl px-[13px] py-3 cursor-pointer hover:border-[#ccff00]/40 transition-colors ${theme === 'coach' ? 'bg-[#141414] border-[#232323]' : 'bg-[#ececdf] dark:bg-[#141414] border-[#e2e2d9] dark:border-[#232323]'
                }`}
        >
            <span className="w-[34px] h-[34px] rounded-[11px] bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center font-semibold text-xs flex-none">
                {name ? initials(name) : '··'}
            </span>
            <span className="flex flex-col min-w-0">
                <span className="font-medium text-[12.5px] truncate">{name ?? 'Loading…'}</span>
                <span className={`text-[11px] truncate ${capitalizeSubtitle ? 'capitalize' : ''} ${theme === 'coach' ? 'text-white/42' : 'text-[#14140f]/42 dark:text-white/42'}`}>
                    {subtitle}
                </span>
            </span>
        </div>
    )
}

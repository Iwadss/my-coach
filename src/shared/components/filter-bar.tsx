import type { ReactNode } from 'react'

// Split out of shared/ui.tsx's grab-bag. The filter-chip row used above
// every admin data table, and the toolbar layout that positions it.

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-[13px] py-[6px] font-medium text-[11.5px] transition-colors cursor-pointer ${active ? 'bg-[#ccff00] text-[#0a0a0a]' : 'text-white/50 hover:text-white/80'
                }`}
        >
            {children}
        </button>
    )
}

export function FilterBar({ children }: { children: ReactNode }) {
    return <div className="flex bg-[#141414] border border-[#232323] rounded-full p-[3px] gap-0.5">{children}</div>
}

export function SectionToolbar({ children }: { children: ReactNode }) {
    return <div className="flex items-center gap-3 mb-3.5 flex-wrap">{children}</div>
}

// Split out of shared/ui.tsx's grab-bag.

export function EmptyState({ title, blurb }: { title: string; blurb: string }) {
    return (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-[18px] px-6 py-11 text-center">
            <div className="font-['Anton'] text-2xl leading-none tracking-wide uppercase text-white">{title}</div>
            <div className="mt-2.5 text-[12.5px] leading-relaxed text-white/45 max-w-md mx-auto">{blurb}</div>
        </div>
    )
}

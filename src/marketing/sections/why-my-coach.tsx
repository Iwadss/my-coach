import { Plus, Minus } from 'lucide-react'

const points = [
    {
        title: 'Approved coaches only',
        body: 'Every coach is reviewed and approved by an admin before a single client can attach to them.',
        openByDefault: true,
    },
    {
        title: 'One dashboard, both sides',
        body: 'Clients see plans and progress; coaches see rosters, slots and billing — the same source of truth.',
    },
    {
        title: 'Slots that respect real life',
        body: 'Coaches publish their own availability, so nothing gets double-booked and nobody chases a reply.',
    },
    {
        title: 'Progress you can prove',
        body: "Every session logged builds a record both of you can read — not a feeling about how it's going.",
    },
]

export default function WhyMyCoach() {
    return (
        <div id="mc-why" className="px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 bg-white dark:bg-[#0a0a0a]">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                <div className="h-[300px] lg:h-[520px] rounded-[22px] overflow-hidden bg-[#f0f0e9] dark:bg-[#141414] flex items-center justify-center">
                    <span className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.5px] uppercase text-[#14140f]/35 dark:text-white/30 text-center px-6">
                        Photo — coach spotting a client
                    </span>
                </div>
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ Why MyCoach</div>
                    <h2 className="mt-4 font-['Anton'] text-[34px] sm:text-[44px] lg:text-[52px] leading-[0.98] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Built around the<br />coach, not the app
                    </h2>
                    <div className="mt-8 flex flex-col gap-3">
                        {points.map((point) => (
                            <details key={point.title} open={point.openByDefault} className="group rounded-2xl open:bg-[#ccff00] bg-white dark:bg-[#111] open:border-0 border border-[#e2e2d9] dark:border-[#1f1f1f] px-6 py-5">
                                <summary className="flex items-center justify-between gap-4 font-['Anton'] text-[20px] sm:text-[22px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white group-open:text-[#0a0a0a] cursor-pointer list-none">
                                    {point.title}
                                    <Plus className="w-[18px] h-[18px] shrink-0 group-open:hidden text-[#6f8c00] dark:text-[#ccff00]" strokeWidth={2.2} />
                                    <Minus className="w-[18px] h-[18px] shrink-0 hidden group-open:block text-[#0a0a0a]" strokeWidth={2.2} />
                                </summary>
                                <p className="mt-3.5 text-[14px] leading-relaxed text-[#14140f]/55 dark:text-white/55 group-open:text-[#0a0a0a]/68">
                                    {point.body}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

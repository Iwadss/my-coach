// Sample roster from the design mockup — illustrative, not real coach
// accounts. Real coaches (and their real assigned coach_code) show up via
// the coach_directory once approved; this is marketing-page dressing.
const coaches = [
    { name: 'Marvin Okoye', specialty: 'Strength · 6 yrs', code: '4812' },
    { name: 'Jacob Reyes', specialty: 'Conditioning · 4 yrs', code: '2207' },
    { name: 'Arlene McCoy', specialty: 'Mobility · 8 yrs', code: '9034' },
]

export default function Coaches() {
    return (
        <div id="mc-coaches" className="px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 bg-white dark:bg-[#0a0a0a]">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ Our coaches</div>
                    <h2 className="mt-4 font-['Anton'] text-[34px] sm:text-[44px] lg:text-[52px] leading-[0.98] tracking-wide uppercase text-[#14140f] dark:text-white">Approved. Accountable.</h2>
                </div>
                <p className="max-w-[340px] text-[14.5px] leading-relaxed text-[#14140f]/55 dark:text-white/55">
                    Every coach clears a review before they can take a single client.
                </p>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {coaches.map((c) => (
                    <div key={c.code} className="bg-white dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-5 flex flex-col gap-5">
                        <div className="h-[220px] lg:h-[300px] rounded-[14px] overflow-hidden bg-[#f0f0e9] dark:bg-[#181818] flex items-center justify-center">
                            <span className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-[#14140f]/30 dark:text-white/25">Coach portrait</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-['Anton'] text-[24px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">{c.name}</div>
                                <div className="mt-2.5 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.4px] uppercase text-[#14140f]/45 dark:text-white/45">{c.specialty}</div>
                            </div>
                            <span className="px-3 py-[7px] rounded-full bg-[#ccff00]/14 dark:bg-[#ccff00]/14 text-[#6f8c00] dark:text-[#ccff00] font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.2px] uppercase whitespace-nowrap">
                                ID {c.code}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

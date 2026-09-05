import { UserPlus, IdCard, CalendarCheck } from 'lucide-react'

const codeDigits = ['4', '8', '1', '2']

export default function HowItWorks() {
    return (
        <div id="mc-how" className="px-6 sm:px-10 lg:px-16 py-16 lg:py-24 bg-white dark:bg-[#0a0a0a]">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ How it works</div>
                    <h2 className="mt-4 font-['Anton'] text-[36px] sm:text-[48px] lg:text-[56px] leading-[0.95] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Three steps<br />to your first session
                    </h2>
                </div>
                <p className="max-w-[360px] text-[14.5px] leading-relaxed text-[#14140f]/55 dark:text-white/55">
                    No coach shopping, no cold matching. Your coach gives you a 4-digit ID and you land straight in their roster.
                </p>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Step 1 */}
                <div className="bg-white dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-8 flex flex-col gap-4.5 min-h-[250px]">
                    <div className="flex items-center justify-between">
                        <span className="font-['Anton'] text-[34px] leading-none text-[#d8d8cd] dark:text-[#2f2f2f]">01</span>
                        <span className="w-[42px] h-[42px] rounded-xl bg-[#f0f0e9] dark:bg-[#1c1c1c] flex items-center justify-center text-[#6f8c00] dark:text-[#ccff00]">
                            <UserPlus className="w-5 h-5" strokeWidth={1.8} />
                        </span>
                    </div>
                    <div className="font-['Anton'] text-[26px] leading-[1.05] tracking-wide uppercase text-[#14140f] dark:text-white">Create your account</div>
                    <p className="text-[14px] leading-relaxed text-[#14140f]/55 dark:text-white/55">Email and password, thirty seconds. No card until your trial ends.</p>
                </div>

                {/* Step 2 — featured */}
                <div className="bg-[#ccff00] rounded-[20px] p-8 flex flex-col gap-4.5 min-h-[250px] text-[#0a0a0a]">
                    <div className="flex items-center justify-between">
                        <span className="font-['Anton'] text-[34px] leading-none text-[#0a0a0a]/35">02</span>
                        <span className="w-[42px] h-[42px] rounded-xl bg-[#0a0a0a]/12 flex items-center justify-center text-[#0a0a0a]">
                            <IdCard className="w-5 h-5" strokeWidth={1.8} />
                        </span>
                    </div>
                    <div className="font-['Anton'] text-[26px] leading-[1.05] tracking-wide uppercase">Enter your coach ID</div>
                    <p className="text-[14px] leading-relaxed text-[#0a0a0a]/66">Four digits from your coach attaches you to their roster instantly.</p>
                    <div className="mt-auto flex gap-2">
                        {codeDigits.map((d, i) => (
                            <span key={i} className="w-11 h-13 rounded-[10px] bg-[#0a0a0a] text-[#ccff00] flex items-center justify-center font-['JetBrains_Mono'] text-[22px] font-medium">
                                {d}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-8 flex flex-col gap-4.5 min-h-[250px]">
                    <div className="flex items-center justify-between">
                        <span className="font-['Anton'] text-[34px] leading-none text-[#d8d8cd] dark:text-[#2f2f2f]">03</span>
                        <span className="w-[42px] h-[42px] rounded-xl bg-[#f0f0e9] dark:bg-[#1c1c1c] flex items-center justify-center text-[#6f8c00] dark:text-[#ccff00]">
                            <CalendarCheck className="w-5 h-5" strokeWidth={1.8} />
                        </span>
                    </div>
                    <div className="font-['Anton'] text-[26px] leading-[1.05] tracking-wide uppercase text-[#14140f] dark:text-white">Book and track</div>
                    <p className="text-[14px] leading-relaxed text-[#14140f]/55 dark:text-white/55">Pick a slot from their calendar, then watch progress build session by session.</p>
                </div>
            </div>
        </div>
    )
}

import { CalendarCheck } from 'lucide-react'

export default function Results() {
    return (
        <div id="mc-booking" className="px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 bg-white dark:bg-[#0a0a0a]">
            <div className="relative h-[440px] lg:h-[520px] rounded-[24px] overflow-hidden bg-[#f0f0e9] dark:bg-[#141414]">
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.5px] uppercase text-[#14140f]/30 dark:text-white/25">Photo — coach &amp; client session</span>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.85),rgba(255,255,255,.1)_70%)] dark:bg-[linear-gradient(90deg,rgba(6,6,6,.9),rgba(6,6,6,.15)_70%)] pointer-events-none" />
                <div className="absolute left-6 top-6 sm:left-[52px] sm:top-[52px] font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ How booking works</div>
                {/* This card stays light regardless of theme — a deliberate light accent floating on the photo, same treatment as the design gave it */}
                <div className="absolute left-4 right-4 bottom-4 sm:left-[52px] sm:right-auto sm:bottom-[52px] w-auto sm:w-[420px] bg-[#f7f7f2] text-[#14140f] rounded-[20px] p-6 sm:p-7">
                    <div className="flex items-center gap-3.5">
                        <span className="w-11 h-11 rounded-full bg-[#ccff00]/22 text-[#6f8c00] flex items-center justify-center shrink-0">
                            <CalendarCheck className="w-5 h-5" strokeWidth={2.2} />
                        </span>
                        <div>
                            <div className="font-semibold text-[15px]">Real-time booking</div>
                            <div className="mt-0.5 font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.2px] uppercase text-[#14140f]/50">No back-and-forth</div>
                        </div>
                    </div>
                    <p className="mt-5 text-[14.5px] leading-relaxed text-[#14140f]/72">
                        See your coach's open slots and book straight in. Cancellations and clashes sync both ways, so the calendar you see is always the real one.
                    </p>
                </div>
            </div>
        </div>
    )
}

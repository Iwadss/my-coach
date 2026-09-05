import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowUpRight } from 'lucide-react'

const programs = [
    { title: 'Strength', copy: 'Progressive lifting blocks built around your numbers.', placeholder: 'Strength training' },
    { title: 'Conditioning', copy: 'Intervals and engine work that fit your week.', placeholder: 'Fat loss / conditioning' },
    { title: 'Mobility', copy: 'Range and recovery sessions between the hard days.', placeholder: 'Mobility / recovery' },
]

export default function Programs() {
    const navigate = useNavigate()

    return (
        <div id="mc-programs" className="px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 bg-white dark:bg-[#0a0a0a]">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ Programs</div>
                    <h2 className="mt-4 font-['Anton'] text-[34px] sm:text-[44px] lg:text-[52px] leading-[0.98] tracking-wide uppercase text-[#14140f] dark:text-white">Coaching for every goal</h2>
                </div>
                <button
                    onClick={() => toast.info('Full program catalog coming soon', { className: 'toast-info' })}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-full border border-[#14140f]/16 dark:border-white/24 text-[13.5px] font-medium text-[#14140f] dark:text-white hover:border-[#6f8c00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors self-start sm:self-auto"
                >
                    View all programs <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {programs.map((p) => (
                    <div key={p.title} className="relative h-[280px] lg:h-[400px] rounded-[20px] overflow-hidden bg-[#f0f0e9] dark:bg-[#141414]">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-[#14140f]/30 dark:text-white/25 text-center px-4">{p.placeholder}</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 px-6 py-6 bg-[linear-gradient(transparent,rgba(255,255,255,.92)_55%)] dark:bg-[linear-gradient(transparent,rgba(6,6,6,.92)_55%)] pointer-events-none">
                            <div className="font-['Anton'] text-[24px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">{p.title}</div>
                            <p className="mt-2.5 text-[13px] leading-relaxed text-[#14140f]/65 dark:text-white/60">{p.copy}</p>
                        </div>
                    </div>
                ))}

                <div className="h-[280px] lg:h-[400px] rounded-[20px] bg-[#ccff00] text-[#0a0a0a] p-7 box-border flex flex-col">
                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.6px] uppercase text-[#0a0a0a]/60">Most booked</div>
                    <div className="mt-auto font-['Anton'] text-[28px] sm:text-[30px] leading-[0.98] tracking-wide uppercase">1-to-1<br />coaching</div>
                    <p className="mt-3 text-[13px] leading-relaxed text-[#0a0a0a]/70">Weekly check-ins, plan rewrites and a coach who knows your history.</p>
                    <button
                        onClick={() => navigate('/signup')}
                        className="mt-5 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#0a0a0a] text-[#ccff00] text-[13.5px] font-semibold hover:bg-[#1c1c1c] transition-colors"
                    >
                        Book a session <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

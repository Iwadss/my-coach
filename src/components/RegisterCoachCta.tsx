import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function RegisterCoachCta() {
    const navigate = useNavigate()
    const handleApply = () => navigate('/coach-signup')

    return (
        <div id="mc-cta" className="px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 bg-white dark:bg-[#0a0a0a]">
            <div className="bg-[#ccff00] text-[#0a0a0a] rounded-[24px] p-8 sm:p-12 lg:p-14 grid lg:grid-cols-[1.1fr_.9fr] gap-10 lg:gap-14 items-center">
                <div>
                    <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#0a0a0a]/55">+ For coaches</div>
                    <h2 className="mt-4 font-['Anton'] text-[32px] sm:text-[40px] lg:text-[46px] leading-[0.98] tracking-wide uppercase">Register as coach</h2>
                    <p className="mt-4 max-w-[440px] text-[14.5px] leading-relaxed text-[#0a0a0a]/68">
                        Apply once, get approved by our team, and run your roster, slots and billing from a single dashboard. Your clients join with your 4-digit ID.
                    </p>
                </div>
                <div className="flex flex-col gap-3.5">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex items-center justify-center gap-2 px-6 py-[19px] rounded-full bg-[#0a0a0a] text-[#ccff00] text-[15px] font-semibold hover:bg-[#1c1c1c] transition-colors"
                    >
                        Apply now <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.3px] uppercase text-[#0a0a0a]/60">
                        <span>Admin reviewed</span><span>·</span><span>Bank transfer billing</span><span>·</span><span>Cancel anytime</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

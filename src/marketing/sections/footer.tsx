import { toast } from 'sonner'
import { Facebook, Instagram, Twitter, Linkedin, Mail } from 'lucide-react'

const comingSoon = (label: string) => () => toast.info(`${label} coming soon`, { className: 'toast-info' })

const socials = [
    { icon: Facebook, label: 'Facebook' },
    { icon: Instagram, label: 'Instagram' },
    { icon: Twitter, label: 'Twitter' },
    { icon: Linkedin, label: 'LinkedIn' },
]

const companyLinks = [
    { href: '#mc-why', label: 'About us' },
    { href: '#mc-why', label: 'Why MyCoach' },
    { href: '#mc-coaches', label: 'Coaches' },
]

const programLinks = ['Strength', 'Conditioning', 'Mobility', '1-to-1 coaching']

export default function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-[#e2e2d9] dark:border-[#1c1c1c] bg-white dark:bg-[#0a0a0a] px-6 sm:px-10 lg:px-16 pt-16 lg:pt-20">
            <div className="grid sm:grid-cols-2 lg:grid-cols-[1.25fr_.75fr_.75fr_1fr] gap-10 lg:gap-12">
                <div>
                    <a href="/" className="flex items-center gap-3">
                        <span className="w-[30px] h-[30px] rounded-[9px] bg-[#ccff00] flex items-center justify-center">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
                        </span>
                        <span className="font-['JetBrains_Mono'] text-[12px] font-medium tracking-[2.2px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
                    </a>
                    <p className="mt-5 max-w-[300px] text-[13.5px] leading-relaxed text-[#14140f]/48 dark:text-white/48">
                        A personal coaching platform for people who want a real coach — plans, sessions and progress in one place.
                    </p>
                    <div className="mt-6 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.5px] uppercase text-[#14140f]/40 dark:text-white/40">Follow on social media</div>
                    <div className="mt-3.5 flex gap-2.5">
                        {socials.map(({ icon: Icon, label }) => (
                            <button
                                key={label}
                                onClick={comingSoon(label)}
                                aria-label={label}
                                className="w-[34px] h-[34px] rounded-[10px] bg-[#f0f0e9] dark:bg-[#161616] border border-[#e2e2d9] dark:border-[#232323] flex items-center justify-center text-[#6f8c00] dark:text-[#ccff00] hover:border-[#6f8c00] dark:hover:border-[#ccff00] transition-colors"
                            >
                                <Icon className="w-[15px] h-[15px]" />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.6px] uppercase text-[#14140f] dark:text-white">Company</div>
                    <div className="mt-5 flex flex-col gap-3.5 text-[13.5px]">
                        {companyLinks.map((l) => (
                            <a key={l.label} href={l.href} className="text-[#14140f]/50 dark:text-white/50 hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">{l.label}</a>
                        ))}
                        <button onClick={comingSoon('Careers')} className="text-left text-[#14140f]/50 dark:text-white/50 hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">Careers</button>
                    </div>
                </div>

                <div>
                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.6px] uppercase text-[#14140f] dark:text-white">Programs</div>
                    <div className="mt-5 flex flex-col gap-3.5 text-[13.5px]">
                        {programLinks.map((label) => (
                            <a key={label} href="#mc-programs" className="text-[#14140f]/50 dark:text-white/50 hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">{label}</a>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.6px] uppercase text-[#14140f] dark:text-white">Contact us</div>
                    <div className="mt-5 flex flex-col gap-3.5 text-[13.5px] text-[#14140f]/50 dark:text-white/50">
                        <a href="mailto:hello@mycoach.app" className="flex items-center gap-2.5 hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">
                            <Mail className="w-[15px] h-[15px] text-[#6f8c00] dark:text-[#ccff00] shrink-0" strokeWidth={1.8} />
                            hello@mycoach.app
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-14 py-5 border-t border-[#e2e2d9] dark:border-[#1c1c1c] flex flex-col sm:flex-row items-center gap-3 justify-between text-[12.5px] text-[#14140f]/38 dark:text-white/38">
                <span>© 2026 MyCoach. All rights reserved.</span>
                <div className="flex gap-6">
                    <button onClick={comingSoon('Terms of use')} className="hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">Terms of use</button>
                    <button onClick={comingSoon('Privacy policy')} className="hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors">Privacy policy</button>
                </div>
            </div>

            <div
                aria-hidden="true"
                className="text-center font-['Anton'] leading-[0.78] tracking-wide uppercase text-[#f0f0e9] dark:text-[#151515] select-none -mb-[6%] text-[22vw]"
            >
                MyCoach
            </div>
        </footer>
    )
}

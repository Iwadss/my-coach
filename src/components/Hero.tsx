import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, ArrowUpRight, Play, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

const navLinks = [
    { href: '#mc-how', label: 'How it works' },
    { href: '#mc-why', label: 'Why MyCoach' },
    { href: '#mc-programs', label: 'Programs' },
    { href: '#mc-coaches', label: 'Coaches' },
    { href: '#mc-booking', label: 'Booking' },
]

const avatars = [
    { label: 'A', className: 'bg-[#e2e2d9] dark:bg-[#1f1f1f] text-[#14140f]/60 dark:text-white/60' },
    { label: 'J', className: 'bg-[#e2e2d9] dark:bg-[#1f1f1f] text-[#14140f]/60 dark:text-white/60' },
    { label: 'M', className: 'bg-[#e2e2d9] dark:bg-[#1f1f1f] text-[#14140f]/60 dark:text-white/60' },
]

export default function Hero() {
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
    const ThemeIcon = theme === 'dark' ? Sun : Moon

    return (
        <section className="relative overflow-hidden bg-[#f7f7f2] dark:bg-[#111]">
            {/* Hero photo — placeholder until real photography is dropped in */}
            <div className="absolute inset-0">
                <div className="w-full h-full bg-[#f0f0e9] dark:bg-[#151515] [background-image:radial-gradient(circle_at_30%_20%,rgba(111,140,0,0.06),transparent_55%)] dark:[background-image:radial-gradient(circle_at_30%_20%,rgba(204,255,0,0.06),transparent_55%)]" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,.9)_0%,rgba(255,255,255,.72)_42%,rgba(255,255,255,.4)_78%)] dark:bg-[linear-gradient(100deg,rgba(6,6,6,.93)_0%,rgba(6,6,6,.8)_42%,rgba(6,6,6,.55)_78%)]" />

            {/* Nav */}
            <div className="relative flex items-center justify-between px-6 sm:px-10 lg:px-16 py-6">
                <a href="/" className="flex items-center gap-3">
                    <span className="w-[34px] h-[34px] rounded-[10px] bg-[#ccff00] flex items-center justify-center">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
                    </span>
                    <span className="font-['JetBrains_Mono'] text-[13px] font-medium tracking-[2.4px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
                </a>

                <div className="hidden lg:flex items-center gap-8 text-[13.5px] font-medium text-[#14140f]/62 dark:text-white/62">
                    {navLinks.map((link) => (
                        <a key={link.href} href={link.href} className="hover:text-[#14140f] dark:hover:text-white transition-colors">{link.label}</a>
                    ))}
                </div>

                <div className="hidden lg:flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="w-10 h-10 rounded-full border border-[#14140f]/14 dark:border-white/22 flex items-center justify-center text-[#14140f] dark:text-white hover:border-[#6f8c00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                    >
                        <ThemeIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-5 py-[11px] rounded-full border border-[#14140f]/14 dark:border-white/22 text-[13px] font-medium text-[#14140f] dark:text-white hover:border-[#6f8c00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                    >
                        Log in
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#ccff00] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#d9ff33] transition-colors"
                    >
                        Get started <ArrowUpRight className="w-[13px] h-[13px]" />
                    </button>
                </div>

                <div className="lg:hidden flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="text-[#14140f] dark:text-white p-2"
                    >
                        <ThemeIcon size={20} />
                    </button>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        className="text-[#14140f] dark:text-white p-2 -mr-2"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="relative lg:hidden px-6 pb-6 flex flex-col gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#14140f]/75 dark:text-white/75 hover:bg-[#14140f]/5 dark:hover:bg-white/5"
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="flex flex-col gap-2.5 mt-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full px-5 py-3 rounded-full border border-[#14140f]/14 dark:border-white/22 text-[13.5px] font-medium text-[#14140f] dark:text-white"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ccff00] text-[#0a0a0a] text-[13.5px] font-semibold"
                        >
                            Get started <ArrowUpRight className="w-[13px] h-[13px]" />
                        </button>
                    </div>
                </div>
            )}

            {/* Hero content */}
            <div className="relative px-6 sm:px-10 lg:px-16 pt-10 pb-20 lg:pt-24 lg:pb-28">
              <div className="max-w-[820px]">
                <div className="font-['JetBrains_Mono'] text-[11px] font-medium tracking-[2.2px] uppercase text-[#6f8c00] dark:text-[#ccff00]">+ Personal coaching platform</div>
                <h1 className="mt-5 font-['Anton'] text-[38px] sm:text-[56px] lg:text-[72px] xl:text-[88px] leading-[0.9] tracking-wide uppercase text-[#14140f] dark:text-white text-balance">
                    Train with a coach<br />who <span className="text-[#6f8c00] dark:text-[#ccff00]">answers back</span>
                </h1>
                <p className="mt-6 max-w-[470px] text-[15.5px] leading-relaxed text-[#14140f]/62 dark:text-white/62">
                    Enter your coach's 4-digit ID, book your first session and track every set, every week — in one place built for real coaching relationships.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                    <button
                        onClick={() => navigate('/signup')}
                        className="flex items-center gap-2.5 px-7 py-[17px] rounded-full bg-[#ccff00] text-[#0a0a0a] text-[15px] font-semibold hover:bg-[#d9ff33] transition-colors"
                    >
                        Start training <ArrowUpRight className="w-[15px] h-[15px]" />
                    </button>
                    <a
                        href="#mc-how"
                        className="flex items-center gap-2.5 px-6 py-[17px] rounded-full border border-[#14140f]/16 dark:border-white/24 text-[15px] font-medium text-[#14140f] dark:text-white hover:border-[#6f8c00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                    >
                        <span className="w-[22px] h-[22px] rounded-full bg-[#14140f]/10 dark:bg-white/14 flex items-center justify-center">
                            <Play className="w-[9px] h-[9px] fill-current" />
                        </span>
                        See how it works
                    </a>
                </div>
                <div className="mt-9 flex items-center gap-4">
                    <div className="flex">
                        {avatars.map((a, i) => (
                            <span
                                key={i}
                                style={{ marginLeft: i === 0 ? 0 : -12 }}
                                className={`w-[38px] h-[38px] rounded-full border-2 border-[#f7f7f2] dark:border-[#0a0a0a] flex items-center justify-center font-semibold text-[11.5px] ${a.className}`}
                            >
                                {a.label}
                            </span>
                        ))}
                    </div>
                    <div className="text-[13.5px] text-[#14140f]/62 dark:text-white/62">
                        Every coach is reviewed before they can take a client.
                    </div>
                </div>
              </div>
            </div>
        </section>
    )
}

// Shared split-screen chrome for the auth flow — grid shell, hero-panel
// background/glow/logo, and the mobile-only back bar. Extracted from
// Login/SignUp/ForgotPassword/ResetPassword, which had all four
// byte-for-byte identical except for hero content, panel order, and the
// glow blob's position. CoachSignUp deliberately does NOT use this: its
// hero panel has a genuinely different internal rhythm (top-anchored logo +
// tag, `mt-auto`-pinned headline, extra stat/journey blocks) rather than
// the centered-content pattern the other four share — forcing it through
// the same wrapper would need as many escape-hatch props as it saves lines.
// It still imports AuthLogoLockup and AuthMobileBackBar below, since those
// two pieces genuinely are identical everywhere.
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

const GLOW: Record<'top-right' | 'bottom-left', string> = {
    'top-right': 'right-[-140px] top-[-140px] w-[420px] h-[420px] opacity-30 dark:opacity-[0.09]',
    'bottom-left': 'left-[-160px] bottom-[-160px] w-[440px] h-[440px] opacity-30 dark:opacity-[0.08]',
}

/** `compact` is CoachSignUp's smaller variant — same mark, scaled down, no bottom margin (its headline is `mt-auto`-pinned instead of sitting right below the logo). */
export function AuthLogoLockup({ compact = false }: { compact?: boolean }) {
    if (compact) {
        return (
            <Link to="/" className="inline-flex items-center gap-[11px]">
                <span className="w-[26px] h-[26px] rounded-lg bg-[#ccff00] flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
                </span>
                <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[2px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
            </Link>
        )
    }
    return (
        <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <span className="w-10 h-10 rounded-[11px] bg-[#ccff00] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140f" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
            </span>
            <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[2px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
        </Link>
    )
}

export function AuthMobileBackBar({ to, label, tag }: { to: string; label: string; tag?: ReactNode }) {
    const navigate = useNavigate()
    return (
        <div className="lg:hidden flex items-center justify-between mb-5">
            <button
                onClick={() => navigate(to)}
                aria-label={label}
                className="w-10 h-10 rounded-[13px] bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f] dark:text-white hover:border-[#a8cf00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
            >
                <ArrowLeft className="w-[17px] h-[17px]" />
            </button>
            {tag}
        </div>
    )
}

interface AuthLayoutProps {
    /** Which side the form panel renders on — the hero panel takes the other. */
    formSide: 'left' | 'right'
    /** Inner max-w-sm block alignment inside the form panel. Login/ForgotPassword/ResetPassword center it; SignUp left-aligns. */
    formAlign?: 'center' | 'start'
    /** SignUp draws a divider on the side facing the hero panel; the others don't. */
    formDivider?: boolean
    heroGlow: 'top-right' | 'bottom-left'
    /** Headline + blurb + carousel — rendered inside the shared centered wrapper. */
    hero: ReactNode
    mobileBackTo: string
    mobileBackLabel: string
    children: ReactNode
}

export function AuthLayout({ formSide, formAlign = 'center', formDivider = false, heroGlow, hero, mobileBackTo, mobileBackLabel, children }: AuthLayoutProps) {
    const heroPanel = (
        <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#f7f7f2] dark:bg-[#0d0d0d] px-12 py-11">
            <div className="absolute inset-0 [background-image:linear-gradient(#e8e8df_1px,transparent_1px),linear-gradient(90deg,#e8e8df_1px,transparent_1px)] dark:[background-image:linear-gradient(#151515_1px,transparent_1px),linear-gradient(90deg,#151515_1px,transparent_1px)] [background-size:64px_64px]" />
            <div className={`absolute rounded-full bg-[#ccff00] blur-[10px] ${GLOW[heroGlow]}`} />

            <div className="relative flex items-center justify-between">
                <AuthLogoLockup />
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center text-center">
                {hero}
            </div>
        </div>
    )

    const formPanel = (
        <div className={`flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12 ${formDivider ? (formSide === 'left' ? 'lg:border-r' : 'lg:border-l') + ' border-[#e2e2d9] dark:border-[#1c1c1c]' : ''}`}>
            <div className={`w-full max-w-sm ${formAlign === 'start' ? 'mx-auto lg:mx-0' : 'mx-auto'}`}>
                <AuthMobileBackBar to={mobileBackTo} label={mobileBackLabel} />
                {children}
            </div>
        </div>
    )

    return (
        <div className={`min-h-screen w-full bg-white dark:bg-[#0a0a0a] lg:grid ${formSide === 'left' ? 'lg:grid-cols-[560px_1fr]' : 'lg:grid-cols-[1fr_560px]'}`}>
            {formSide === 'left' ? (<>{formPanel}{heroPanel}</>) : (<>{heroPanel}{formPanel}</>)}
        </div>
    )
}

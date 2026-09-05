import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Clock, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { AuthLogoLockup, AuthMobileBackBar } from '@/auth/components/auth-layout'
import { authLabelCls, authInputCls } from '@/auth/styles/form'

// Light/dark, matching the login/signup screens' palette (see Login.tsx /
// SignUp.tsx) — previously dark-only, now brought in line with the rest of
// the auth flow.
//
// Deliberately NOT built on <AuthLayout>, unlike the other 4 auth pages —
// its hero panel has a different internal rhythm (top-anchored logo + tag,
// an `mt-auto`-pinned headline, extra stat/journey blocks below) rather
// than the centered-content pattern AuthLayout assumes, and it has a third
// "submitted" screen state the others don't. It does share the two pieces
// that genuinely are identical everywhere: the form field styles and the
// logo/mobile-back-bar primitives (as their `compact`/`tag` variants).

const journeySteps = [
    { n: 1, label: 'Submit this application' },
    { n: 2, label: 'Admin reviews it — usually under 48h' },
    { n: 3, label: 'Set up billing and open your slots' },
]

const stats = [
    { value: '340', label: 'Coaches' },
    { value: '48h', label: 'Review time' },
    { value: '0%', label: 'Setup fee', accent: true },
]

const reviewSteps = [
    { label: 'Application submitted', state: 'done' as const },
    { label: 'Admin review', note: ' — in progress', state: 'active' as const },
    { label: 'Billing + your Coach ID', state: 'upcoming' as const },
]

const BIO_MAX = 240

const forCoachesTag = (
    <span className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.4px] uppercase text-[#6f8c00] dark:text-[#ccff00]">For coaches</span>
)

export default function CoachSignUp() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [bio, setBio] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const navigate = useNavigate()

    const validate = () => {
        const next: { [key: string]: string } = {}
        if (!fullName.trim()) next.fullName = 'Name is required'
        if (!email.trim()) next.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Invalid email format'
        if (!password) next.password = 'Password is required'
        else if (password.length < 6) next.password = 'Password must be at least 6 characters'

        setErrors(next)
        return Object.keys(next).length === 0
    }

    // Lightweight length/variety heuristic — not a real entropy estimate,
    // just enough to give the 4-segment meter something honest to show.
    let passwordScore = 0
    if (password.length >= 8) passwordScore++
    if (password.length >= 12) passwordScore++
    if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) passwordScore++
    if (/[^a-zA-Z0-9]/.test(password)) passwordScore++

    const termsToast = () => toast.info('Coach terms are coming soon', { className: 'toast-info' })
    const privacyToast = () => toast.info('Privacy policy is coming soon', { className: 'toast-info' })

    const handleApply = async () => {
        if (!validate()) {
            toast.warning('⚠️ Invalid form submission', {
                description: 'Please fix the highlighted errors before proceeding.',
                className: 'toast-warning',
            })
            return
        }

        setLoading(true)
        const toastId = toast.loading('⏳ Submitting your application...')

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        })

        if (signUpError) {
            toast.dismiss(toastId)
            if (signUpError.message?.toLowerCase().includes('already registered')
                || signUpError.message?.toLowerCase().includes('already exists')) {
                toast.error('👤 Account already exists', {
                    description: `An account with email ${email} already exists. Try logging in instead.`,
                    className: 'toast-error',
                    duration: 6000,
                })
                setErrors({ email: 'This email is already registered' })
            } else {
                toast.error('❌ Application failed', {
                    description: signUpError.message || 'Please try again.',
                    className: 'toast-error',
                })
            }
            setLoading(false)
            return
        }

        const userId = signUpData.user?.id
        if (!userId) {
            toast.dismiss(toastId)
            toast.error('❌ Unknown error', { description: 'User ID not returned after sign-up.' })
            setLoading(false)
            return
        }

        const { error: coachError } = await supabase
            .from('coaches')
            .insert([{ id: userId, bio: bio || null, phone: phone || null, status: 'pending' }])

        toast.dismiss(toastId)

        if (coachError) {
            toast.error('⚠️ Account created, but...', {
                description: 'Failed to submit your coach application. Please contact support.',
                className: 'toast-warning',
            })
            console.error(coachError)
        } else {
            toast.success('✅ Application submitted!', {
                description: 'An administrator will review your application shortly.',
                className: 'toast-success',
            })
        }

        setLoading(false)
        setSubmitted(true)
    }

    // 7c — mobile "Application submitted (pending approval)" screen, shown
    // right after a successful submit. Returning to /pending-approval later
    // (a fresh session) still goes through that page's own status check —
    // this is just the immediate confirmation moment, not a replacement for it.
    if (submitted) {
        return (
            <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex flex-col px-6 py-10">
                <div className="w-full max-w-sm mx-auto flex flex-col flex-1">
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <span className="w-[88px] h-[88px] rounded-[28px] bg-[#ccff00] flex items-center justify-center text-[#0a0a0a]">
                            <Clock className="w-[42px] h-[42px]" strokeWidth={2.2} />
                        </span>
                        <h1 className="mt-8 font-['Anton'] text-[30px] leading-[1.05] tracking-wide uppercase text-[#14140f] dark:text-white">Under review</h1>
                        <p className="mt-3 text-[13px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                            Your application is with our admin team. We'll email <span className="text-[#14140f] dark:text-white">{email}</span> the moment you're approved.
                        </p>

                        <div className="mt-8 w-full flex flex-col gap-px bg-[#e2e2d9] dark:bg-[#1f1f1f] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-2xl overflow-hidden">
                            {reviewSteps.map((s) => (
                                <div key={s.label} className="bg-white dark:bg-[#111] px-[18px] py-[15px] flex items-center gap-3.5 text-left">
                                    <span className={`w-[22px] h-[22px] rounded-[7px] flex items-center justify-center shrink-0 font-['JetBrains_Mono'] text-[10px] font-medium ${s.state === 'done' ? 'bg-[#ccff00] text-[#0a0a0a]' : s.state === 'active' ? 'bg-[#ccff00]/16 text-[#6f8c00] dark:text-[#ccff00]' : 'bg-[#e2e2d9] dark:bg-[#1f1f1f] text-[#14140f]/55 dark:text-white/45'
                                        }`}>
                                        {s.state === 'done' ? <Check className="w-3 h-3" strokeWidth={3.4} /> : reviewSteps.indexOf(s) + 1}
                                    </span>
                                    <span className={`text-[13px] ${s.state === 'upcoming' ? 'text-[#14140f]/55 dark:text-white/45' : 'text-[#14140f] dark:text-white'}`}>
                                        {s.label}{s.note && <span className="text-[#14140f]/50 dark:text-white/42">{s.note}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-[17px] rounded-full border border-[#d8d8cd] dark:border-[#2a2a2a] text-[15px] font-medium text-[#14140f] dark:text-white hover:border-[#a8cf00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                    >
                        Back to home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] lg:grid lg:grid-cols-[1fr_620px]">
            {/* Info panel — desktop only */}
            <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#f7f7f2] dark:bg-[#0d0d0d] px-12 py-11">
                <div className="absolute inset-0 [background-image:linear-gradient(#e8e8df_1px,transparent_1px),linear-gradient(90deg,#e8e8df_1px,transparent_1px)] dark:[background-image:linear-gradient(#151515_1px,transparent_1px),linear-gradient(90deg,#151515_1px,transparent_1px)] [background-size:64px_64px]" />
                <div className="absolute left-[-160px] bottom-[-160px] w-[440px] h-[440px] rounded-full bg-[#ccff00] opacity-30 dark:opacity-[0.08] blur-[10px]" />

                <div className="relative flex items-center justify-between">
                    <AuthLogoLockup compact />
                    {forCoachesTag}
                </div>

                <div className="relative mt-auto font-['Anton'] text-[60px] leading-[0.94] tracking-wide uppercase text-[#14140f] dark:text-white">
                    Coach on<br />your own<br /><span className="text-[#6f8c00] dark:text-[#ccff00]">terms.</span>
                </div>
                <p className="relative mt-[22px] max-w-[360px] text-[14.5px] leading-relaxed text-[#14140f]/60 dark:text-white/52">
                    Apply once, clear an admin review, and get a 4-digit Coach ID your clients use to join your roster.
                </p>

                <div className="relative mt-8 flex flex-col gap-px bg-[#e2e2d9] dark:bg-[#1f1f1f] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-2xl overflow-hidden">
                    {journeySteps.map((s) => (
                        <div key={s.n} className="bg-white dark:bg-[#111] px-[18px] py-[15px] flex items-center gap-3.5">
                            <span className={`w-6 h-6 rounded-[7px] flex items-center justify-center font-['JetBrains_Mono'] text-[11px] font-medium shrink-0 ${s.n === 1 ? 'bg-[#ccff00] text-[#0a0a0a]' : 'bg-[#e2e2d9] dark:bg-[#1f1f1f] text-[#14140f]/60 dark:text-white/50'
                                }`}>
                                {s.n}
                            </span>
                            <span className={`text-[13.5px] ${s.n === 1 ? 'text-[#14140f] dark:text-white' : 'text-[#14140f]/60 dark:text-white/50'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-3">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-white dark:bg-[#141414] border border-[#e2e2d9] dark:border-[#232323] rounded-2xl p-[15px]">
                            <div className={`font-['Anton'] text-2xl leading-none ${s.accent ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f] dark:text-white'}`}>{s.value}</div>
                            <div className="mt-1.5 font-['JetBrains_Mono'] text-[9px] font-medium tracking-[1.1px] uppercase text-[#14140f]/50 dark:text-white/42">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form panel */}
            <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-[52px] py-10 lg:border-l border-[#e2e2d9] dark:border-[#1c1c1c]">
                <div className="w-full max-w-sm mx-auto">
                    <AuthMobileBackBar to="/" label="Back to home" tag={forCoachesTag} />

                    <h1 className="font-['Anton'] text-[28px] lg:text-[34px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                        Register as coach
                    </h1>
                    <p className="mt-2.5 text-[13.5px] text-[#14140f]/60 dark:text-white/50">
                        Coaching already?{' '}
                        <Link to="/login" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Log in</Link>
                    </p>

                    <form onSubmit={(e) => { e.preventDefault(); handleApply() }} className="mt-6 flex flex-col gap-3.5">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="fullName" className={authLabelCls}>Full name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(p => ({ ...p, fullName: '' })) }}
                                placeholder="Full name"
                                className={`${authInputCls} ${errors.fullName ? 'border-destructive' : ''}`}
                            />
                            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                        </div>

                        <div className="grid sm:grid-cols-[1.15fr_.85fr] gap-3">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email" className={authLabelCls}>Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })) }}
                                    placeholder="Email address"
                                    className={`${authInputCls} ${errors.email ? 'border-destructive' : ''}`}
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="phone" className={authLabelCls}>Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Phone number"
                                    className={authInputCls}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between">
                                <Label htmlFor="bio" className={authLabelCls}>Short bio</Label>
                                <span className="font-['JetBrains_Mono'] text-[10px] text-[#14140f]/35 dark:text-white/35">{bio.length} / {BIO_MAX}</span>
                            </div>
                            <Textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                                maxLength={BIO_MAX}
                                placeholder="Your specialism, certifications and who you coach best."
                                className="min-h-[100px] resize-none rounded-xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-[18px] py-[15px] text-[14.5px] text-[#14140f] dark:text-white placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:ring-[#ccff00]/40 focus-visible:border-[#a8cf00] dark:focus-visible:border-[#ccff00]"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password" className={authLabelCls}>Password</Label>
                            <div className="relative flex items-center">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
                                    placeholder="8+ characters"
                                    className={`${authInputCls} pr-12 w-full ${errors.password ? 'border-destructive' : ''}`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-1.5 h-9 w-9 p-0 text-[#14140f]/50 dark:text-white/50 hover:text-[#6f8c00] dark:hover:text-[#ccff00] hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                            <div className="flex gap-[5px] mt-0.5">
                                {[0, 1, 2, 3].map((i) => (
                                    <span key={i} className={`flex-1 h-[3px] rounded-full ${i < passwordScore ? 'bg-[#ccff00]' : 'bg-[#d8d8cd] dark:bg-[#2a2a2a]'}`} />
                                ))}
                            </div>
                            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="mt-2 h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px] disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Submitting...</span>
                            ) : 'Submit application'}
                        </Button>

                        <div className="flex items-center gap-3 bg-white dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-2xl px-[15px] py-[13px]">
                            <span className="w-[30px] h-[30px] rounded-lg bg-[#ccff00]/14 flex items-center justify-center text-[#6f8c00] dark:text-[#ccff00] shrink-0">
                                <Check className="w-4 h-4" strokeWidth={2.4} />
                            </span>
                            <span className="text-[12px] leading-relaxed text-[#14140f]/60 dark:text-white/52">
                                An admin reviews every application before you can take clients or set a Coach ID.
                            </span>
                        </div>

                        <p className="text-[11.5px] leading-relaxed text-[#14140f]/50 dark:text-white/42">
                            By applying you agree to MyCoach's{' '}
                            <button type="button" onClick={termsToast} className="text-[#14140f]/80 dark:text-white/78 underline">Coach terms</button>{' '}
                            and{' '}
                            <button type="button" onClick={privacyToast} className="text-[#14140f]/80 dark:text-white/78 underline">Privacy policy</button>.
                        </p>
                    </form>

                    <p className="lg:hidden text-center text-[12.5px] text-[#14140f]/60 dark:text-white/50 mt-6">
                        Training instead?{' '}
                        <Link to="/signup" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Join as a client</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

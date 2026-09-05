import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, IdCard, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import QuoteStack from '@/auth/components/quote-stack'
import { Spinner } from '@/components/ui/spinner'

interface ResolvedCoach {
    id: string
    name: string
    acceptingClients: boolean
}

export default function SignUp() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [coachCode, setCoachCode] = useState('')
    const [resolvedCoach, setResolvedCoach] = useState<ResolvedCoach | null>(null)
    const [resolvingCoach, setResolvingCoach] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const navigate = useNavigate()

    const termsToast = () => toast.info('Terms of service are coming soon', { className: 'toast-info' })
    const privacyToast = () => toast.info('Privacy policy is coming soon', { className: 'toast-info' })

    const validate = () => {
        const next: { [key: string]: string } = {}
        if (!fullName.trim()) next.fullName = 'Name is required'
        if (!email.trim()) next.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Invalid email format'
        if (!password) next.password = 'Password is required'
        else if (password.length < 6) next.password = 'Password must be at least 6 characters'
        if (!coachCode.trim()) next.coach = "Enter your coach's ID"

        setErrors(next)
        return Object.keys(next).length === 0
    }

    // Resolves a coach ID (e.g. "0001") through the same pre-auth-readable
    // directory the old coach picker used — no session exists yet at this
    // point in the flow. Deliberately still resolves a closed coach (rather
    // than looking like "no such coach") so handleSignUp can show the
    // specific "not accepting new clients" message instead of a generic
    // invalid-ID one.
    const resolveCoachCode = async (code: string): Promise<ResolvedCoach | null> => {
        if (!code.trim()) return null
        setResolvingCoach(true)
        const { data } = await supabase
            .from('coach_directory')
            .select('coach_id, full_name, accepting_clients')
            .eq('coach_code', code.trim())
            .maybeSingle()
        setResolvingCoach(false)

        if (!data) return null
        const coach = { id: data.coach_id, name: data.full_name ?? 'Your coach', acceptingClients: data.accepting_clients }
        setResolvedCoach(coach)
        return coach
    }

    const handleCoachCodeChange = (value: string) => {
        setCoachCode(value)
        setResolvedCoach(null)
        if (errors.coach) setErrors((p) => ({ ...p, coach: '' }))
        if (/^\d{4}$/.test(value.trim())) void resolveCoachCode(value)
    }

    const handleSignUp = async () => {
        if (!validate()) {
            toast.warning('⚠️ Invalid form submission', {
                description: 'Please fix the highlighted errors before proceeding.',
                className: 'toast-warning',
            })
            return
        }

        // The user may not have blurred the coach-ID field (e.g. submitted
        // via Enter), so resolve it here too if it isn't already resolved.
        let coach = resolvedCoach
        if (!coach) {
            coach = await resolveCoachCode(coachCode)
        }
        if (!coach) {
            setErrors((p) => ({ ...p, coach: 'No coach found with that ID. Please check and try again.' }))
            toast.error('❌ Invalid coach ID', {
                description: `No coach is registered with ID "${coachCode.trim()}".`,
                className: 'toast-error',
            })
            return
        }
        if (!coach.acceptingClients) {
            setErrors((p) => ({ ...p, coach: 'This coach is not accepting new clients anymore.' }))
            toast.error('❌ This coach is not accepting new clients anymore.', { className: 'toast-error' })
            return
        }

        setLoading(true)
        const toastId = toast.loading('⏳ Creating account...')

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
                toast.error('❌ Sign-up failed', {
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

        const { error: clientError } = await supabase
            .from('clients')
            .insert([{ id: userId, email, full_name: fullName }])

        if (clientError) {
            toast.dismiss(toastId)
            toast.error('⚠️ Account created, but...', {
                description: 'Failed to save your profile details. Please contact support.',
                className: 'toast-warning',
            })
            console.error(clientError)
            setLoading(false)
            return
        }

        const { error: requestError } = await supabase
            .from('coach_clients')
            .insert([{ client_id: userId, coach_id: coach.id, status: 'pending' }])

        toast.dismiss(toastId)

        if (requestError) {
            toast.error('⚠️ Account created, but...', {
                description: 'Failed to send your coach request. You can enter your coach\'s ID again from the pending page.',
                className: 'toast-warning',
            })
            console.error(requestError)
        } else {
            toast.success('✅ Account created!', {
                description: 'Your request has been sent to your chosen coach.',
                className: 'toast-success',
            })
        }

        setLoading(false)
        navigate('/pending-approval')
    }

    const labelCls = 'font-["JetBrains_Mono"] text-[10px] font-medium uppercase tracking-[1.4px] text-[#14140f]/50 dark:text-white/45'
    const inputCls = 'h-[52px] rounded-xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-[18px] text-[15px] text-[#14140f] dark:text-white placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:ring-[#ccff00]/40 focus-visible:border-[#a8cf00] dark:focus-visible:border-[#ccff00]'

    // Progress mirrors validate(): name -> email -> password -> resolved coach ID.
    const stepsDone = [
        fullName.trim().length > 0,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        password.length >= 6,
        /^\d{4}$/.test(coachCode.trim()) && resolvedCoach !== null && resolvedCoach.acceptingClients,
    ]
    const progress = stepsDone.filter(Boolean).length

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] lg:grid lg:grid-cols-[560px_1fr]">
            {/* Form panel */}
            <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12 lg:border-r border-[#e2e2d9] dark:border-[#1c1c1c]">
                <div className="w-full max-w-sm mx-auto lg:mx-0">
                    {/* Mobile-only top bar */}
                    <div className="lg:hidden flex items-center justify-between mb-5">
                        <button
                            onClick={() => navigate('/')}
                            aria-label="Back to home"
                            className="w-10 h-10 rounded-[13px] bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f] dark:text-white hover:border-[#a8cf00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                        >
                            <ArrowLeft className="w-[17px] h-[17px]" />
                        </button>
                    </div>

                    <div className="text-center lg:text-left">
                        <h1 className="font-['Anton'] text-[34px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                            Create an account
                        </h1>
                        <p className="mt-2.5 text-[13.5px] text-[#14140f]/60 dark:text-white/50">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Log in</Link>
                        </p>
                    </div>

                    {/* Completion progress — 1/4 name, 2/4 email, 3/4 password, 4/4 coach ID */}
                    <div className="mt-7 flex items-center gap-3">
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={4}
                            aria-valuenow={progress}
                            aria-label="Sign-up progress"
                            className="flex-1 flex gap-1.5"
                        >
                            {stepsDone.map((done, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${done ? 'bg-[#ccff00]' : 'bg-[#e8e8df] dark:bg-[#232323]'}`}
                                />
                            ))}
                        </div>
                        <span className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.2px] text-[#14140f]/45 dark:text-white/40">
                            {progress}/4
                        </span>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSignUp() }} className="mt-6 flex flex-col gap-3.5">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="fullName" className={labelCls}>Full name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(p => ({ ...p, fullName: '' })) }}
                                placeholder="Your name"
                                className={`${inputCls} ${errors.fullName ? 'border-destructive' : ''}`}
                            />
                            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className={labelCls}>Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })) }}
                                placeholder="Email address"
                                className={`${inputCls} ${errors.email ? 'border-destructive' : ''}`}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password" className={labelCls}>Password</Label>
                            <div className="relative flex items-center">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
                                    placeholder="Password"
                                    className={`${inputCls} pr-12 w-full ${errors.password ? 'border-destructive' : ''}`}
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
                            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="coachCode" className={labelCls}>Coach ID</Label>
                            <div className="relative flex items-center">
                                <IdCard className="absolute left-4 w-4 h-4 text-[#14140f]/40 dark:text-white/35" />
                                <Input
                                    id="coachCode"
                                    value={coachCode}
                                    onChange={(e) => handleCoachCodeChange(e.target.value)}
                                    onBlur={() => coachCode.trim() && resolveCoachCode(coachCode)}
                                    placeholder="e.g. 0001"
                                    maxLength={4}
                                    inputMode="numeric"
                                    className={`${inputCls} pl-11 w-full font-mono tracking-widest ${errors.coach ? 'border-destructive' : ''}`}
                                />
                            </div>
                            {resolvingCoach && (
                                <p className="text-xs text-[#14140f]/50 dark:text-white/45 flex items-center gap-1.5">
                                    <Spinner className="w-3 h-3" /> Looking up coach...
                                </p>
                            )}
                            {!resolvingCoach && resolvedCoach && resolvedCoach.acceptingClients && (
                                <p className="text-xs text-[#6f8c00] dark:text-[#ccff00] flex items-center gap-1.5 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Assigned to {resolvedCoach.name}
                                </p>
                            )}
                            {!resolvingCoach && resolvedCoach && !resolvedCoach.acceptingClients && (
                                <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                                    <XCircle className="w-3.5 h-3.5" /> This coach is not accepting new clients right now.
                                </p>
                            )}
                            <p className="text-xs text-[#14140f]/45 dark:text-white/40">Ask coach for their ID</p>
                            {errors.coach && <p className="text-sm text-destructive">{errors.coach}</p>}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || (resolvedCoach !== null && !resolvedCoach.acceptingClients)}
                            className="mt-2.5 h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px] disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Creating account...</span>
                            ) : 'Continue'}
                        </Button>

                        <p className="text-[11.5px] leading-relaxed text-[#14140f]/50 dark:text-white/42 text-center">
                            By creating an account you agree to MyCoach's{' '}
                            <button type="button" onClick={termsToast} className="text-[#14140f]/80 dark:text-white/78 underline">Terms</button>{' '}
                            and{' '}
                            <button type="button" onClick={privacyToast} className="text-[#14140f]/80 dark:text-white/78 underline">Privacy policy</button>.
                        </p>
                    </form>
                </div>
            </div>

            {/* Hero panel */}
            <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#f7f7f2] dark:bg-[#0d0d0d] px-12 py-11">
                <div className="absolute inset-0 [background-image:linear-gradient(#e8e8df_1px,transparent_1px),linear-gradient(90deg,#e8e8df_1px,transparent_1px)] dark:[background-image:linear-gradient(#151515_1px,transparent_1px),linear-gradient(90deg,#151515_1px,transparent_1px)] [background-size:64px_64px]" />
                <div className="absolute left-[-160px] bottom-[-160px] w-[440px] h-[440px] rounded-full bg-[#ccff00] opacity-30 dark:opacity-[0.08] blur-[10px]" />

                <div className="relative flex items-center justify-between">
                    <Link to="/" className="inline-flex items-center gap-2 mb-10">
                        <span className="w-10 h-10 rounded-[11px] bg-[#ccff00] flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140f" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
                        </span>
                        <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[2px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
                    </Link>
                </div>
                <div className="relative flex-1 flex flex-col items-center justify-center text-center">
                    <div className="font-['Anton'] text-[52px] leading-[0.96] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Train with<br />a plan that<br />
                        <span className="text-[#6f8c00] dark:text-[#ccff00]">answers back.</span>
                    </div>

                    <div className="mt-9 w-full flex justify-center">
                        <QuoteStack />
                    </div>
                </div>
            </div>
        </div>
    )
}

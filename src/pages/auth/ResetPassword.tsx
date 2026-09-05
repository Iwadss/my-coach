import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, KeyRound, Link2Off, ArrowLeft } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import ImageCoverflow from '@/auth/components/image-coverflow'

export default function ResetPassword() {
    // Supabase sets the recovery session from the URL fragment asynchronously
    // on load — check both the current session and the auth-event stream so
    // we don't miss it either way it resolves.
    const [ready, setReady] = useState(false)
    const [checked, setChecked] = useState(false)

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const navigate = useNavigate()

    useEffect(() => {
        let active = true

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (active && session) {
                setReady(true)
                setChecked(true)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                if (active) {
                    setReady(true)
                    setChecked(true)
                }
            }
        })

        const timeout = setTimeout(() => { if (active) setChecked(true) }, 3000)

        return () => {
            active = false
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const handleSubmit = async () => {
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (confirmPassword !== password) {
            setError('Passwords do not match')
            return
        }
        setError('')
        setLoading(true)

        const { error: updateError } = await supabase.auth.updateUser({ password })

        if (updateError) {
            setLoading(false)
            toast.error('❌ Could not reset password', {
                description: updateError.message,
                className: 'toast-error',
            })
            return
        }

        await supabase.auth.signOut()
        setLoading(false)
        toast.success('✅ Password updated', {
            description: 'Please log in with your new password.',
            className: 'toast-success',
        })
        navigate('/login')
    }

    const labelCls = 'font-["JetBrains_Mono"] text-[10px] font-medium uppercase tracking-[1.4px] text-[#14140f]/50 dark:text-white/45'
    const inputCls = 'h-[52px] rounded-xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-[18px] text-[15px] text-[#14140f] dark:text-white placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:ring-[#ccff00]/40 focus-visible:border-[#a8cf00] dark:focus-visible:border-[#ccff00]'

    // Link expired/invalid is its own distinct moment — different icon and
    // heading from the normal "set a new password" state, same idea as
    // ForgotPassword swapping Mail -> MailCheck once it has sent.
    const invalid = checked && !ready

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] lg:grid lg:grid-cols-[1fr_560px]">
            {/* Hero panel — desktop only */}
            <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#f7f7f2] dark:bg-[#0d0d0d] px-12 py-11">
                <div className="absolute inset-0 [background-image:linear-gradient(#e8e8df_1px,transparent_1px),linear-gradient(90deg,#e8e8df_1px,transparent_1px)] dark:[background-image:linear-gradient(#151515_1px,transparent_1px),linear-gradient(90deg,#151515_1px,transparent_1px)] [background-size:64px_64px]" />
                <div className="absolute right-[-140px] top-[-140px] w-[420px] h-[420px] rounded-full bg-[#ccff00] opacity-30 dark:opacity-[0.09] blur-[10px]" />

                {/* MyCoach logo — links back home */}
                <div className="relative flex items-center justify-between">
                    <Link to="/" className="inline-flex items-center gap-2 mb-10">
                        <span className="w-10 h-10 rounded-[11px] bg-[#ccff00] flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140f" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter"><path d="M2 20h6v-6h6V8h6V2" /></svg>
                        </span>
                        <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[2px] uppercase text-[#14140f] dark:text-white">MyCoach</span>
                    </Link>
                </div>

                <div className="relative flex-1 flex flex-col items-center justify-center text-center">
                    <div className="font-['Anton'] text-[54px] leading-[0.94] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Last step,<br />then you're <span className="text-[#6f8c00] dark:text-[#ccff00]">in</span>.
                    </div>
                    <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                        Set a new password and everything — your sessions, your progress — will be right where you left it.
                    </p>

                    {/* Image carousel — placeholders for real photos later */}
                    <div className="mt-4 w-full">
                        <ImageCoverflow />
                    </div>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12">
                <div className="w-full max-w-sm mx-auto">
                    {/* Mobile-only top bar */}
                    <div className="lg:hidden flex items-center justify-between mb-5">
                        <button
                            onClick={() => navigate('/login')}
                            aria-label="Back to login"
                            className="w-10 h-10 rounded-[13px] bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center text-[#14140f] dark:text-white hover:border-[#a8cf00] dark:hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                        >
                            <ArrowLeft className="w-[17px] h-[17px]" />
                        </button>
                    </div>

                    <div className="text-center lg:text-left">
                        <span className="inline-flex w-[64px] h-[64px] lg:w-14 lg:h-14 rounded-[20px] lg:rounded-2xl bg-[#ccff00] items-center justify-center text-[#0a0a0a] lg:mb-6">
                            {invalid ? <Link2Off className="w-7 h-7 lg:w-6 lg:h-6" strokeWidth={2.2} /> : <KeyRound className="w-7 h-7 lg:w-6 lg:h-6" strokeWidth={2.2} />}
                        </span>
                        <h1 className="mt-6 lg:mt-0 font-['Anton'] text-[30px] lg:text-[34px] leading-[1.05] lg:leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                            {invalid ? 'Link expired' : 'Set a new password'}
                        </h1>
                        <p className="mt-3 lg:mt-2.5 text-[13.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                            {invalid
                                ? 'This reset link is invalid or has expired. Request a new one below.'
                                : 'Choose a new password for your account.'}
                        </p>
                    </div>

                    <div className="mt-7">
                        {!checked ? (
                            <div className="flex items-center justify-center lg:justify-start gap-2 py-2 text-[13.5px] text-[#14140f]/55 dark:text-white/50">
                                <Spinner className="w-4 h-4" /> Verifying your link...
                            </div>
                        ) : invalid ? (
                            <Link to="/forgot-password">
                                <Button className="h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px]">
                                    Request a new link
                                </Button>
                            </Link>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="flex flex-col gap-3.5">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="password" className={labelCls}>New password</Label>
                                    <div className="relative flex items-center">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                                            placeholder="New password"
                                            className={`${inputCls} pr-12 w-full ${error ? 'border-destructive' : ''}`}
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
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="confirmPassword" className={labelCls}>Confirm password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                                        placeholder="Re-enter your new password"
                                        className={`${inputCls} w-full ${error ? 'border-destructive' : ''}`}
                                    />
                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px] disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Updating...</span>
                                    ) : 'Update password'}
                                </Button>
                            </form>
                        )}
                    </div>

                    <p className="mt-8 text-center lg:text-left text-[13.5px] text-[#14140f]/60 dark:text-white/50">
                        Remembered it?{' '}
                        <Link to="/login" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

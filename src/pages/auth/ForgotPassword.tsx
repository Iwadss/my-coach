import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Mail, MailCheck, ArrowLeft } from 'lucide-react'
import ImageCoverflow from '@/auth/components/image-coverflow'
import { Spinner } from '@/components/ui/spinner'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address')
            return
        }
        setError('')
        setLoading(true)

        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })

        // Always show the same outcome, whether or not the email exists —
        // don't let this form be used to check who has an account.
        setLoading(false)
        setSent(true)
        toast.success('📧 Check your email', {
            description: 'If an account exists for that address, a reset link is on its way.',
            className: 'toast-success',
        })
    }

    const labelCls = 'font-["JetBrains_Mono"] text-[10px] font-medium uppercase tracking-[1.4px] text-[#14140f]/50 dark:text-white/45'
    const inputCls = 'h-[52px] rounded-xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-[18px] text-[15px] text-[#14140f] dark:text-white placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:ring-[#ccff00]/40 focus-visible:border-[#a8cf00] dark:focus-visible:border-[#ccff00]'

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
                        Get back into<br />your <span className="text-[#6f8c00] dark:text-[#ccff00]">account</span>
                    </div>
                    <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                        Your plans, sessions and progress are exactly where you left them. A reset link is all it takes.
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
                            {sent ? <MailCheck className="w-7 h-7 lg:w-6 lg:h-6" strokeWidth={2.2} /> : <Mail className="w-7 h-7 lg:w-6 lg:h-6" strokeWidth={2.2} />}
                        </span>
                        <h1 className="mt-6 lg:mt-0 font-['Anton'] text-[30px] lg:text-[34px] leading-[1.05] lg:leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                            {sent ? 'Check your email' : 'Forgot password?'}
                        </h1>
                        <p className="mt-3 lg:mt-2.5 text-[13.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                            {sent
                                ? <>If an account exists for <span className="text-[#14140f] dark:text-white">{email}</span>, a reset link is on its way.</>
                                : "Enter the email on your account and we'll send you a link to reset your password."}
                        </p>
                    </div>

                    {!sent && (
                        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="mt-7 flex flex-col gap-3.5">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email" className={labelCls}>Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                                    className={`${inputCls} ${error ? 'border-destructive' : ''}`}
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="mt-1 h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px] disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Sending...</span>
                                ) : 'Send reset link'}
                            </Button>
                        </form>
                    )}

                    <p className="mt-8 text-center lg:text-left text-[13.5px] text-[#14140f]/60 dark:text-white/50">
                        Remembered it?{' '}
                        <Link to="/login" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

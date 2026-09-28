import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Mail, MailCheck } from 'lucide-react'
import ImageCoverflow from '@/auth/components/image-coverflow'
import { AuthLayout } from '@/auth/components/auth-layout'
import { authLabelCls, authInputCls } from '@/auth/styles/form'
import { Spinner } from '@/components/ui/spinner'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address')
            return
        }
        setError('')
        setLoading(true)

        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
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

    return (
        <AuthLayout
            formSide="right"
            heroGlow="top-right"
            mobileBackTo="/login"
            mobileBackLabel="Back to login"
            hero={
                <>
                    <div className="font-['Anton'] text-[54px] leading-[0.94] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Get back into<br />your <span className="text-[#6f8c00] dark:text-[#ccff00]">account</span>
                    </div>
                    <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                        Your plans, sessions and progress are exactly where you left them. A reset link is all it takes.
                    </p>
                    <div className="mt-4 w-full">
                        <ImageCoverflow />
                    </div>
                </>
            }
        >
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
                        <Label htmlFor="email" className={authLabelCls}>Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                            className={`${authInputCls} ${error ? 'border-destructive' : ''}`}
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
        </AuthLayout>
    )
}

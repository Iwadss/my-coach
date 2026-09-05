// src/pages/auth/Login.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import supabase from '@/supabase/supabase';
import { Eye, EyeOff, Check } from 'lucide-react';
import ImageCoverflow from '@/auth/components/image-coverflow';
import { AuthLayout } from '@/auth/components/auth-layout';
import { authLabelCls, authInputCls } from '@/auth/styles/form';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
    // --- State Management ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Utilities ---
    const navigate = useNavigate();

    // --- Handle Login Action ---
    const handleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error || !data.session) throw error || new Error('Login failed');

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single();

            if (profileError || !profile) throw profileError || new Error('Could not load your account');

            // Redirect based on role. 'coach' is only ever set once an admin
            // approves (see admin_set_coach_status), so a coach role here is
            // always an approved coach.
            if (profile.role === 'admin') {
                toast.success('Welcome back, admin!');
                navigate('/admin');
            } else if (profile.role === 'coach') {
                toast.success('Coach login successful!');
                navigate('/coach-dashboard');
            } else {
                const { data: approvedRequest } = await supabase
                    .from('coach_clients')
                    .select('id')
                    .eq('client_id', data.session.user.id)
                    .eq('status', 'approved')
                    .maybeSingle();

                if (approvedRequest) {
                    toast.success('Client login successful!');
                    navigate('/client-dashboard');
                } else {
                    navigate('/pending-approval');
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Google/Apple aren't wired up as real auth providers yet — say so
    // honestly rather than shipping a button that silently does nothing.
    const handleSocialLogin = (provider: string) => {
        toast.info(`${provider} sign-in is coming soon`, { className: 'toast-info' });
    };

    const socialBtnCls = 'h-[54px] rounded-2xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-[#14140f] dark:text-white font-medium hover:border-[#a8cf00] dark:hover:border-[#ccff00] transition-colors';

    return (
        <AuthLayout
            formSide="right"
            heroGlow="top-right"
            mobileBackTo="/"
            mobileBackLabel="Back to home"
            hero={
                <>
                    <div className="font-['Anton'] text-[62px] leading-[0.92] tracking-wide uppercase text-[#14140f] dark:text-white">
                        Welcome back<br />to <span className="text-[#6f8c00] dark:text-[#ccff00]">MyCoach</span>
                    </div>
                    <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-[#14140f]/60 dark:text-white/50">
                        All your progress, plans, and sessions are right here waiting. Let's keep the momentum going.
                    </p>
                    <div className="mt-4 w-full">
                        <ImageCoverflow />
                    </div>
                </>
            }
        >
            <div className="text-center lg:text-left">
                {/* Mobile never sees the hero panel's "Welcome back" headline, so it gets its own here */}
                <h1 className="lg:hidden font-['Anton'] text-[34px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                    Welcome back
                </h1>
                <h1 className="hidden lg:block font-['Anton'] text-[34px] leading-none tracking-wide uppercase text-[#14140f] dark:text-white">
                    Log in
                </h1>
                <p className="mt-2.5 text-[13.5px] text-[#14140f]/60 dark:text-white/50">
                    New to MyCoach?{' '}
                    <Link to="/signup" className="font-medium text-[#6f8c00] dark:text-[#ccff00]">Sign up</Link>
                </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin() }} className="mt-7 flex flex-col gap-3.5">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className={authLabelCls}>Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={authInputCls}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className={authLabelCls}>Password</Label>
                    <div className="relative flex items-center">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${authInputCls} pr-12 w-full`}
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

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between mt-0.5">
                    <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-2.5 text-[13px] text-[#14140f]/65 dark:text-white/60"
                    >
                        <span className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors ${rememberMe
                            ? 'bg-[#ccff00] border-[#ccff00]'
                            : 'bg-transparent border-[#c9c9be] dark:border-[#3a3a3a]'
                            }`}>
                            {rememberMe && <Check className="w-3 h-3 text-[#14140f]" strokeWidth={3} />}
                        </span>
                        Remember me
                    </button>
                    <Link to="/forgot-password" className="text-xs font-medium text-[#6f8c00] dark:text-[#ccff00]">
                        Forgot password?
                    </Link>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-[54px] w-full rounded-full bg-[#ccff00] text-[#0a0a0a] hover:bg-[#d9ff33] font-semibold text-[15px] disabled:opacity-50"
                >
                    {loading ? (
                        <span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Signing in...</span>
                    ) : 'Log in'}
                </Button>

                {/* "or log in with" divider */}
                <div className="flex items-center gap-3.5 mt-1.5">
                    <div className="flex-1 h-px bg-[#e2e2d9] dark:bg-[#242424]" />
                    <span className="font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[1.2px] text-[#14140f]/45 dark:text-white/35">or log in with</span>
                    <div className="flex-1 h-px bg-[#e2e2d9] dark:bg-[#242424]" />
                </div>

                {/* Social login — not wired up yet, see handleSocialLogin */}
                <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" onClick={() => handleSocialLogin('Google')} className={socialBtnCls}>
                        <svg width="18" height="18" viewBox="0 0 24 24" className="mr-2"><path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.57-5.17 3.57-8.82z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" /><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 000 12c0 1.93.46 3.76 1.29 5.38l3.98-3.09z" /><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" /></svg>
                        Google
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleSocialLogin('Apple')} className={socialBtnCls}>
                        <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor" className="mr-2"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" /></svg>
                        Apple
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}

// src/pages/LoginPage.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import supabase from '@/supabase/supabase';
import { UserLockIcon, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    // --- State Management ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- Utilities ---
    const navigate = useNavigate();
    const { theme } = useTheme();
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

    // --- Handle Login Action ---
    const handleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error || !data.session) throw error || new Error('Login failed');

            // Redirect based on role
            if (email === adminEmail) {
                toast.success('Admin login successful!');
                navigate('/admin-dashboard');
            } else {
                toast.success('Client login successful!');
                navigate('/client-dashboard');
            }
        } catch (err: any) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`min-h-screen flex items-center justify-center px-4 bg-gradient-to-br ${theme === 'dark' ? 'from-gray-900 via-gray-800 to-gray-900' : 'from-blue-50 via-indigo-50 to-purple-50'
                }`}
        >
            <div className="w-full max-w-md">
                {/* --- Branding Section --- */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
                        MyCoach
                    </h1>

                </div>

                {/* --- Login Card --- */}
                <Card
                    className={`rounded-2xl shadow-2xl border-0 backdrop-blur-md transition-all duration-300 hover:shadow-3xl ${theme === 'dark' ? 'bg-gray-800/90 shadow-gray-900/50' : 'bg-white/90 shadow-gray-200/50'
                        }`}
                >
                    <CardHeader className="text-center pb-6">
                        {/* User Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-200 hover:scale-105">
                            <UserLockIcon className="w-10 h-10 text-white" />
                        </div>
                        <CardTitle
                            className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
                        >
                            Welcome Back!
                        </CardTitle>
                        <CardDescription
                            className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                            Enter your credentials to continue.
                        </CardDescription>
                    </CardHeader>

                    {/* --- Form Fields --- */}
                    <CardContent className="pt-0">
                        <div className="space-y-6">
                            {/* Email Field */}
                            <div className="space-y-3">
                                <Label
                                    htmlFor="email"
                                    className={`text-sm font-bold tracking-wide uppercase ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                                        }`}
                                >
                                    Email Address
                                </Label>
                                <div className="relative group">
                                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${theme === 'dark' ? 'text-gray-400 group-focus-within:text-blue-400' : 'text-gray-500 group-focus-within:text-blue-500'}`} />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`h-12 rounded-2xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 pl-12 pr-4 text-base font-medium ${theme === 'dark'
                                            ? 'bg-gray-800/60 border-gray-600 text-white placeholder:text-gray-400 hover:bg-gray-800/80 hover:border-gray-500'
                                            : 'bg-gray-50/80 border-gray-300 hover:bg-white hover:border-gray-400 focus:bg-white'
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-3">
                                <Label
                                    htmlFor="password"
                                    className={`text-sm font-bold tracking-wide uppercase ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                                        }`}
                                >
                                    Password
                                </Label>
                                <div className="relative group">
                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${theme === 'dark' ? 'text-gray-400 group-focus-within:text-blue-400' : 'text-gray-500 group-focus-within:text-blue-500'}`} />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className={`h-12 rounded-2xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 pl-12 pr-4 text-base font-medium ${theme === 'dark'
                                            ? 'bg-gray-800/60 border-gray-600 text-white placeholder:text-gray-400 hover:bg-gray-800/80 hover:border-gray-500'
                                            : 'bg-gray-50/80 border-gray-300 hover:bg-white hover:border-gray-400 focus:bg-white'
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Login Button */}
                            <Button
                                onClick={handleLogin}
                                className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* --- Back to Home Button --- */}
                <div className="text-center mt-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className={`rounded-xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105 ${theme === 'dark'
                            ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                            : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                    >
                        ← Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
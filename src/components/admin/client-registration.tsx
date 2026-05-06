import { useState } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
} from "@/components/ui/select"
import { User, Mail, Phone, Lock, Target, Eye, EyeOff, UserPlus, RotateCcw, Loader2, Dumbbell, Flame, Move } from 'lucide-react'

interface RegisterClientProps {
    closeModal?: () => void;
}

const RegisterClient = ({ closeModal }: RegisterClientProps) => {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [goal, setGoal] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {}
        if (!fullName.trim()) newErrors.fullName = 'Name is required'
        if (!email.trim()) newErrors.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format'
        if (!phone.trim()) newErrors.phone = 'Phone number is required'
        if (!password) newErrors.password = 'Password is required'
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'
        if (!goal) newErrors.goal = 'Fitness goal is required'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }
    const handleSignUp = async () => {
        if (!validateForm()) {
            toast.warning("⚠️ Invalid form submission", {
                description: "Please fix the highlighted errors before proceeding.",
                className: 'toast-warning',
            });
            return;
        }

        setLoading(true);
        setErrors({});

        const toastId = toast.loading("⏳ Creating client account...");

        // Check if client already exists in database
        const { data: existingClients } = await supabase
            .from('clients')
            .select('email')
            .eq('email', email);

        if (existingClients && existingClients.length > 0) {
            toast.dismiss(toastId);
            toast.error("👤 Client Already Exists", {
                description: `A client with email ${email} is already registered in the system.`,
                className: 'toast-error',
                duration: 7000,
            });
            setErrors({ email: 'This email is already registered as a client' });
            setLoading(false);
            return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: fullName,
                },
            },
        });

        if (signUpError) {
            toast.dismiss(toastId);

            // Handle specific case where user already exists
            if (signUpError.message?.includes('User already registered') ||
                signUpError.message?.includes('already been registered') ||
                signUpError.message?.includes('already exists')) {
                toast.error("👤 Account Already Exists", {
                    description: `An account with email ${email} already exists. Please use a different email or contact the client to use their existing account.`,
                    className: 'toast-error',
                    duration: 7000,
                });
                setErrors({ email: 'This email is already registered' });
            } else {
                toast.error("❌ Sign-up failed", {
                    description: signUpError.message || "Please try again.",
                    className: 'toast-error',
                    duration: 5000,
                });
            }
            setLoading(false);
            return;
        }

        const userId = signUpData.user?.id;
        if (userId) {
            const { error: insertError } = await supabase.from('clients').insert([
                {
                    id: userId,
                    email,
                    full_name: fullName,
                    phone,
                    goal,
                },
            ]);

            toast.dismiss(toastId);

            if (insertError) {
                toast.error("⚠️ Account created, but...", {
                    description: "Failed to save client details to the database.",
                    className: 'toast-warning',
                    duration: 5000,
                });
                console.error(insertError);
            } else {
                toast.success("✅ Client registered successfully!", {
                    description: `${fullName} has been added to the client list.`,
                    className: 'toast-success',
                    duration: 4000,
                });
                clearForm();
                closeModal?.();
            }
        } else {
            toast.dismiss(toastId);
            toast.error("❌ Unknown error", {
                description: "User ID not returned after sign-up.",
                className: 'toast-error',
                duration: 5000,
            });
        }

        setLoading(false);
    };

    const clearForm = () => {
        setFullName('')
        setEmail('')
        setPhone('')
        setPassword('')
        setGoal('')
        setErrors({})
        setShowPassword(false)
    }

    return (
        <div className="relative bg-gradient-to-br from-white via-purple-50/30 to-pink-50/50 dark:from-gray-900 dark:via-purple-950/20 dark:to-pink-950/30">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
            <div className="relative px-4 sm:px-6 py-6 max-w-xl w-full mx-auto space-y-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="space-y-6">
                    <div className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm sm:text-base font-medium text-foreground flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                Name
                            </Label>
                            <Input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' })) }}
                                placeholder="Enter name"
                                className={`h-11 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300 ${errors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''}`}
                            />
                            {errors.fullName && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                    <p className="text-sm">{errors.fullName}</p>
                                </div>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm sm:text-base font-medium text-foreground flex items-center gap-2">
                                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }))
                                }}
                                placeholder="your.email@example.com"
                                className={`h-11 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''}`}
                            />
                            {errors.email && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                    <p className="text-sm">{errors.email}</p>
                                </div>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm sm:text-base font-medium text-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })) }}
                                placeholder="012-3456789"
                                className={`h-11 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300 ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''}`}
                            />
                            {errors.phone && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                    <p className="text-sm">{errors.phone}</p>
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm sm:text-base font-medium text-foreground flex items-center gap-2">
                                <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })) }}
                                    placeholder="Create a secure password"
                                    className={`h-11 pr-12 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''}`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {errors.password && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                    <p className="text-sm">{errors.password}</p>
                                </div>
                            )}
                        </div>

                        {/* Fitness Goal */}
                        <div className="space-y-2">
                            <Label htmlFor="goal" className="text-sm sm:text-base font-mediumtext-foreground flex items-center gap-2">
                                <Target className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                Primary Goal
                            </Label>
                            <Select
                                value={goal}
                                onValueChange={(value) => {
                                    setGoal(value);
                                    if (errors.goal) setErrors(prev => ({ ...prev, goal: '' }));
                                }}
                            >
                                <SelectTrigger
                                    id="goal"
                                    className={`w-full h-11 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300 ${errors.goal ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <SelectValue placeholder="Choose your fitness goal" className="text-sm font-medium" />
                                    </div>
                                </SelectTrigger>

                                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-purple-200/70 dark:border-purple-800/50 rounded-xl shadow-lg">
                                    <SelectItem value="lean body">
                                        <div className="flex items-center gap-2">
                                            <Move className="w-4 h-4 text-blue-500" />
                                            <span>Lean Body</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="bulking">
                                        <div className="flex items-center gap-2">
                                            <Dumbbell className="w-4 h-4 text-yellow-500" />
                                            <span>Bulking</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="cutting">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-red-500" />
                                            <span>Cutting</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.goal && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                    <p className="text-sm">{errors.goal}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Action Buttons */}
                    <div className="pt-6 border-t border-purple-200/50 dark:border-purple-800/30">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearForm}
                                disabled={loading}
                                className="flex-1 h-12 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700 text-purple-700 dark:text-purple-300 font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Clear Form
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !fullName || !email || !phone || !password || !goal}
                                className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Register Client
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RegisterClient
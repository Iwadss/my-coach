// Shared Tailwind class strings for every auth-flow form field. Previously
// redeclared byte-for-byte (or near enough) in Login, SignUp, CoachSignUp,
// ForgotPassword, and ResetPassword — one page's copy had drifted to
// `dark:text-white/42` where every other page used `/45`, which is exactly
// the kind of silent inconsistency duplicating a style constant invites.
// This is the single source now.

export const authLabelCls =
    'font-[\'JetBrains_Mono\'] text-[10px] font-medium uppercase tracking-[1.4px] text-[#14140f]/50 dark:text-white/45'

export const authInputCls =
    'h-[52px] rounded-xl border border-[#d8d8cd] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-[18px] text-[15px] text-[#14140f] dark:text-white placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:ring-[#ccff00]/40 focus-visible:border-[#a8cf00] dark:focus-visible:border-[#ccff00]'

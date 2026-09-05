// src/components/coach/coach-settings.tsx
//
// Layout and component language kept in lockstep with
// src/pages/client/ClientSettings.tsx: same card background/border/radius/
// padding, same input/button classes, same view-card-plus-edit-dialog
// pattern for the profile section. The one deliberate difference is color
// tokens — this page has no `dark:` variants because coach-shell.tsx is
// fixed-dark by design (not tied to the app's light/dark toggle), so every
// class here is just the dark half of the equivalent client-side class.
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import CoachShell from '@/components/coach/coach-shell'
import { useCoachBillingGuard } from '@/hooks/use-coach-billing-guard'
import { payWithStripe, GRACE_PERIOD_DAYS, SUBSCRIPTION_PRICE_LABEL } from '@/lib/billing'
import { Eye, EyeOff, Copy, Pencil, CreditCard } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const BIO_MAX = 240

// A heads-up window ahead of the actual 5-day grace period (GRACE_PERIOD_DAYS)
// — purely a "renew soon" nudge in this card, doesn't affect access.
const RENEWAL_NUDGE_DAYS = 7

// Same values as the client-facing equivalent (clients.gender) for
// consistency across the app.
const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

interface Draft {
    fullName: string
    phone: string
    bio: string
    gender: string
    specialty: string
}

export default function CoachSettings() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [bio, setBio] = useState('')
    const [gender, setGender] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [coachCode, setCoachCode] = useState<string | null>(null)

    // Profile card is view-only; Edit opens this modal on a draft copy of
    // the fields above. Nothing is written until "Save changes" — Cancel
    // (or closing the dialog) just discards the draft. Matches
    // ClientSettings.tsx's "Your details" edit flow exactly.
    const [editOpen, setEditOpen] = useState(false)
    const [draft, setDraft] = useState<Draft | null>(null)

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    // Real subscription state (coach_billing) — same hook CoachAuthGuard and
    // CoachSubscriptionBanner use, so this card can never disagree with them.
    const { state: billingState, billing } = useCoachBillingGuard()
    const [paying, setPaying] = useState(false)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const [{ data: profile }, { data: coach }] = await Promise.all([
                supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
                supabase.from('coaches').select('phone, bio, coach_code, gender, specialty').eq('id', user.id).maybeSingle(),
            ])

            if (profile) {
                setFullName(profile.full_name ?? '')
                setEmail(profile.email ?? user.email ?? '')
            }
            if (coach) {
                setPhone(coach.phone ?? '')
                setBio(coach.bio ?? '')
                setCoachCode(coach.coach_code ?? null)
                setGender(coach.gender ?? '')
                setSpecialty(coach.specialty ?? '')
            }
            setLoading(false)
        }
        load()
    }, [])

    const openEdit = () => {
        setDraft({ fullName, phone, bio, gender, specialty })
        setEditOpen(true)
    }

    const handleSaveProfile = async () => {
        if (!draft) return
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSaving(false); return }

        const [{ error: profileError }, { error: coachError }] = await Promise.all([
            supabase.from('profiles').update({ full_name: draft.fullName || null }).eq('id', user.id),
            supabase.from('coaches').update({
                phone: draft.phone || null,
                bio: draft.bio || null,
                gender: draft.gender || null,
                specialty: draft.specialty || null,
            }).eq('id', user.id),
        ])

        setSaving(false)

        const error = profileError || coachError
        if (error) {
            toast.error('❌ Could not save profile', { description: error.message, className: 'toast-error' })
            return
        }

        setFullName(draft.fullName)
        setPhone(draft.phone)
        setBio(draft.bio)
        setGender(draft.gender)
        setSpecialty(draft.specialty)
        setEditOpen(false)
        toast.success('✅ Profile updated', { className: 'toast-success' })
    }

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match')
            return
        }
        setPasswordError('')
        setChangingPassword(true)

        const { error } = await supabase.auth.updateUser({ password: newPassword })
        setChangingPassword(false)

        if (error) {
            toast.error('❌ Could not update password', { description: error.message, className: 'toast-error' })
            return
        }

        toast.success('✅ Password updated', { className: 'toast-success' })
        setNewPassword('')
        setConfirmPassword('')
    }

    const handleCopyId = async () => {
        if (!coachCode) return
        try {
            await navigator.clipboard.writeText(coachCode)
            toast.success('Coach ID copied', { className: 'toast-success' })
        } catch {
            toast.error('Could not copy', { description: coachCode, className: 'toast-error' })
        }
    }

    const handlePay = async () => {
        setPaying(true)
        try {
            await payWithStripe()
        } catch (err) {
            setPaying(false)
            toast.error('❌ Could not start checkout', { description: err instanceof Error ? err.message : 'Please try again.', className: 'toast-error' })
        }
        // On success payWithStripe() navigates away — no need to clear `paying`.
    }

    return (
        <CoachShell active="settings" kicker="Account" title="Settings" blurb="Your public profile, coach ID, and subscription.">
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-white/40 text-sm">
                    <Spinner className="w-4 h-4" /> Loading…
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[22px] items-start">
                    <div className="flex flex-col gap-3.5">
                        <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="flex items-center justify-between">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Coach profile</div>
                                <button
                                    type="button"
                                    onClick={openEdit}
                                    className="flex items-center gap-1.5 text-[12px] font-medium text-white/60 hover:text-[#ccff00] transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                                <ViewField label="Full name" value={fullName} />
                                <ViewField label="Email" value={email} />
                                <ViewField label="Phone" value={phone} />
                                <ViewField label="Specialty" value={specialty} />
                                <ViewField label="Gender" value={GENDERS.find((g) => g.value === gender)?.label ?? ''} />
                            </div>
                            <div className="mt-4 flex flex-col gap-1">
                                <span className="text-[11px] text-white/40">Public bio</span>
                                <p className={`text-[13px] leading-relaxed ${bio ? 'text-white/75' : 'text-white/30'}`}>{bio || 'Not set'}</p>
                            </div>
                        </div>

                        <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Change password</div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <Field label="New password">
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); if (passwordError) setPasswordError('') }}
                                            placeholder="Enter a new password"
                                            className={`${inputCls} pr-10`}
                                        />
                                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </Field>
                                <Field label="Confirm password">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); if (passwordError) setPasswordError('') }}
                                        placeholder="Re-enter your new password"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                            {passwordError && <p className="mt-2.5 text-[12px] text-[#ff6b52]">{passwordError}</p>}
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                disabled={changingPassword || !newPassword || !confirmPassword}
                                className="mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-[22px] py-3 font-semibold text-[12.5px] hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
                            >
                                {changingPassword ? 'Updating…' : 'Update password'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Coach ID</div>
                            <div className="mt-3 flex gap-1.5">
                                {(coachCode ?? '····').split('').map((ch, i) => (
                                    <span key={i} className={`flex-1 h-[54px] rounded-[14px] bg-[#1a1a1a] border flex items-center justify-center font-['JetBrains_Mono'] text-xl ${i === 0 ? 'border-[#ccff00]' : 'border-[#2a2a2a]'}`}>{ch}</span>
                                ))}
                            </div>
                            <p className="mt-3 text-[11.5px] leading-relaxed text-white/42">Issued when your application was approved. It can't be changed — share it with new clients.</p>
                            <button
                                type="button"
                                onClick={handleCopyId}
                                disabled={!coachCode}
                                className="mt-3.5 w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full py-3 text-white font-medium text-[12.5px] hover:border-[#ccff00] hover:text-[#ccff00] transition-colors disabled:opacity-40"
                            >
                                <Copy className="w-3.5 h-3.5" /> Copy coach ID
                            </button>
                        </div>

                        <SubscriptionCard billingState={billingState} billing={billing} paying={paying} onPay={handlePay} />
                    </div>
                </div>
            )}

            {/* Edit-profile modal — operates on a draft, only committed on Save.
                Same chrome as ClientSettings.tsx's "Edit your details" dialog. */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide">Edit coach profile</DialogTitle>
                        <DialogDescription className="!text-white/45">Nothing changes until you hit "Save changes."</DialogDescription>
                    </DialogHeader>

                    {draft && (
                        <div className="flex flex-col gap-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <Field label="Full name">
                                    <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="Your name" className={inputCls} />
                                </Field>
                                <Field label="Phone">
                                    <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="012-3456789" className={inputCls} />
                                </Field>
                            </div>

                            <Field label="Specialty">
                                <input value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })} placeholder="e.g. Strength & conditioning" className={inputCls} />
                            </Field>

                            <Field label="Gender">
                                <div className="flex gap-1.5">
                                    {GENDERS.map((g) => (
                                        <button
                                            key={g.value}
                                            type="button"
                                            onClick={() => setDraft({ ...draft, gender: g.value })}
                                            className={`flex-1 rounded-xl py-3 px-1 text-[11px] font-medium border transition-colors ${draft.gender === g.value ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : 'bg-[#1a1a1a] border-[#2a2a2a] text-white/60'}`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <label className="flex flex-col gap-1.5">
                                <span className="flex items-center text-[11.5px] text-white/50">
                                    Public bio
                                    <span className={`ml-auto font-['JetBrains_Mono'] text-[11px] ${draft.bio.length > BIO_MAX ? 'text-[#ff6b52]' : 'text-white/40'}`}>{draft.bio.length}/{BIO_MAX}</span>
                                </span>
                                <textarea
                                    value={draft.bio}
                                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                                    placeholder="Tell clients what you specialise in"
                                    className={`${inputCls} min-h-[96px] resize-y`}
                                />
                            </label>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-white/60 border border-[#2a2a2a] hover:text-white transition-colors">
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-[22px] py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </CoachShell>
    )
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[13px] px-4 py-3.5 text-white text-[13.5px] placeholder:text-white/35 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2'

// Real coach_billing data (via useCoachBillingGuard, same hook CoachAuthGuard
// and CoachSubscriptionBanner use) — status, expiry, and a Stripe button
// that's always available, not just once nearing/past expiry, so an early
// renewal (payWithStripe -> stripe_apply_successful_payment's "pay before
// expiry appends the new 30 days" rule) actually has somewhere to happen.
function SubscriptionCard({
    billingState, billing, paying, onPay,
}: {
    billingState: 'checking' | 'ok' | 'grace' | 'blocked'
    billing: { subscription_status: 'inactive' | 'active'; subscription_expiry: string | null; access_override: 'none' | 'granted' | 'blocked' } | null
    paying: boolean
    onPay: () => void
}) {
    const isGranted = billing?.access_override === 'granted'
    const isAdminBlocked = billing?.access_override === 'blocked'

    const daysUntilExpiry = billing?.subscription_expiry
        ? Math.ceil((new Date(billing.subscription_expiry).getTime() - Date.now()) / 86400000)
        : null
    const nearingExpiry = daysUntilExpiry !== null && daysUntilExpiry <= RENEWAL_NUDGE_DAYS

    let label = 'Not subscribed yet'
    let toneCls = 'text-white/60'
    if (isAdminBlocked) { label = 'Access blocked by an administrator'; toneCls = 'text-[#ff6b52]' }
    else if (isGranted) { label = 'Access granted by an administrator'; toneCls = 'text-[#ccff00]' }
    else if (billingState === 'blocked') { label = 'Suspended — payment overdue'; toneCls = 'text-[#ff6b52]' }
    else if (billingState === 'grace') { label = 'Grace period — renew now to avoid suspension'; toneCls = 'text-[#ffb020]' }
    else if (billing?.subscription_status === 'active' && nearingExpiry) { label = 'Renew soon'; toneCls = 'text-[#ffb020]' }
    else if (billing?.subscription_status === 'active') { label = 'Active'; toneCls = 'text-[#ccff00]' }

    const payLabel = billing?.subscription_status === 'active' && !nearingExpiry ? 'Renew early' : 'Pay with Stripe'

    return (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-[20px] p-[22px]">
            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#ccff00]">Manage subscription</div>

            <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] text-white/40">Status</span>
                <span className={`text-[13.5px] font-semibold ${toneCls}`}>{label}</span>
            </div>

            <div className="mt-2.5 flex flex-col gap-1">
                <span className="text-[11px] text-white/40">{billing?.subscription_status === 'active' && daysUntilExpiry !== null && daysUntilExpiry >= 0 ? 'Active until' : billing?.subscription_expiry ? 'Expired on' : 'Price'}</span>
                <span className="text-[13.5px] font-medium">
                    {billing?.subscription_expiry
                        ? new Date(billing.subscription_expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                        : SUBSCRIPTION_PRICE_LABEL}
                </span>
            </div>

            {billingState === 'grace' && (
                <div className="mt-3.5 bg-[rgba(255,176,32,.08)] border border-[rgba(255,176,32,.25)] rounded-[12px] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#ffb020]">
                    Your subscription expired — renew within {GRACE_PERIOD_DAYS} days of that date or your account will be automatically suspended.
                </div>
            )}
            {billingState === 'blocked' && !isAdminBlocked && (
                <div className="mt-3.5 bg-[rgba(255,107,82,.08)] border border-[rgba(255,107,82,.25)] rounded-[12px] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#ff6b52]">
                    Your account is suspended for non-payment. Pay to regain access immediately — it's automatic, no admin review needed.
                </div>
            )}

            {!isGranted && !isAdminBlocked && (
                <button
                    type="button"
                    onClick={onPay}
                    disabled={paying}
                    className="mt-3.5 w-full inline-flex items-center justify-center gap-2 bg-[#ccff00] text-[#0a0a0a] rounded-full py-3 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                >
                    {paying ? <Spinner className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    {payLabel} — {SUBSCRIPTION_PRICE_LABEL}
                </button>
            )}
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] text-white/50">{label}</span>
            {children}
        </label>
    )
}

function ViewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] text-white/40">{label}</span>
            <span className={`text-[13.5px] font-medium truncate ${value ? '' : 'text-white/30'}`}>{value || 'Not set'}</span>
        </div>
    )
}

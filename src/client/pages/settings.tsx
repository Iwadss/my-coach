// src/client/pages/settings.tsx
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import ClientShell, { initials } from '@/client/components/client-shell'
import CoachPicker from '@/shared/components/coach-picker'
import { changeCoach } from '@/shared/lib/coach-clients'
import { Eye, EyeOff, Pencil, Sun, Moon, Monitor } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Slider } from '@/components/ui/slider'
import { useTheme } from '@/app/theme-provider'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const GOALS = [
    { value: 'lean body', label: 'Lean body' },
    { value: 'bulking', label: 'Bulking' },
    { value: 'cutting', label: 'Cutting' },
]

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
]

const HEIGHT_MIN = 100
const HEIGHT_MAX = 250

const toNum = (s: string): number | null => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
}

const THEMES: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
]

interface Coach {
    name: string
    code: string | null
    linkedSince: string | null
}

interface Draft {
    fullName: string
    phone: string
    goal: string
    gender: string
    height: number
    weight: string
}

export default function ClientSettings() {
    const navigate = useNavigate()
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [changingPassword, setChangingPassword] = React.useState(false)

    const [email, setEmail] = React.useState('')
    const [fullName, setFullName] = React.useState('')
    const [phone, setPhone] = React.useState('')
    const [goal, setGoal] = React.useState('')
    const [gender, setGender] = React.useState('')
    const [height, setHeight] = React.useState('')
    const [weight, setWeight] = React.useState('')

    // Your-details card is view-only; Edit opens this modal on a draft copy
    // of the fields above. Nothing is written until "Save changes" — Cancel
    // (or closing the dialog) just discards the draft.
    const [editOpen, setEditOpen] = React.useState(false)
    const [draft, setDraft] = React.useState<Draft | null>(null)
    // The height slider always renders at *some* position — it can't be
    // visually "empty" the way a text input can. This tracks whether that
    // position actually reflects a real value (either already on file, or
    // set this session) so an untouched slider on a client with no height
    // recorded doesn't silently write a fabricated number on save.
    const [heightIsSet, setHeightIsSet] = React.useState(false)

    const [newPassword, setNewPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [showPassword, setShowPassword] = React.useState(false)
    const [passwordError, setPasswordError] = React.useState('')

    const { theme, setTheme } = useTheme()
    const [coach, setCoach] = React.useState<Coach | null>(null)

    // "Change coach" dialog
    const [changeCoachOpen, setChangeCoachOpen] = React.useState(false)
    const [newCoachId, setNewCoachId] = React.useState('')
    const [changingCoach, setChangingCoach] = React.useState(false)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const [{ data }, { data: rel }] = await Promise.all([
                supabase.from('clients').select('full_name, phone, goal, email, gender, height_cm, weight_kg').eq('id', user.id).maybeSingle(),
                supabase
                    .from('coach_clients')
                    .select('requested_at, reviewed_at, coach:coaches!coach_clients_coach_id_fkey(coach_code, profile:profiles!coaches_id_fkey(full_name, email))')
                    .eq('client_id', user.id)
                    .eq('status', 'approved')
                    .maybeSingle(),
            ])

            if (data) {
                setFullName(data.full_name ?? '')
                setPhone(data.phone ?? '')
                setGoal(data.goal ?? '')
                setEmail(data.email ?? user.email ?? '')
                setGender(data.gender ?? '')
                setHeight(data.height_cm != null ? String(data.height_cm) : '')
                setWeight(data.weight_kg != null ? String(data.weight_kg) : '')
            }

            const coachData = rel?.coach as unknown as { coach_code: string | null; profile: { full_name: string | null; email: string } } | null
            if (coachData) {
                setCoach({
                    name: coachData.profile.full_name || coachData.profile.email,
                    code: coachData.coach_code,
                    linkedSince: rel?.reviewed_at ?? rel?.requested_at ?? null,
                })
            }

            setLoading(false)
        }
        load()
    }, [])

    const openEdit = () => {
        const parsedHeight = toNum(height)
        setDraft({ fullName, phone, goal, gender, height: parsedHeight ?? 170, weight })
        setHeightIsSet(parsedHeight !== null)
        setEditOpen(true)
    }

    const handleSaveProfile = async () => {
        if (!draft) return
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSaving(false); return }

        const { error } = await supabase
            .from('clients')
            .update({
                full_name: draft.fullName || null,
                phone: draft.phone || null,
                goal: draft.goal || null,
                gender: draft.gender || null,
                height_cm: heightIsSet ? draft.height : null,
                weight_kg: toNum(draft.weight),
            })
            .eq('id', user.id)

        setSaving(false)

        if (error) {
            toast.error('❌ Could not save profile', { description: error.message, className: 'toast-error' })
            return
        }

        setFullName(draft.fullName)
        setPhone(draft.phone)
        setGoal(draft.goal)
        setGender(draft.gender)
        setHeight(heightIsSet ? String(draft.height) : '')
        setWeight(draft.weight)
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

    // Ends the current approved link and files a pending request with the
    // new coach — the same mechanism sign-up.tsx uses, just re-entered from
    // Settings. Also the mechanism ClientAuthGuard's "Change Coach" button
    // uses when the linked coach is expired/suspended — see shared/lib/coach-clients.ts.
    const handleChangeCoach = async () => {
        if (!newCoachId) return
        setChangingCoach(true)

        try {
            await changeCoach(newCoachId)
        } catch (err) {
            setChangingCoach(false)
            toast.error('❌ Could not change coach', { description: err instanceof Error ? err.message : 'Please try again.', className: 'toast-error' })
            return
        }

        setChangingCoach(false)
        toast.success('✅ Request sent', {
            description: "You'll be able to train again once your new coach approves you.",
            className: 'toast-success',
        })
        navigate('/pending-approval')
    }

    return (
        <ClientShell active="settings" kicker="Account" title="Settings" blurb="Your details, theme, and the coach you're linked to.">
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[#14140f]/40 dark:text-white/40 text-sm">
                    <Spinner className="w-4 h-4" /> Loading…
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[22px] items-start">
                    <div className="flex flex-col gap-3.5">
                        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="flex items-center justify-between">
                                <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Your details</div>
                                <button
                                    type="button"
                                    onClick={openEdit}
                                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#14140f]/60 dark:text-white/60 hover:text-[#6f8c00] dark:hover:text-[#ccff00] transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                                <ViewField label="Full name" value={fullName} />
                                <ViewField label="Email" value={email} />
                                <ViewField label="Phone" value={phone} />
                                <ViewField label="Height" value={height ? `${height} cm` : ''} />
                                <ViewField label="Weight" value={weight ? `${weight} kg` : ''} />
                                <ViewField label="Gender" value={GENDERS.find((g) => g.value === gender)?.label ?? ''} />
                                <ViewField label="Training goal" value={GOALS.find((g) => g.value === goal)?.label ?? ''} />
                            </div>
                        </div>

                        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Change password</div>
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
                                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#14140f]/40 dark:text-white/40 hover:text-[#14140f] dark:hover:text-white">
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
                            {passwordError && <p className="mt-2.5 text-[12px] text-[#c8432a] dark:text-[#ff6b52]">{passwordError}</p>}
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                disabled={changingPassword || !newPassword || !confirmPassword}
                                className="mt-4 bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] rounded-full px-[22px] py-3 font-semibold text-[12.5px] hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
                            >
                                {changingPassword ? 'Updating…' : 'Update password'}
                            </button>
                        </div>

                        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#14140f]/40 dark:text-white/40">Theme</div>
                            <p className="mt-1.5 text-[11.5px] text-[#14140f]/45 dark:text-white/45">Choose how MyCoach looks on this device.</p>
                            <div className="mt-3.5 grid grid-cols-3 gap-1.5">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTheme(t.value)}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl py-3.5 text-[12px] font-medium border transition-colors ${theme === t.value ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f]/60 dark:text-white/60'}`}
                                    >
                                        <t.icon className="w-4 h-4" strokeWidth={1.8} />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <div className="bg-[#f0f0e9] dark:bg-[#0d0d0d] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#6f8c00] dark:text-[#ccff00]">Linked coach</div>
                            {coach ? (
                                <>
                                    <div className="mt-3.5 flex items-center gap-3">
                                        <span className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] flex items-center justify-center font-semibold text-[13px] text-[#14140f]/75 dark:text-white/75 flex-none">
                                            {initials(coach.name)}
                                        </span>
                                        <div>
                                            <div className="font-medium text-[13.5px]">{coach.name}</div>
                                            {coach.code && <div className="mt-0.5 font-['JetBrains_Mono'] text-[11.5px] tracking-[1.5px] text-[#6f8c00] dark:text-[#ccff00]">ID {coach.code}</div>}
                                        </div>
                                    </div>
                                    {coach.linkedSince && (
                                        <div className="mt-3.5 text-[11.5px] leading-relaxed text-[#14140f]/42 dark:text-white/42">
                                            Linked since {format(parseISO(coach.linkedSince), 'd MMM yyyy')}.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="mt-3.5 text-[12.5px] text-[#14140f]/45 dark:text-white/45">You don't have a coach linked yet.</p>
                            )}
                        </div>

                        <div className="bg-[#f7f7f2] dark:bg-[#111] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-[20px] p-[22px]">
                            <div className="font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.8px] uppercase text-[#14140f]/40 dark:text-white/40">Change coach</div>
                            <div className="mt-2.5 text-[11.5px] leading-relaxed text-[#14140f]/50 dark:text-white/50">
                                Pick a different coach. Your current link ends immediately and you'll wait for your new coach to approve you, same as when you first signed up.
                            </div>
                            <button
                                type="button"
                                onClick={() => setChangeCoachOpen(true)}
                                className="mt-3.5 w-full rounded-full py-3 font-medium text-[12.5px] text-[#14140f] dark:text-white border border-[#d8d8cd] dark:border-[#2a2a2a] transition-colors hover:border-[#ccff00] hover:text-[#6f8c00] dark:hover:text-[#ccff00]"
                            >
                                Change coach
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit-details modal — operates on a draft, only committed on Save */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="!bg-[#f7f7f2] dark:!bg-[#111] !border-[#e2e2d9] dark:!border-[#1f1f1f] !text-[#14140f] dark:!text-white sm:!max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">Edit your details</DialogTitle>
                        <DialogDescription className="!text-[#14140f]/45 dark:!text-white/45">Nothing changes until you hit "Save changes."</DialogDescription>
                    </DialogHeader>

                    {draft && (
                        <div className="flex flex-col gap-3.5">
                            {/* Top section: left column stacks name/phone/weight/gender full-width;
                                right column is the height slider, stretched to match the left
                                column's total height (CSS Grid's default row stretch). */}
                            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3.5 items-stretch">
                                <div className="flex flex-col gap-3.5">
                                    <Field label="Full name">
                                        <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="Your name" className={inputCls} />
                                    </Field>
                                    <Field label="Phone">
                                        <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="012-3456789" className={inputCls} />
                                    </Field>
                                    <Field label="Weight (kg)">
                                        <input
                                            value={draft.weight}
                                            onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                                            placeholder="e.g. 68.4"
                                            inputMode="decimal"
                                            className={`${inputCls} font-['JetBrains_Mono']`}
                                        />
                                    </Field>
                                    <Field label="Gender">
                                        <div className="flex gap-1.5">
                                            {GENDERS.map((g) => (
                                                <button
                                                    key={g.value}
                                                    type="button"
                                                    onClick={() => setDraft({ ...draft, gender: g.value })}
                                                    className={`flex-1 rounded-xl py-3 px-1 text-[11px] font-medium border transition-colors ${draft.gender === g.value ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f]/60 dark:text-white/60'}`}
                                                >
                                                    {g.label}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                </div>

                                <div className="h-full flex flex-col items-center justify-center bg-[#f0f0e9] dark:bg-[#0d0d0d] border border-[#e2e2d9] dark:border-[#1f1f1f] rounded-2xl py-5">
                                    <HeightSelector
                                        value={draft.height}
                                        isSet={heightIsSet}
                                        onChange={(v) => {
                                            setDraft({ ...draft, height: v })
                                            setHeightIsSet(true)
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bottom section: Training goal spans the full width below both columns */}
                            <Field label="Training goal">
                                <div className="flex gap-1.5">
                                    {GOALS.map((g) => (
                                        <button
                                            key={g.value}
                                            type="button"
                                            onClick={() => setDraft({ ...draft, goal: g.value })}
                                            className={`flex-1 rounded-xl py-3 text-[12px] font-medium border transition-colors ${draft.goal === g.value ? 'bg-[#ccff00] border-[#ccff00] text-[#0a0a0a]' : 'bg-white dark:bg-[#1a1a1a] border-[#d8d8cd] dark:border-[#2a2a2a] text-[#14140f]/60 dark:text-white/60'}`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-[#14140f]/60 dark:text-white/60 border border-[#d8d8cd] dark:border-[#2a2a2a] hover:text-[#14140f] dark:hover:text-white transition-colors">
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

            {/* Change-coach modal */}
            <Dialog
                open={changeCoachOpen}
                onOpenChange={(open) => {
                    setChangeCoachOpen(open)
                    if (!open) setNewCoachId('')
                }}
            >
                <DialogContent className="!bg-[#f7f7f2] dark:!bg-[#111] !border-[#e2e2d9] dark:!border-[#1f1f1f] !text-[#14140f] dark:!text-white sm:!max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="!text-[#14140f] dark:!text-white font-['Anton'] text-xl uppercase tracking-wide">Change coach</DialogTitle>
                        <DialogDescription className="!text-[#14140f]/45 dark:!text-white/45">
                            {coach ? `You're currently linked to ${coach.name}. ` : ''}
                            Picking a new coach ends that link right away — you'll need their approval before you can train again.
                        </DialogDescription>
                    </DialogHeader>

                    <CoachPicker value={newCoachId} onChange={setNewCoachId} disabled={changingCoach} />

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="rounded-full px-5 py-2.5 text-[12.5px] font-medium text-[#14140f]/60 dark:text-white/60 border border-[#d8d8cd] dark:border-[#2a2a2a] hover:text-[#14140f] dark:hover:text-white transition-colors">
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            onClick={handleChangeCoach}
                            disabled={!newCoachId || changingCoach}
                            className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-[22px] py-2.5 font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors disabled:opacity-50"
                        >
                            {changingCoach ? 'Sending…' : 'Send request'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ClientShell>
    )
}

const inputCls = 'w-full bg-white dark:bg-[#1a1a1a] border border-[#d8d8cd] dark:border-[#2a2a2a] rounded-[13px] px-4 py-3.5 text-[#14140f] dark:text-white text-[13.5px] placeholder:text-[#14140f]/35 dark:placeholder:text-white/35 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] text-[#14140f]/50 dark:text-white/50">{label}</span>
            {children}
        </label>
    )
}

function ViewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] text-[#14140f]/40 dark:text-white/40">{label}</span>
            <span className={`text-[13.5px] font-medium truncate ${value ? '' : 'text-[#14140f]/30 dark:text-white/30'}`}>{value || 'Not set'}</span>
        </div>
    )
}

// Built on the shadcn slider-height-selector primitive (Radix Slider,
// vertical) — recolored to the app's lime/dark palette via arbitrary
// selectors on the sub-parts rather than editing the shared slider.tsx.
function HeightSelector({ value, isSet, onChange }: { value: number; isSet: boolean; onChange: (v: number) => void }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-[11.5px] text-[#14140f]/50 dark:text-white/50">Height</span>
            <Slider
                className="h-48 [&_[data-slot=slider-track]]:bg-[#e2e2d9] dark:[&_[data-slot=slider-track]]:bg-[#232323] [&_[data-slot=slider-range]]:bg-[#ccff00] [&_[data-slot=slider-thumb]]:bg-white dark:[&_[data-slot=slider-thumb]]:bg-[#0a0a0a] [&_[data-slot=slider-thumb]]:border-[#ccff00] [&_[data-slot=slider-thumb]]:ring-[#ccff00]/30"
                orientation="vertical"
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                step={1}
                value={[value]}
                onValueChange={(v) => onChange(v[0])}
            />
            <span className={`font-['JetBrains_Mono'] text-[15px] font-semibold ${isSet ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f]/35 dark:text-white/35'}`}>
                {isSet ? `${value} cm` : 'Drag to set'}
            </span>
        </div>
    )
}

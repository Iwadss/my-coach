// src/coach/components/coach-shell.tsx
//
// Shared chrome for every coach page (sidebar + top bar + page header),
// ported from the "MyCoach Coach" design — same fixed-dark treatment and
// per-page-embedded-shell convention as admin-layout.tsx. The old
// <CoachHeader />-based standalone pages (appointment management, and the
// admin-era client-management/client-detail/client-edit) are gone — every
// current coach page, including /time-slots-management, is built on this
// shell instead. Settings has no nav entry — see the Tab comment below —
// it's reached via the profile card in the footer instead.
//
// Sidebar is built on the shadcn Sidebar primitive (@/components/ui/sidebar)
// — Header/Footer stay pinned, SidebarContent scrolls independently —
// matching src/client/components/client-shell.tsx, rather than the previous
// hand-rolled div (which used `lg:static`, so on desktop it sat in normal
// document flow and scrolled away with the page instead of staying pinned).
// The brand colors are fixed-dark here (not theme-aware, unlike the client
// shell) via a single set of CSS custom properties on <SidebarProvider>.
//
// Wrapped in <CoachAuthGuard> — the global payment gate — so every coach
// page gets the expired-subscription blocking modal automatically.
import * as React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { LOGO_SRC } from '@/shared/lib/brand'
import { initials } from '@/components/shared/ui'
import PageHeader from '@/components/shared/page-header'
import CoachAuthGuard from '@/coach/components/coach-auth-guard'
import CoachSubscriptionBanner from '@/coach/components/coach-subscription-banner'
import {
    Home,
    CalendarRange,
    Inbox,
    CreditCard,
    LogOut,
    Copy,
} from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar'

// Re-exported (imported above) so existing `import CoachShell, { initials }
// from '@/coach/components/coach-shell'` call sites keep working — the one
// definition now lives in shared/ui.tsx (also used by client-shell.tsx and
// the admin section).
export { initials }

// 'settings' has no nav entry below — that page is reached by clicking the
// profile card in the sidebar footer (see SelfCard) — but stays a valid Tab
// so coach-settings.tsx can still pass active="settings" (a no-op now, since
// no nav item matches it, which is correct: nothing in the list should
// highlight while on that page). Same convention as client-shell.tsx.
type Tab = 'today' | 'schedule' | 'requests' | 'earnings' | 'settings'

const navItems: { to: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tab: Tab }[] = [
    { to: '/coach-dashboard', label: 'Today', icon: Home, tab: 'today' },
    { to: '/coach-schedule', label: 'Schedule', icon: CalendarRange, tab: 'schedule' },
    { to: '/client-requests', label: 'Clients', icon: Inbox, tab: 'requests' },
    { to: '/coach-earnings', label: 'Earnings', icon: CreditCard, tab: 'earnings' },
]

interface Self {
    name: string
    coachCode: string | null
    activeClients: number
}

interface CoachShellProps {
    active: Tab
    kicker: string
    title: string
    blurb?: string
    /** Shows the top-right date. Default true — turn off only when a page
     * already surfaces the date elsewhere itself (Today puts it in the
     * kicker above the title, so it doesn't need it twice). The mobile nav
     * trigger stays either way — it's the only way to open the sidebar on
     * a phone. */
    showDate?: boolean
    children: React.ReactNode
}

// Each nav row closes the mobile sheet on click — needs useSidebar(), which
// only works below <SidebarProvider>, hence its own component rather than
// inline JSX in CoachShell.
function NavItem({ item, active, badge }: { item: (typeof navItems)[number]; active: Tab; badge: number | null }) {
    const { setOpenMobile } = useSidebar()
    const isActive = active === item.tab

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                className={`h-auto rounded-[13px] px-3 py-3 font-medium text-[13.5px] ${isActive ? 'text-[#ccff00]' : 'text-white/62'}`}
            >
                <NavLink to={item.to} onClick={() => setOpenMobile(false)}>
                    <item.icon className="w-[17px] h-[17px]" strokeWidth={1.8} />
                    <span>{item.label}</span>
                </NavLink>
            </SidebarMenuButton>
            {item.tab === 'requests' && !!badge && (
                <SidebarMenuBadge className="font-['JetBrains_Mono'] text-[10.5px] font-medium bg-[#ccff00] text-[#0a0a0a] rounded-full px-[7px] py-[2px]">{badge}</SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    )
}

// The sidebar has no "Settings" nav item — clicking your own profile card
// here is how you get to /coach-settings instead.
function SelfCard({ self }: { self: Self | null }) {
    const navigate = useNavigate()
    const { setOpenMobile } = useSidebar()

    const goToSettings = () => {
        setOpenMobile(false)
        navigate('/coach-settings')
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={goToSettings}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    goToSettings()
                }
            }}
            className="text-left w-full flex items-center gap-[11px] bg-[#141414] border border-[#232323] rounded-2xl px-[13px] py-3 cursor-pointer hover:border-[#ccff00]/40 transition-colors"
        >
            <span className="w-[34px] h-[34px] rounded-[11px] bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center font-semibold text-xs flex-none">
                {self ? initials(self.name) : '··'}
            </span>
            <span className="flex flex-col min-w-0">
                <span className="font-medium text-[12.5px] truncate">{self?.name ?? 'Loading…'}</span>
                <span className="text-[11px] text-white/42 truncate">{self ? `${self.activeClients} active client${self.activeClients === 1 ? '' : 's'}` : ''}</span>
            </span>
        </div>
    )
}

export default function CoachShell({ active, kicker, title, blurb, showDate = true, children }: CoachShellProps) {
    const navigate = useNavigate()
    const [self, setSelf] = React.useState<Self | null>(null)
    const [pendingCount, setPendingCount] = React.useState<number | null>(null)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [{ data: profile }, { data: coachRow }, { count: active }, { count: pending }] = await Promise.all([
                supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
                supabase.from('coaches').select('coach_code').eq('id', user.id).maybeSingle(),
                supabase.from('coach_clients').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'approved'),
                supabase.from('coach_clients').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'pending'),
            ])

            setSelf({
                name: profile?.full_name || profile?.email || 'Coach',
                coachCode: coachRow?.coach_code ?? null,
                activeClients: active ?? 0,
            })
            setPendingCount(pending ?? 0)
        }
        load()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const handleCopyId = async () => {
        if (!self?.coachCode) return
        try {
            await navigator.clipboard.writeText(self.coachCode)
            toast.success('Coach ID copied', { description: `Share ${self.coachCode} with new clients so they can link up.`, className: 'toast-success' })
        } catch {
            toast.error('Could not copy', { description: self.coachCode, className: 'toast-error' })
        }
    }

    return (
        <CoachAuthGuard>
            <SidebarProvider
                defaultOpen
                className={[
                    "bg-[#0a0a0a] text-white font-['Inter',system-ui,sans-serif]",
                    // Fixed-dark sidebar theming (this surface doesn't follow the
                    // app's light/dark toggle) via CSS custom properties on
                    // <SidebarProvider>, not the global --sidebar-* tokens.
                    "[--sidebar:#0d0d0d] [--sidebar-foreground:#ffffff] [--sidebar-border:#1c1c1c] [--sidebar-accent:rgba(204,255,0,.12)] [--sidebar-accent-foreground:#ccff00] [--sidebar-ring:#ccff00]",
                ].join(' ')}
            >
                {/* Sidebar — sticky header/footer, scrollable content between them.
                    Desktop: persistent column (never collapsed, no trigger shown).
                    Mobile (<768px): off-canvas sheet, opened via the top-bar trigger. */}
                <Sidebar collapsible="offcanvas">
                    <SidebarHeader className="px-[18px] pt-7 pb-2">
                        <div className="flex items-center gap-[11px] px-2">
                            <img src={LOGO_SRC} alt="MyCoach" className="w-7 h-7 rounded-[9px] object-contain flex-none" />
                            <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[2px] uppercase">MyCoach</span>
                            <span className="ml-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-[#ccff00] bg-[rgba(204,255,0,.12)] rounded-md px-[7px] py-[3px]">Coach</span>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="px-[18px] gap-[26px]">
                        <SidebarGroup className="p-0">
                            <SidebarGroupLabel className="h-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.6px] uppercase text-white/30 px-2.5 pb-2">
                                Coaching
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-1">
                                    {navItems.map((item) => (
                                        <NavItem key={item.to} item={item} active={active} badge={pendingCount} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <div className="bg-[#141414] border border-[#232323] rounded-2xl p-[14px]">
                            <div className="font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-white/35">Your coach ID</div>
                            <div className="mt-2 flex items-center gap-2.5">
                                <span className="font-['JetBrains_Mono'] text-xl tracking-[4px] text-[#ccff00]">{self?.coachCode ?? '····'}</span>
                                <button
                                    type="button"
                                    onClick={handleCopyId}
                                    disabled={!self?.coachCode}
                                    className="ml-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-[9px] w-[30px] h-[30px] flex items-center justify-center text-white/60 hover:border-[#ccff00] hover:text-[#ccff00] transition-colors disabled:opacity-40"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="mt-1.5 text-[11px] leading-relaxed text-white/40">Clients enter this to link with you.</div>
                        </div>
                    </SidebarContent>

                    <SidebarFooter className="px-[18px] pb-[22px] gap-3">
                        <SelfCard self={self} />
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex items-center justify-center gap-2 rounded-full border border-[#2a2a2a] px-3 py-2.5 font-medium text-[12.5px] text-white/70 hover:border-[#3a3a3a] hover:text-white transition-colors"
                        >
                            <LogOut className="w-[15px] h-[15px]" />
                            Sign out
                        </button>
                    </SidebarFooter>
                </Sidebar>

                {/* Main column */}
                <div className="flex-1 flex flex-col min-w-0">
                    <CoachSubscriptionBanner />
                    <div className="flex items-center gap-3.5 px-4 sm:px-9 py-4 border-b border-[#1c1c1c]">
                        <SidebarTrigger className="md:hidden text-white/60 hover:text-white hover:bg-white/5" />
                        {showDate && (
                            <div className="ml-auto flex items-center gap-2.5">
                                <span className="hidden sm:inline text-xs text-white/40">{format(new Date(), 'EEE d MMM yyyy')}</span>
                            </div>
                        )}
                    </div>

                    <PageHeader kicker={kicker} title={title} blurb={blurb} theme="dark" className="px-4 sm:px-9 pt-8" />

                    <main className="flex-1 px-4 sm:px-9 py-6 pb-12">{children}</main>
                </div>
            </SidebarProvider>
        </CoachAuthGuard>
    )
}

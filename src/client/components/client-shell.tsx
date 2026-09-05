// src/client/components/client-shell.tsx
//
// Shared chrome for every client page (sidebar + top bar + page header),
// ported from the "MyCoach Client" design. Deliberately fixed-dark (not
// tied to the app's light/dark theme toggle) — same choice admin-layout.tsx
// made for this brand surface. Each page embeds <ClientShell> itself rather
// than sitting inside a shared <Outlet> layout, matching the flat-route +
// embedded-header convention already used by the coach pages.
//
// Sidebar is built on the shadcn Sidebar primitive (@/components/ui/sidebar)
// — Header/Footer stay pinned, SidebarContent scrolls independently — rather
// than the previous hand-rolled fixed div. The brand colors (lime accent,
// near-black surface) are scoped to this sidebar via CSS custom properties
// on <SidebarProvider>, not the global --sidebar-* tokens in index.css
// (those are the generic shadcn default, unused anywhere else so far — this
// keeps them free for a future sidebar that wants a different look).
//
// Wrapped in <ClientAuthGuard> — blocks the screen if the client's linked
// coach is expired/suspended — so every client page gets it automatically.
import * as React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import supabase from '@/supabase/supabase'
import { LOGO_SRC } from '@/lib/brand'
import { initials } from '@/components/shared/ui'
import PageHeader from '@/components/shared/page-header'
import ClientAuthGuard from '@/client/components/client-auth-guard'
import {
    Home,
    CalendarPlus,
    CalendarClock,
    TrendingUp,
    LogOut,
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

// Re-exported (imported above) so existing `import ClientShell, { initials }
// from '@/client/components/client-shell'` call sites keep working — the
// one definition now lives in shared/ui.tsx (also used by coach-shell.tsx
// and the admin section).
export { initials }

// 'settings' has no nav entry below — that page is reached by clicking the
// profile card in the sidebar footer (see SelfCard) — but stays a valid Tab
// so settings.tsx can still pass active="settings" (a no-op now, since
// no nav item matches it, which is correct: nothing in the list should
// highlight while on that page).
type Tab = 'home' | 'book' | 'sessions' | 'progress' | 'settings'

const navItems: { to: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tab: Tab }[] = [
    { to: '/client-dashboard', label: 'Today', icon: Home, tab: 'home' },
    { to: '/client-book', label: 'Book a session', icon: CalendarPlus, tab: 'book' },
    { to: '/client-sessions', label: 'My sessions', icon: CalendarClock, tab: 'sessions' },
    { to: '/client-progress', label: 'Progress', icon: TrendingUp, tab: 'progress' },
]

interface SelfInfo {
    name: string
    goal: string | null
}

interface ClientShellProps {
    active: Tab
    kicker: string
    title: string
    blurb?: string
    children: React.ReactNode
}

// Each nav row closes the mobile sheet on click — needs useSidebar(), which
// only works below <SidebarProvider>, hence its own component rather than
// inline JSX in ClientShell.
function NavItem({ item, active, badge }: { item: (typeof navItems)[number]; active: Tab; badge: number | null }) {
    const { setOpenMobile } = useSidebar()
    const isActive = active === item.tab

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                className={`h-auto rounded-[13px] px-3 py-3 font-medium text-[13.5px] ${isActive ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f]/62 dark:text-white/62'}`}
            >
                <NavLink to={item.to} onClick={() => setOpenMobile(false)}>
                    <item.icon className="w-[17px] h-[17px]" strokeWidth={1.8} />
                    <span>{item.label}</span>
                </NavLink>
            </SidebarMenuButton>
            {item.tab === 'sessions' && badge !== null && badge > 0 && (
                <SidebarMenuBadge className="font-['JetBrains_Mono'] text-[11px] text-[#14140f]/35 dark:text-white/35">{badge}</SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    )
}

// The sidebar has no "Settings" nav item — clicking your own profile card
// here is how you get to /client-settings instead.
function SelfCard({ self }: { self: SelfInfo | null }) {
    const navigate = useNavigate()
    const { setOpenMobile } = useSidebar()

    const goToSettings = () => {
        setOpenMobile(false)
        navigate('/client-settings')
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
            className="text-left w-full flex items-center gap-[11px] bg-[#ececdf] dark:bg-[#141414] border border-[#e2e2d9] dark:border-[#232323] rounded-2xl px-[13px] py-3 cursor-pointer hover:border-[#ccff00]/40 transition-colors"
        >
            <span className="w-[34px] h-[34px] rounded-[11px] bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center font-semibold text-xs flex-none">
                {self ? initials(self.name) : '··'}
            </span>
            <span className="flex flex-col min-w-0">
                <span className="font-medium text-[12.5px] truncate">{self?.name ?? 'Loading…'}</span>
                <span className="text-[11px] text-[#14140f]/42 dark:text-white/42 truncate capitalize">{self?.goal ?? 'No goal set'}</span>
            </span>
        </div>
    )
}

export default function ClientShell({ active, kicker, title, blurb, children }: ClientShellProps) {
    const navigate = useNavigate()
    const [self, setSelf] = React.useState<SelfInfo | null>(null)
    const [upcomingCount, setUpcomingCount] = React.useState<number | null>(null)

    React.useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [{ data: clientRow }, { count }] = await Promise.all([
                supabase.from('clients').select('full_name, goal').eq('id', user.id).maybeSingle(),
                supabase
                    .from('bookings')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', user.id)
                    .in('status', ['pending', 'confirmed'])
                    .gte('date', format(new Date(), 'yyyy-MM-dd')),
            ])

            setSelf({ name: clientRow?.full_name || 'there', goal: clientRow?.goal ?? null })
            setUpcomingCount(count ?? 0)
        }
        load()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <ClientAuthGuard>
            <SidebarProvider
                defaultOpen
                className={[
                    "bg-white dark:bg-[#0a0a0a] text-[#14140f] dark:text-white font-['Inter',system-ui,sans-serif]",
                    // Brand-lime sidebar theming, scoped to this instance via CSS
                    // custom properties (not the global --sidebar-* tokens in
                    // index.css, which stay the generic shadcn default for any
                    // future sidebar that wants a different look) — light and
                    // dark values declared side by side so the primitive's own
                    // bg-sidebar/text-sidebar-foreground/etc. utilities pick up
                    // the right one automatically.
                    "[--sidebar:#f0f0e9] [--sidebar-foreground:#14140f] [--sidebar-border:#e2e2d9] [--sidebar-accent:rgba(111,140,0,.12)] [--sidebar-accent-foreground:#6f8c00] [--sidebar-ring:#6f8c00]",
                    "dark:[--sidebar:#0d0d0d] dark:[--sidebar-foreground:#ffffff] dark:[--sidebar-border:#1c1c1c] dark:[--sidebar-accent:rgba(204,255,0,.12)] dark:[--sidebar-accent-foreground:#ccff00] dark:[--sidebar-ring:#ccff00]",
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
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="px-[18px] gap-[26px]">
                        <SidebarGroup className="p-0">
                            <SidebarGroupLabel className="h-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.6px] uppercase text-[#14140f]/30 dark:text-white/30 px-2.5 pb-2">
                                Training
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-1">
                                    {navItems.map((item) => (
                                        <NavItem key={item.to} item={item} active={active} badge={upcomingCount} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="px-[18px] pb-[22px] gap-3">
                        <SelfCard self={self} />
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex items-center justify-center gap-2 rounded-full border border-[#d8d8cd] dark:border-[#2a2a2a] px-3 py-2.5 font-medium text-[12.5px] text-[#14140f]/70 dark:text-white/70 hover:border-[#c9c9be] dark:hover:border-[#3a3a3a] hover:text-[#14140f] dark:hover:text-white transition-colors"
                        >
                            <LogOut className="w-[15px] h-[15px]" />
                            Sign out
                        </button>
                    </SidebarFooter>
                </Sidebar>

                {/* Main column */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-3.5 px-4 sm:px-9 py-5 border-b border-[#e2e2d9] dark:border-[#1c1c1c]">
                        <SidebarTrigger className="md:hidden text-[#14140f]/60 dark:text-white/60 hover:text-[#14140f] dark:hover:text-white hover:bg-white/5" />
                        <span className="text-xs text-[#14140f]/40 dark:text-white/40">{format(new Date(), 'EEE d MMM yyyy')}</span>
                        <div className="ml-auto flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => navigate('/client-book')}
                                className="bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-[11px] font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors"
                            >
                                Book a session
                            </button>
                        </div>
                    </div>

                    <PageHeader kicker={kicker} title={title} blurb={blurb} theme="auto" className="px-4 sm:px-9 pt-8" />

                    <main className="flex-1 px-4 sm:px-9 py-6 pb-12">{children}</main>
                </div>
            </SidebarProvider>
        </ClientAuthGuard>
    )
}

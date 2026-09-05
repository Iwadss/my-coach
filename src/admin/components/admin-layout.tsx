// src/components/admin/admin-layout.tsx
//
// Sidebar is built on the shadcn Sidebar primitive (@/components/ui/sidebar)
// — Header/Footer stay pinned, SidebarContent scrolls independently —
// matching src/client/components/client-shell.tsx and coach-shell.tsx,
// rather than the previous hand-rolled div (which used `lg:static`, so on
// desktop it sat in normal document flow and scrolled away with the page
// instead of staying pinned). Fixed-dark theming (not tied to the app's
// light/dark toggle) via a single set of CSS custom properties on
// <SidebarProvider>, same as coach-shell.tsx.
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { LOGO_SRC } from '@/lib/brand'
import { GRACE_PERIOD_DAYS } from '@/lib/billing'
import { AdminContext, type AdminStats, type ExportHandler } from './admin-context'
import { downloadCsv, initials } from '@/components/shared/ui'
import {
    ClipboardList,
    UserCog,
    Users,
    CreditCard,
    Settings,
    History,
    LogOut,
    Search,
    Download,
    UserPlus,
    Check,
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

interface AdminSelf {
    name: string
    email: string
}

const navItems = [
    { to: '/admin/coach-applications', label: 'Applications', icon: ClipboardList, badge: 'pending' as const },
    { to: '/admin/coaches', label: 'All coaches', icon: UserCog, badge: 'coaches' as const },
    { to: '/admin/clients', label: 'All clients', icon: Users, badge: 'clients' as const },
    { to: '/admin/billing', label: 'Billing', icon: CreditCard, badge: 'billing-dot' as const },
]

// Each row closes the mobile sheet on click — needs useSidebar(), which only
// works below <SidebarProvider>, hence its own component rather than inline
// JSX in AdminLayout.
function NavItem({ item, badgeValue, billingDot }: { item: (typeof navItems)[number]; badgeValue: number | undefined; billingDot: boolean }) {
    const { setOpenMobile } = useSidebar()
    const location = useLocation()
    const isActive = location.pathname.startsWith(item.to)

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
            {item.badge === 'pending' && !!badgeValue && (
                <SidebarMenuBadge className="font-['JetBrains_Mono'] text-[10.5px] font-medium bg-[#ccff00] text-[#0a0a0a] rounded-full px-[7px] py-[2px]">{badgeValue}</SidebarMenuBadge>
            )}
            {(item.badge === 'coaches' || item.badge === 'clients') && (
                <SidebarMenuBadge className="font-['JetBrains_Mono'] text-[11px] text-white/35">{badgeValue ?? ''}</SidebarMenuBadge>
            )}
            {item.badge === 'billing-dot' && billingDot && (
                <SidebarMenuBadge className="p-0 h-auto min-w-0 bg-transparent">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#ff5c47] block" />
                </SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    )
}

function PlatformButton({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) {
    const { setOpenMobile } = useSidebar()
    return (
        <button
            type="button"
            onClick={() => { setOpenMobile(false); onClick() }}
            className="flex items-center gap-3 rounded-[13px] px-3 py-3 font-medium text-[13.5px] text-white/55 hover:bg-white/5 hover:text-white transition-colors text-left"
        >
            <Icon className="w-[17px] h-[17px] flex-none" strokeWidth={1.8} />
            {label}
        </button>
    )
}

export default function AdminLayout() {
    const navigate = useNavigate()
    const [self, setSelf] = useState<AdminSelf | null>(null)
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [query, setQuery] = useState('')
    const [flash, setFlash] = useState<string | null>(null)
    const exportHandlerRef = useRef<ExportHandler | null>(null)

    const loadStats = useCallback(async () => {
        const [{ count: pendingApplications }, { data: coachRows }, { count: totalClients }, { data: relRows }, { data: billingRows }] =
            await Promise.all([
                supabase.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('coaches').select('id, status'),
                supabase.from('clients').select('id', { count: 'exact', head: true }),
                supabase.from('coach_clients').select('client_id').eq('status', 'approved'),
                supabase.from('coach_billing').select('coach_id, subscription_status, subscription_expiry, access_override'),
            ])

        const totalCoaches = coachRows?.length ?? 0
        const activeCoaches = coachRows?.filter((c) => c.status === 'approved').length ?? 0
        const activeClients = new Set((relRows ?? []).map((r) => r.client_id)).size

        // "Suspended" = needs the admin's attention right now, whichever
        // reason — a policy ban (coaches.status), an explicit billing
        // override, or auto-suspended for being past the grace period.
        // Same union deriveCoachStatus() uses on AdminCoaches.tsx.
        const policySuspended = new Set((coachRows ?? []).filter((c) => c.status === 'suspended').map((c) => c.id))
        const now = Date.now()
        const paymentSuspended = new Set(
            (billingRows ?? [])
                .filter((b) => {
                    if (b.access_override === 'blocked') return true
                    if (b.access_override === 'granted') return false
                    return b.subscription_status === 'active' && !!b.subscription_expiry
                        && new Date(b.subscription_expiry).getTime() + GRACE_PERIOD_DAYS * 86400000 < now
                })
                .map((b) => b.coach_id)
        )
        const suspendedCoaches = new Set([...policySuspended, ...paymentSuspended]).size

        setStats({
            pendingApplications: pendingApplications ?? 0,
            activeCoaches,
            totalCoaches,
            activeClients,
            unlinkedClients: Math.max((totalClients ?? 0) - activeClients, 0),
            totalClients: totalClients ?? 0,
            suspendedCoaches,
        })
    }, [])

    useEffect(() => {
        loadStats()
        const loadSelf = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return
            const { data } = await supabase.from('profiles').select('full_name, email').eq('id', session.user.id).maybeSingle()
            if (data) setSelf({ name: data.full_name || data.email, email: data.email })
        }
        loadSelf()
    }, [loadStats])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const handleInvite = async () => {
        const link = `${window.location.origin}/coach-signup`
        try {
            await navigator.clipboard.writeText(link)
            toast.success('🔗 Sign-up link copied', { description: 'Share it with the coach you want to invite — their application lands in your review queue.', className: 'toast-success' })
        } catch {
            toast.error('❌ Could not copy link', { description: link, className: 'toast-error' })
        }
    }

    const handleExport = () => {
        const result = exportHandlerRef.current?.()
        if (!result || result.rows.length === 0) {
            toast.info('Nothing to export on this page yet', { className: 'toast-info' })
            return
        }
        downloadCsv(result.rows, result.filename)
    }

    const setExportHandler = useCallback((fn: ExportHandler | null) => {
        exportHandlerRef.current = fn
    }, [])

    const showFlash = useCallback((msg: string) => setFlash(msg), [])
    const dismissFlash = useCallback(() => setFlash(null), [])

    const billingDot = (stats?.suspendedCoaches ?? 0) > 0

    return (
        <AdminContext.Provider
            value={{ query, setQuery, stats, refreshStats: loadStats, flash, showFlash, dismissFlash, setExportHandler }}
        >
            <SidebarProvider
                defaultOpen
                className={[
                    "bg-[#0a0a0a] text-white font-['Inter',system-ui,sans-serif]",
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
                            <span className="ml-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.4px] uppercase text-[#ccff00] bg-[rgba(204,255,0,.12)] rounded-md px-[7px] py-[3px]">Admin</span>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="px-[18px] gap-[26px]">
                        <SidebarGroup className="p-0">
                            <SidebarGroupLabel className="h-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.6px] uppercase text-white/30 px-2.5 pb-2">
                                Manage
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-1">
                                    {navItems.map((item) => {
                                        const badgeValue =
                                            item.badge === 'pending' ? stats?.pendingApplications
                                                : item.badge === 'coaches' ? stats?.totalCoaches
                                                    : item.badge === 'clients' ? stats?.totalClients
                                                        : undefined
                                        return <NavItem key={item.to} item={item} badgeValue={badgeValue} billingDot={billingDot} />
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup className="p-0">
                            <SidebarGroupLabel className="h-auto font-['JetBrains_Mono'] text-[9.5px] font-medium tracking-[1.6px] uppercase text-white/30 px-2.5 pb-2">
                                Platform
                            </SidebarGroupLabel>
                            <SidebarGroupContent className="flex flex-col gap-1">
                                <PlatformButton icon={Settings} label="Settings" onClick={() => toast.info('Settings are coming soon', { className: 'toast-info' })} />
                                <PlatformButton icon={History} label="Audit log" onClick={() => toast.info('The audit log is coming soon', { className: 'toast-info' })} />
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="px-[18px] pb-[22px] gap-3">
                        <div className="flex items-center gap-[11px] bg-[#141414] border border-[#232323] rounded-2xl px-[13px] py-3">
                            <span className="w-[34px] h-[34px] rounded-[11px] bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center font-semibold text-xs flex-none">
                                {self ? initials(self.name) : '··'}
                            </span>
                            <span className="flex flex-col min-w-0">
                                <span className="font-medium text-[12.5px] truncate">{self?.name ?? 'Loading…'}</span>
                                <span className="text-[11px] text-white/42 truncate">{self?.email ?? ''}</span>
                            </span>
                        </div>
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
                    <div className="flex items-center gap-3.5 px-4 sm:px-9 py-4 sm:py-5 border-b border-[#1c1c1c]">
                        <SidebarTrigger className="md:hidden text-white/60 hover:text-white hover:bg-white/5" />
                        <div className="relative flex items-center w-full max-w-[340px]">
                            <Search className="w-[15px] h-[15px] absolute left-3.5 text-white/35" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name, email or coach ID"
                                className="w-full bg-[#141414] border border-[#232323] rounded-full py-[11px] pl-[38px] pr-4 text-[13px] text-white placeholder:text-white/38 focus-visible:outline-2 focus-visible:outline-[#ccff00] focus-visible:outline-offset-2"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleExport}
                            className="ml-auto hidden sm:inline-flex items-center gap-2 bg-transparent border border-[#2a2a2a] rounded-full px-[18px] py-[10px] text-white/75 font-medium text-[12.5px] hover:border-[#3a3a3a] hover:text-white transition-colors"
                        >
                            <Download className="w-[14px] h-[14px]" />
                            Export CSV
                        </button>
                        <button
                            type="button"
                            onClick={handleInvite}
                            className="sm:ml-0 ml-auto inline-flex items-center gap-2 bg-[#ccff00] text-[#0a0a0a] rounded-full px-5 py-[11px] font-semibold text-[12.5px] hover:bg-[#e2ff5c] transition-colors"
                        >
                            <UserPlus className="w-[14px] h-[14px]" />
                            Invite coach
                        </button>
                    </div>

                    {flash && (
                        <div className="flex items-center gap-[13px] px-4 sm:px-9 py-[13px] bg-[rgba(204,255,0,.09)] border-b border-[rgba(204,255,0,.2)]">
                            <span className="w-5 h-5 rounded-md bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center flex-none">
                                <Check className="w-3 h-3" strokeWidth={3} />
                            </span>
                            <span className="text-[12.5px] text-white/80">{flash}</span>
                            <button type="button" onClick={dismissFlash} className="ml-auto text-white/45 hover:text-white font-medium text-xs">
                                Dismiss
                            </button>
                        </div>
                    )}

                    <main className="flex-1 pb-12">
                        <Outlet />
                    </main>
                </div>
            </SidebarProvider>
        </AdminContext.Provider>
    )
}

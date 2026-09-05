import { NavLink } from 'react-router-dom'
import { useSidebar, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { ComponentType, ReactNode } from 'react'

interface PortalNavItemProps {
    to: string
    label: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
    isActive: boolean
    /** coach-shell is fixed-dark; client-shell follows the app's light/dark toggle. */
    theme: 'coach' | 'client'
    /** Caller renders its own <SidebarMenuBadge> (or nothing) — badge trigger
     * condition and visual style (filled pill vs plain number) differ per
     * portal and aren't part of what's actually shared here. */
    badge?: ReactNode
}

// A sidebar nav row that closes the mobile sheet on click — needs
// useSidebar(), which only works below <SidebarProvider>, hence its own
// component. Previously duplicated identically (bar the active/inactive
// color scheme) in coach-shell.tsx and client-shell.tsx.
export function PortalNavItem({ to, label, icon: Icon, isActive, theme, badge }: PortalNavItemProps) {
    const { setOpenMobile } = useSidebar()
    const activeCls = theme === 'coach'
        ? (isActive ? 'text-[#ccff00]' : 'text-white/62')
        : (isActive ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f]/62 dark:text-white/62')

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                className={`h-auto rounded-[13px] px-3 py-3 font-medium text-[13.5px] ${activeCls}`}
            >
                <NavLink to={to} onClick={() => setOpenMobile(false)}>
                    <Icon className="w-[17px] h-[17px]" strokeWidth={1.8} />
                    <span>{label}</span>
                </NavLink>
            </SidebarMenuButton>
            {badge}
        </SidebarMenuItem>
    )
}

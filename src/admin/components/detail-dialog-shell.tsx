import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface DetailDialogShellProps {
    open: boolean
    onClose: () => void
    loading: boolean
    avatarInitials: string
    title: string
    description: ReactNode
    statusPill: ReactNode
    children: ReactNode
}

// The Dialog shell + header (avatar, title, description, status pill) +
// loading-spinner-vs-content branch shared by every admin detail dialog.
// Previously byte-identical (down to the exact class names) in AdminClients
// and AdminCoaches, wrapped around genuinely different content — the actual
// detail fields stay bespoke per page (`children`), only this scaffolding
// is shared.
export function DetailDialogShell({ open, onClose, loading, avatarInitials, title, description, statusPill, children }: DetailDialogShellProps) {
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="!bg-[#111] !border-[#1f1f1f] !text-white sm:!max-w-lg max-h-[85vh] overflow-y-auto">
                {open && (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-3.5">
                                <span className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-semibold text-[14px] text-white/75 flex-none">
                                    {avatarInitials}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <DialogTitle className="!text-white font-['Anton'] text-xl uppercase tracking-wide truncate">{title}</DialogTitle>
                                    <DialogDescription className="!text-white/45 truncate">{description}</DialogDescription>
                                </div>
                                {statusPill}
                            </div>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-[12.5px]"><Spinner className="w-4 h-4" /> Loading details...</div>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {children}
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

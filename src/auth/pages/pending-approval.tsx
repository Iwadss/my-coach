import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import supabase from '@/supabase/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CoachPicker from '@/components/auth/coach-picker'
import { Clock, XCircle, Ban, LogOut } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type ViewState =
    | { kind: 'loading' }
    | { kind: 'coach-application'; status: 'pending' | 'rejected' | 'suspended'; reason: string | null }
    | { kind: 'client-request'; status: 'pending' | 'rejected'; coachName: string | null }
    | { kind: 'none' } // signup partially failed — let them pick a coach fresh

export default function PendingApproval() {
    const [state, setState] = useState<ViewState>({ kind: 'loading' })
    const [resubmitCoachId, setResubmitCoachId] = useState('')
    const [resubmitting, setResubmitting] = useState(false)

    const navigate = useNavigate()

    const loadStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            navigate('/login', { replace: true })
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role === 'admin') {
            navigate('/admin', { replace: true })
            return
        }
        if (profile?.role === 'coach') {
            navigate('/coach-dashboard', { replace: true })
            return
        }

        // Not yet approved as either — figure out which application this is.
        const { data: coachApp } = await supabase
            .from('coaches')
            .select('status, rejection_reason')
            .eq('id', user.id)
            .maybeSingle()

        if (coachApp) {
            setState({
                kind: 'coach-application',
                status: coachApp.status as 'pending' | 'rejected' | 'suspended',
                reason: coachApp.rejection_reason,
            })
            return
        }

        const { data: request } = await supabase
            .from('coach_clients')
            .select('status, coach:coaches!coach_clients_coach_id_fkey(profile:profiles!coaches_id_fkey(full_name))')
            .eq('client_id', user.id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (request && (request.status === 'pending' || request.status === 'rejected')) {
            setState({
                kind: 'client-request',
                status: request.status,
                coachName: (request.coach as unknown as { profile: { full_name: string | null } } | null)?.profile?.full_name ?? null,
            })
            return
        }
        if (request?.status === 'approved') {
            navigate('/client-dashboard', { replace: true })
            return
        }

        setState({ kind: 'none' })
    }

    useEffect(() => {
        loadStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleResubmit = async () => {
        if (!resubmitCoachId) return
        setResubmitting(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Upsert: a fresh coach gets a new row; re-picking the same coach
        // flips their existing (rejected) row back to pending.
        const { error } = await supabase
            .from('coach_clients')
            .upsert(
                { client_id: user.id, coach_id: resubmitCoachId, status: 'pending' },
                { onConflict: 'client_id,coach_id' }
            )

        setResubmitting(false)

        if (error) {
            toast.error('❌ Could not send request', { description: error.message, className: 'toast-error' })
            return
        }

        toast.success('✅ Request sent', { className: 'toast-success' })
        await loadStatus()
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div className="auth-shell py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="brand-wordmark text-4xl font-extrabold drop-shadow-lg mb-2">
                        MyCoach
                    </h1>
                </div>

                <Card className="glass-card">
                    {state.kind === 'loading' && (
                        <CardContent className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
                            <Spinner className="w-5 h-5" />
                            Checking your account status...
                        </CardContent>
                    )}

                    {state.kind === 'coach-application' && (
                        <>
                            <CardHeader className="text-center pb-4">
                                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg ${state.status === 'pending' ? 'bg-gradient-to-r from-warning to-warning/70' : 'bg-gradient-to-r from-destructive to-destructive/70'
                                    }`}>
                                    {state.status === 'pending' ? <Clock className="w-8 h-8 text-white" /> : state.status === 'suspended' ? <Ban className="w-8 h-8 text-white" /> : <XCircle className="w-8 h-8 text-white" />}
                                </div>
                                <CardTitle className="text-2xl font-bold">
                                    {state.status === 'pending' && 'Application Under Review'}
                                    {state.status === 'rejected' && 'Application Not Approved'}
                                    {state.status === 'suspended' && 'Coach Account Suspended'}
                                </CardTitle>
                                <CardDescription>
                                    {state.status === 'pending' && 'An administrator is reviewing your coach application. You\'ll be able to log in as a coach once approved.'}
                                    {state.status === 'rejected' && (state.reason || 'Your coach application was not approved. Please contact support for more information.')}
                                    {state.status === 'suspended' && 'Your coach account has been suspended. Please contact an administrator.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-center">
                                <Button variant="outline" onClick={handleSignOut} className="rounded-xl">
                                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                </Button>
                            </CardContent>
                        </>
                    )}

                    {(state.kind === 'client-request' || state.kind === 'none') && (
                        <>
                            <CardHeader className="text-center pb-4">
                                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg ${state.kind === 'client-request' && state.status === 'pending' ? 'bg-gradient-to-r from-warning to-warning/70' : 'bg-gradient-to-r from-destructive to-destructive/70'
                                    }`}>
                                    {state.kind === 'client-request' && state.status === 'pending' ? <Clock className="w-8 h-8 text-white" /> : <XCircle className="w-8 h-8 text-white" />}
                                </div>
                                <CardTitle className="text-2xl font-bold">
                                    {state.kind === 'client-request' && state.status === 'pending' && 'Waiting for Approval'}
                                    {state.kind === 'client-request' && state.status === 'rejected' && 'Request Not Approved'}
                                    {state.kind === 'none' && 'Choose a Coach'}
                                </CardTitle>
                                <CardDescription>
                                    {state.kind === 'client-request' && state.status === 'pending' && (
                                        <>Your request to work with <strong>{state.coachName ?? 'your chosen coach'}</strong> is waiting for their approval.</>
                                    )}
                                    {state.kind === 'client-request' && state.status === 'rejected' && (
                                        <>{state.coachName ? `${state.coachName} didn't approve your request. ` : ''}You can choose a different coach below.</>
                                    )}
                                    {state.kind === 'none' && 'We couldn\'t find a coach request on your account. Please pick one to continue.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                                {(state.kind === 'none' || (state.kind === 'client-request' && state.status === 'rejected')) && (
                                    <div className="space-y-3">
                                        <CoachPicker value={resubmitCoachId} onChange={setResubmitCoachId} disabled={resubmitting} />
                                        <Button
                                            onClick={handleResubmit}
                                            disabled={!resubmitCoachId || resubmitting}
                                            className="w-full h-11 rounded-xl disabled:opacity-50"
                                        >
                                            {resubmitting ? <Spinner className="w-4 h-4" /> : 'Send Request'}
                                        </Button>
                                    </div>
                                )}
                                <div className="text-center">
                                    <Button variant="outline" onClick={handleSignOut} className="rounded-xl">
                                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>

                <div className="text-center mt-8">
                    <Link
                        to="/"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

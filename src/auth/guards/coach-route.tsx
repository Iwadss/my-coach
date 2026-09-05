import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';

interface Props {
    children: ReactNode;
}

type Verdict = 'checking' | 'ok' | 'no-session' | 'not-coach';

// Payment gating used to happen here too (redirecting a billing-blocked
// coach to a standalone /billing-hold page). That's now CoachAuthGuard's
// job instead — mounted inside coach-shell.tsx, it blocks the coach's own
// page in place with a modal rather than navigating them away from it, so
// this only checks identity/role.
export default function CoachRoute({ children }: Props) {
    const [verdict, setVerdict] = useState<Verdict>('checking');

    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setVerdict('no-session');
                return;
            }

            // role is only ever 'coach' once an admin has approved the
            // application (see admin_set_coach_status) — no separate
            // status check needed here.
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

            setVerdict(profile?.role === 'coach' ? 'ok' : 'not-coach');
        };
        check();
    }, []);

    if (verdict === 'checking') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    if (verdict === 'no-session') return <Navigate to="/login" replace />;
    if (verdict === 'not-coach') return <Navigate to="/pending-approval" replace />;

    return <>{children}</>;
}

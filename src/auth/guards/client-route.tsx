import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';

interface Props {
    children: ReactNode;
}

type Verdict = 'checking' | 'ok' | 'no-session' | 'not-approved-client';

/**
 * Guards the client-only routes: requires a signed-in user with
 * role='client' AND an approved coach_clients relationship. Anyone else
 * (still pending, rejected, or a coach/admin who wandered here) is sent to
 * /pending-approval, which resolves the right next step for them.
 */
export default function ClientRoute({ children }: Props) {
    const [verdict, setVerdict] = useState<Verdict>('checking');

    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setVerdict('no-session');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile?.role !== 'client') {
                setVerdict('not-approved-client');
                return;
            }

            const { data: approved } = await supabase
                .from('coach_clients')
                .select('id')
                .eq('client_id', session.user.id)
                .eq('status', 'approved')
                .maybeSingle();

            setVerdict(approved ? 'ok' : 'not-approved-client');
        };
        check();
    }, []);

    if (verdict === 'checking') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    if (verdict === 'no-session') return <Navigate to="/login" replace />;
    if (verdict === 'not-approved-client') return <Navigate to="/pending-approval" replace />;

    return <>{children}</>;
}

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';

interface Props {
    children: ReactNode;
}

type Verdict = 'checking' | 'ok' | 'no-session' | 'not-admin';

export default function AdminRoute({ children }: Props) {
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

            setVerdict(profile?.role === 'admin' ? 'ok' : 'not-admin');
        };
        check();
    }, []);

    if (verdict === 'checking') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    if (verdict === 'no-session') return <Navigate to="/login" replace />;
    if (verdict === 'not-admin') return <Navigate to="/pending-approval" replace />;

    return <>{children}</>;
}

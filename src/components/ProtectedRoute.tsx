import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';

interface Props {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAuthenticated(!!session);
            setLoading(false);
        };
        checkSession();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!authenticated) return <Navigate to="/login" replace />;

    return <>{children}</>;
}
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';

interface Props {
    children: ReactNode;
}

export default function AdminRoute({ children }: Props) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user.email === adminEmail) {
                setIsAdmin(true);
            }
            setLoading(false);
        };
        checkSession();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAdmin) return <Navigate to="/client-dashboard" replace />;

    return <>{children}</>;
}
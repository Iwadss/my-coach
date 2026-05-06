import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/supabase/supabase';
import { AdminContent } from '@/components/admin/admin-content';


export default function AdminDashboard() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data?.session;
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

            if (!session || session.user.email !== adminEmail) {
                navigate('/login', { replace: true });
            }
        };

        checkSession();
    }, [navigate]);

    return (
        <main className="bg-violet-50 dark:bg-background">
            <AdminContent />
        </main>
    );
}
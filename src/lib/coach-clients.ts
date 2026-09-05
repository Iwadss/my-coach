import supabase from '@/supabase/supabase'

// Ends the current approved coach link and files a pending request with a
// new coach — the DB only allows one approved coach per client (see
// coach_clients_one_approved_idx), so the old link must go before the new
// request can be inserted. Shared by ClientSettings.tsx's "Change coach"
// dialog and ClientAuthGuard's expired/suspended-coach blocker.
export async function changeCoach(newCoachId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const { error: deleteError } = await supabase
        .from('coach_clients')
        .delete()
        .eq('client_id', user.id)
        .eq('status', 'approved')
    if (deleteError) throw deleteError

    const { error: insertError } = await supabase
        .from('coach_clients')
        .insert([{ client_id: user.id, coach_id: newCoachId, status: 'pending' }])
    if (insertError) throw insertError
}

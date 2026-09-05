import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

/**
 * A second client, with no session persistence, for the one case where we
 * need to call `auth.signUp()` without disturbing whoever is currently
 * logged in — e.g. a coach registering a walk-in client. `supabase-js` keeps
 * one session per client instance, so calling `signUp()` on the primary
 * `supabase` client would silently replace the coach's own session with the
 * new client's.
 */
export const supabaseIsolated = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    // A distinct storage key, not just persistSession: false — GoTrue's
    // cross-tab session sync (storage events / BroadcastChannel) is keyed
    // off this even for a non-persisting client, and sharing the primary
    // client's default key caused real session cross-talk between the two
    // instances in the same tab.
    storageKey: 'mycoach-isolated-auth',
  },
});

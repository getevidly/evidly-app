/**
 * Anon-only Supabase client — never attaches a user session.
 *
 * Use this for token-based public lookups (e.g. /join/:token, /gate/:token)
 * where the query must hit the `anon` RLS policy regardless of whether the
 * visitor has a logged-in session stored in localStorage.
 *
 * The shared singleton in supabase.ts has persistSession: true, so it
 * auto-attaches any stored session.  That causes anon-only RLS policies
 * to silently return zero rows for authenticated (but non-staff) visitors.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'evidly-anon',
  },
});
